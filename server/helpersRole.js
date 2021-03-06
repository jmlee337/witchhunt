/**
 * External (public)
 */
goToNextRole = function(gameId) {
  goToRole(gameId, nextRole(Games.findOne(gameId).view));
};

// Goes to the game state for a role if the role is present and the player is alive.
// Otherwise falls through to the next available role
goToRole = function(gameId, roleName) {
  if (!maybeGoToRole(gameId, roleName)) {
    goToRole(gameId, nextRole(roleName));
  }
};





/**
 * Internal (private)
 */
nextRole = function(roleName) {
  if (roleName === "preNight") {
    throw new Meteor.Error("internal", "nothing comes after preNight don't try it.");
  }
  var index = NIGHT_ROLES.indexOf(roleName);
  if (index < 0) {
    throw new Meteor.Error("internal", "not a valid night role: " + roleName);
  }
  return NIGHT_ROLES[index + 1];
};

maybeGoToRole = function(gameId, roleName) {
  if (roleName === "preNight") {
    Games.update(gameId, {$set: {view: "preNight"}});
    return true;
  }
  if (roleName === "preDay") {
    var targets = NightTargets.find({gameId: gameId});
    targets.forEach(function(target) {
      var shield = NightShields.findOne({userId: target.userId, gameId: gameId});
      if (shield && shield.shields > 0) {
        NightShields.update({userId: target.userId, gameId: gameId}, {$inc: {shields: -1}});
      } else {
        Roles.update({userId: target.userId, gameId: gameId}, {$inc: {lives: -1}});
      }
      var died = Roles.findOne({userId: target.userId, gameId: gameId}).lives <= 0;
      if (died) {
        Players.update({userId: target.userId, gameId: gameId}, {$set: {alive: false}});
      }
      NightKills.upsert(
          {userId: target.userId, gameId: gameId, name: target.name},
          {$set: {died: died}});
    });

    // Check for oracle
    var killed = NightKills.find({gameId: gameId, died: true});
    // oracle still gets info when dead
    var oracle = Roles.findOne({gameId: gameId, role: "oracle"});
    if (oracle && killed.count() > 0) {
      killed.forEach(function(player) {
        if (Roles.findOne({userId: player.userId, gameId: gameId, role: "priest"})) {
          Roles.update(
              {userId: oracle.userId, gameId: gameId},
              {$set: {secrets: {deadPriest: {id: player.userId, name: player.name}}}});
        }
      });
    }

    Games.update(gameId, {$set: {view: "preDay"}});
    return true;
  }
  if (roleName === "demons") {
    if (Roles.find({gameId: gameId, alignment: "coven", lives: {$lt: 1}}).count() > 0) {
      setRoleTimeout(gameId, roleName);
    } else {
      setRandomTimeout(gameId);
    }
    Games.update(gameId, {$set: {view: "demons"}});
    return true;
  }
  if (roleName === "angels") {
    if (Roles.find({
        gameId: gameId,
        $or: [{alignment: "town"}, {alignment: "holy"}],
        lives: {$lt: 1}}).count() > 0) {
      setRoleTimeout(gameId, roleName);
    } else {
      setRandomTimeout(gameId);
    }
    Games.update(gameId, {$set: {view: "angels"}});
    return true;
  }
  if (roleName === "coven") {
    if (Roles.find({gameId: gameId, alignment: "coven", lives: {$gt: 0}}).count() > 0) {
      setRoleTimeout(gameId, roleName);
    } else {
      setRandomTimeout(gameId);
    }
    Games.update(gameId, {$set: {view: "coven"}});
    return true;
  }
  if (roleName === "hunter") {
    var hunter = Roles.findOne({gameId: gameId, role: "hunter"});
    if (hunter && hunter.secrets.tonightWeHunt) {
      if (hunter.lives > 0) {
        setRoleTimeout(gameId, roleName);
      } else {
        setRandomTimeout(gameId);
      }
      Games.update(gameId, {$set: {view: "hunter"}});
      return true;
    }
    return false;
  }
  var rolePlayer = Roles.findOne({gameId: gameId, role: roleName}, {sort: [["lives", "desc"]]});
  if (rolePlayer) {
    if (rolePlayer.lives > 0) {
      setRoleTimeout(gameId, roleName);
    } else {
      setRandomTimeout(gameId);
    }
    Games.update(gameId, {$set: {view: roleName}});
    return true;
  }
  return false;
};

setRandomTimeout = function(gameId) {
  var timeout_ms =  Math.floor((Math.random() + Math.random()) / 2 * TIMEOUT_MS);
  Meteor.setTimeout(function() {
    goToNextRole(gameId);
  }, timeout_ms + GRACE_MS);
  Games.update(gameId, {$set: {dayEndMs: Date.now() + TIMEOUT_MS + GRACE_MS}});
};

setRoleTimeout = function(gameId, roleName) {
  Meteor.setTimeout(function() {
    var timestamp = Timeouts.findOne({gameId: gameId, view: roleName});
    if (timestamp) {
      Timeouts.remove({gameId: gameId, view: roleName});
      return;
    }
    var view = Games.findOne(gameId).view;
    if (view != roleName) {
      return;
    }
    if (view === "coven" || view === "demons" || view === "angels") {
      var victim = Players.findOne({votes: {$gt: 0}}, {sort: [["votes", "desc"]]});
      if (victim) {
        switch (view) {
          case "coven":
            // If you run out of time, no last stand for you sorry.
            if (victim.userId != NO_KILL_ID) {
              nightKillPlayer(gameId, victim.userId);
            }
            clearPlayerVotes(gameId);
            goToNextRole(gameId);
            return;
          case "demons":
            demonsEndResolve(gameId, victim.userId);
            return;
          case "angels":
            angelsEndResolve(gameId, victim.userId);
            return;
        }
      }
    }
    goToNextRole(gameId);
  }, TIMEOUT_MS + GRACE_MS);
  Games.update(gameId, {$set: {dayEndMs: Date.now() + TIMEOUT_MS + GRACE_MS}});
};