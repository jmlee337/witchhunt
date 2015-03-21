goToDay = function(gameId) {
  Meteor.setTimeout(function() {
    if (Games.findOne(gameId).view != "day") {
      return;
    }
    var victim = Players.findOne({alive: true, gameId: gameId}, {sort: {votes: -1}});
    var livePlayers = numLivePlayers(gameId);
    if (victim.votes <= (livePlayers / 2) || victim.userId === NO_KILL_ID) {
      goToJudge(gameId);
    } else {
      dayKillPlayer(gameId, victim.userId, "lynch");
      Games.update(gameId, {$set: {view: "preNight"}});
    }
  }, DURATION_MS);
  Games.update(gameId, {$set: {view: "day", dayEndMs: Date.now() + DURATION_MS}, $inc: {turn: 1}});
}

// Good for day or night
// Returns true if the vote is deciding
vote = function(gameId, userId, numVoters) {
  if (!gameId) {
    throw new Meteor.Error("argument", "no game id specified");
  }
  if (!userId) {
    throw new Meteor.Error("argument", "no user id specified");
  }
  // This check must refernce Players and not Roles to keep secrets during night
  if (!Players.findOne({userId: userId, gameId: gameId, alive: true})) {
    throw new Meteor.Error("argument", "no live user with specified user id exists");
  }

  // Since no kills can happen before coven, NightTargets will only be populated if the user is voting on
  // the second last stand kill
  if (Games.findOne(gameId).view == "coven" && NightTargets.findOne({gameId: gameId, userId: userId})) {
    throw new Meteor.Error("argument", "last stand cannot be used to double kill")
  }

  var oldVote = Votes.findOne({userId:Meteor.userId(), gameId: gameId});
  if (oldVote) {
    Players.update({userId: oldVote.voteId, gameId: gameId}, {$inc: {votes: -1}});
  }
  Players.update({userId: userId, gameId: gameId}, {$inc: {votes: 1}});
  Votes.upsert({userId:Meteor.userId(), gameId: gameId}, {$set: {voteId: userId}});

  var victim = Players.findOne({userId: userId, gameId: gameId});
  return victim.votes > (numVoters / 2) && victim.votes >= (numVoters - 1);
};

// Triggered when a player is killed during the day
dayKillPlayer = function(gameId, userId, cod) {
  if (cod === "smite") {
    Roles.update({userId: userId, gameId: gameId}, {$set: {lives: 0}});
  } else if (cod === "bod") {
    Roles.update({userId: userId, gameId: gameId}, {$inc: {lives: 1}})
  } else {
    Roles.update({userId: userId, gameId: gameId}, {$inc: {lives: -1}});
  }
  var victimRole = Roles.findOne({userId: userId, gameId: gameId});
  if (victimRole.lives < 1) {
    Players.update({userId: userId, gameId: gameId}, {$set: {alive: false}});
  }
  var victim = Players.findOne({userId: userId, gameId: gameId});
  DayKills.insert({
    userId: userId,
    gameId: gameId,
    name: victim.name,
    died: !victim.alive,
    cod: cod
  });
};

// Check Day/NightKilled players and update hunter/apprentice appropriately
// @param players the mongo cursor from the appropriate collection
checkKilledPlayers = function(gameId, players) {
  var masterId;
  var masterRole;
  var apprentice = Roles.findOne({role: "apprentice", gameId: gameId, lives: {$gt: 0}});
  if (apprentice) {
    masterId = apprentice.secrets.master.id;
    masterRole = apprentice.secrets.master.role;
  }

  var hunterActive;
  var hunter = Roles.findOne({role: "hunter", gameId: gameId, lives: {$gt: 0}});
  if (hunter) {
    hunterActive = !hunter.secrets.used && !hunter.secrets.tonightWeHunt;
  }

  if (masterId || hunterActive) {
    players.forEach(function(player) {
      if (masterId && masterId === player.userId && player.died) {
        Roles.update({userId: apprentice.userId, gameId: gameId}, {$set: {role: masterRole, secrets: {}}});
      }
      if (hunterActive && !player.died) {
        Roles.update({userId: hunter.userId, gameId: gameId}, {$set: {secrets: {tonightWeHunt: true}}});
      }
    });
  }
};

clearPlayerVotes = function(gameId) {
  Players.update({gameId: gameId}, {$set: {votes: 0}}, {multi: true});
  Votes.remove({gameId: gameId});
};

maybeGoToRole = function(gameId, roleName) {
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
  var rolePlayer = Roles.findOne({gameId: gameId, role: roleName});
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

setRoleTimeout = function(gameId, roleName) {
  Meteor.setTimeout(function() {
    if (Games.findOne(gameId).view != roleName) {
      return;
    }
    goToNextNightRole(gameId);
  }, TIMEOUT_MS);
  Games.update(gameId, {$set: {dayEndMs: Date.now() + TIMEOUT_MS}});
};

setRandomTimeout = function(gameId) {
  var timeout_ms = TIMEOUT_MS / 2;
  Meteor.setTimeout(function() {
    goToNextNightRole(gameId);
  }, timeout_ms);
  Games.update(gameId, {$set: {dayEndMs: Date.now() + TIMEOUT_MS}});
};

goToNextNightRole = function(gameId) {
  goToNightRole(gameId, nextNightRole(Games.findOne(gameId).view));
};

// Goes to the game state for a role if the role is present and the player is alive.
// Otherwise falls through to the next available role
goToNightRole = function(gameId, roleName) {
  if (!maybeGoToRole(gameId, roleName)) {
    if (roleName === NIGHT_ROLES[NIGHT_ROLES.length - 1]) {
      var targets = NightTargets.find({gameId: gameId});
      targets.forEach(function(target) {
        if (target.died) {
          Players.update({userId: target.userId, gameId: gameId}, {$set: {alive: false}});
        }
        NightKills.insert({
          userId: target.userId,
          gameId: gameId,
          name: target.name,
          died: target.died
        });
      });

      // Check for oracle
      var killed = NightKills.find({gameId: gameId, died: true});
      var oracle = Roles.findOne({gameId: gameId, role: "oracle"}); // oracle still gets info when dead
      if (oracle && killed.count() > 0) {
        var secrets = oracle.secrets;
        if (!secrets.holies) {
          secrets.holies = [];
        }
        killed.forEach(function(player) {
          if (Roles.findOne({userId: player.userId, gameId: gameId, alignment: "holy"})) {
            secrets.holies.push({id: player.userId, name: player.name});
          }
        });
        Roles.update({userId: oracle.userId, gameId: gameId}, {$set: {secrets: secrets}});
      }

      Games.update(gameId, {$set: {view: "preDay"}});
    } else {
      goToNightRole(gameId, nextNightRole(roleName));
    }
  }
};

nextNightRole = function(roleName) {
  var index = NIGHT_ROLES.indexOf(roleName);
  if (index < 0) {
    throw new Meteor.Error("internal", "not a valid night role: " + roleName);
  }
  return NIGHT_ROLES[index + 1];
};