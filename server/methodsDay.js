Meteor.methods({
  dayVote: function(gameId, userId) {
    check(gameId, String);
    checkGameExists(gameId);
    checkGameState(gameId, "day");
    checkUserGame(gameId);
    checkUserLive(gameId);
    check(userId, String);
    if (!Players.findOne({userId: Meteor.userId(), gameId: gameId, alive: true})) {
      throw new Meteor.Error("authorization", "not authorized to dayVote");
    }

    if (vote(gameId, userId, numLivePlayers(gameId))) {
      clearViewTimeout(gameId, "day");
      if (userId === NO_KILL_ID) {
        goToRole(gameId, "judge");
      } else {
        dayKillPlayer(gameId, userId, "lynch");
        Games.update(gameId, {$set: {view: "preNight"}});
      }
    }
  },

  preNightAck: function(gameId) {
    check(gameId, String);
    checkGameExists(gameId);
    checkGameState(gameId, "preNight");
    checkUserGame(gameId);

    if (dayAck(gameId, false)) {
      DayAcks.remove({gameId: gameId});
      if (hasGameEnded(gameId)) {
        Games.update(gameId, {$set: {view: "end"}});
      } else {
        Games.update(gameId, {$set: {view: "confirmSleep"}});
      }
    }
  },

  confirmSleepAck: function(gameId) {
    check(gameId, String);
    checkGameExists(gameId);
    checkGameState(gameId, "confirmSleep");
    checkUserGame(gameId);
    var game = Games.findOne(gameId);

    if (dayAck(gameId, true)) {
      // This was the last Ack. Day is over, go to night
      var dayKilled = DayKills.find({gameId: gameId});

      // Check for hunter/apprentice
      checkKilledPlayers(gameId, dayKilled);
      
      // Give gravedigger killed player cards
      var gravedigger = Roles.findOne({role: "gravedigger", gameId: gameId, lives: {$gt: 0}});
      if (gravedigger) {
        var graveSecrets = gravedigger.secrets;
        graveSecrets.killedToday = 0;
        if (!graveSecrets.graves) {
          graveSecrets.graves = [];
        }
        if (dayKilled.count() > 0) {
          dayKilled.forEach(function(player) {
            if (player.died) {
              var role = Roles.findOne({userId: player.userId, gameId: gameId});
              graveSecrets.graves.push({
                id: player.userId,
                name: player.name,
                alignment: role.alignment,
                role: role.secrets.master ? "apprentice" : role.role
              });
              graveSecrets.killedToday++;
            }
          });
        }
        Roles.update({userId: gravedigger.userId, gameId: gameId}, {$set: {secrets: graveSecrets}});
      }

      // Give gambler protection
      var gambler = Roles.findOne({role: "gambler", gameId: gameId, lives: {$gt: 0}});
      if (gambler && (game.turn % 2 == 1) == gambler.secrets.odd) {
        NightShields.insert({
          userId: gambler.userId,
          gameId: gameId,
          shields: 1
        });
      }

      // Reset priest
      var priest = Roles.findOne({role: "priest", gameId: gameId, lives: {$gt: 0}});
      if (priest) {
        var priestSecrets = priest.secrets;
        priestSecrets.hasInvestigated = false;
        Roles.update({userId: priest.userId, gameId: gameId}, {$set: {secrets: priestSecrets}});
      }

      // Set up last stand
      var witches = Roles.find({alignment: "coven", gameId: gameId, lives: {$gt: 0}});
      if (witches.count() == 1) {
        var witchSecrets = witches.fetch()[0].secrets;
        witchSecrets.lastStand = true;
        Roles.update({alignment: "coven", gameId: gameId, lives: {$gt: 0}}, {$set: {secrets: witchSecrets}});
      }

      clearPlayerVotes(gameId);
      DayKills.remove({gameId: gameId});
      DayAcks.remove({gameId: gameId});

      goToRole(gameId, "gravedigger");
    }
  },

  preDayAck: function(gameId) {
    check(gameId, String);
    checkGameExists(gameId);
    checkGameState(gameId, "preDay");
    checkUserGame(gameId);

    if (wakeAck(gameId, false)) {
      WakeAcks.remove({gameId: gameId});
      if (hasGameEnded(gameId)) {
        Games.update(gameId, {$set: {view: "end"}});
      } else {
        Games.update(gameId, {$set: {view: "confirmWake"}});
      }
    }
  },

  confirmWakeAck: function(gameId) {
    check(gameId, String);
    checkGameExists(gameId);
    checkGameState(gameId, "confirmWake");
    checkUserGame(gameId);

    if (wakeAck(gameId, true)) {
      checkKilledPlayers(gameId, NightKills.find({gameId: gameId}));

      clearPlayerVotes(gameId);
      NightShields.remove({gameId: gameId});
      NightCurse.remove({gameId: gameId});
      NightTargets.remove({gameId: gameId});
      NightKills.remove({gameId: gameId});
      WakeAcks.remove({gameId: gameId});

      var timeoutId = Meteor.setTimeout(function() {
        if (Games.findOne(gameId).view != "day") {
          return;
        }
        var victim = Players.findOne({alive: true, gameId: gameId}, {sort: {votes: -1}});
        var livePlayers = numLivePlayers(gameId);
        if (victim.votes <= (livePlayers / 2) || victim.userId === NO_KILL_ID) {
          goToRole(gameId, "judge");
        } else {
          dayKillPlayer(gameId, victim.userId, "lynch");
          Games.update(gameId, {$set: {view: "preNight"}});
        }
      }, DURATION_MS);
      Timeouts.upsert({gameId: gameId, view: "day"}, {$set: {id: timeoutId}});
      Games.update(gameId, {$set: {view: "day", dayEndMs: Date.now() + DURATION_MS}, $inc: {turn: 1}});
    }
  },

  judgeSmite: function(gameId, userId) {
    check(gameId, String);
    checkGameExists(gameId);
    checkGameState(gameId, "judge");
    checkUserGame(gameId);
    checkUserLive(gameId);
    checkUserRole(gameId, "judge");

    clearViewTimeout(gameId, "judge");
    if (userId != NO_KILL_ID) {
      dayKillPlayer(gameId, userId, "smite");
    }
    Games.update(gameId, {$set: {view: "preNight"}});
  },

  deathRattle: function(gameId, targetId) {
    check(gameId, String);
    checkGameExists(gameId);
    checkUserGame(gameId);
    var userId = Meteor.userId();
    var role = Roles.findOne({userId: userId, gameId: gameId});
    if (!role || !(role.role === "bod" || role.role === "dob")) {
      throw new Meteor.Error("authorization", "this player doesn't have a deathrattle");
    }
    if (role.secrets.used) {
      throw new Meteor.Error("state", "this player has already deathrattled");
    }
    if (!DayKills.findOne({userId: userId, gameId: gameId, died: true}) &&
        !NightKills.findOne({userId: userId, gameId: gameId, died: true})) {
      throw new Meteor.Error("state", "this player cannot deathrattle now");
    }
    var state = Games.findOne(gameId).view;
    if (!(state === "preNight" || state === "preDay")) {
      throw new Meteor.Error("state", "deathrattle is not permitted at this time");
    }
    if (targetId === NO_KILL_ID) {
      throw new Meteor.Error("argument", "deathrattle cannot target no one");
    }
    if (!Players.findOne({userId: targetId, gameId: gameId, alive: true})) {
      throw new Meteor.Error("argument", "player with specified id is not a valid target");
    }

    Roles.update({userId: userId, gameId: gameId}, {$set: {secrets: {used: true}}});
    if (state === "preNight") {
      dayKillPlayer(gameId, targetId, role.role);
      DayAcks.remove({gameId: gameId});
    } else {
      // "preDay", was killed during the night
      var cod = role.role;
      if (cod === "bod") {
        Roles.update({userId: targetId, gameId: gameId}, {$inc: {lives: 1}});
      } else if (cod === "dob") {
        Roles.update({userId: targetId, gameId: gameId}, {$inc: {lives: -1}});
      } else {
        throw new Meteor.Error("argument", "invalid cod");
      }
      var victimRole = Roles.findOne({userId: targetId, gameId: gameId});
      if (victimRole.lives < 1) {
        Players.update({userId: targetId, gameId: gameId}, {$set: {alive: false}});
      }
      var victim = Players.findOne({userId: targetId, gameId: gameId});
      NightKills.insert({
        userId: targetId,
        gameId: gameId,
        name: victim.name,
        died: !victim.alive,
        cod: cod
      });
      WakeAcks.remove({gameId: gameId});
    }
  }
});





/**
 * Server helpers code
 */
// Writes a document to DayAcks, returns true if all expected acks are in.
dayAck = function(gameId, excludeKilled) {
  check(excludeKilled, Boolean);
  var userId = Meteor.userId();
  var player = Players.findOne({userId: userId, gameId: gameId});
  if (!player.alive) {
    if (excludeKilled || !DayKills.findOne({userId: player.userId, gameId: gameId, died: true})) {
      throw new Meteor.Error("authorization", "this user is not allowed to ack");
    }
  }
  if (DayAcks.findOne({userId: userId, gameId: gameId})) {
    throw new Meteor.Error("state", "this user already acked");
  }

  DayAcks.insert({
    userId: userId,
    gameId: gameId,
  });

  var livePlayers = numLivePlayers(gameId);
  var killedPlayers = excludeKilled ? 0 : DayKills.find({gameId: gameId, died: true}).count();
  var actualAcks = DayAcks.find({gameId: gameId}).count();
  return actualAcks == livePlayers + killedPlayers;
};

hasGameEnded = function(gameId) {
  var numCoven = Roles.find({gameId: gameId, alignment: "coven", lives: {$gt: 0}}).count();
  if (numCoven === 0) {
    Games.update(gameId, {$set: {winner: "town"}});
    return true;
  }
  var numTown = Roles.find(
      {gameId: gameId, $or: [{alignment: "town"}, {alignment: "holy"}], lives: {$gt: 0}}).count();
  if (numCoven > numTown) {
    Games.update(gameId, {$set: {winner: "coven"}});
    return true;
  }
  if (numCoven == numTown) {
    if (Roles.findOne({gameId: gameId, role: "judge", alignment: "town", lives: {$gt: 0}})) {
      return false;
    }
    var hunter = Roles.findOne({gameId: gameId, role: "hunter", alignment: "town", lives: {$gt: 0}});
    if (hunter && !hunter.secrets.used) {
      return false;
    }
    Games.update(gameId, {$set: {winner: "coven"}});
    return true;
  }
  return false;
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
        Roles.update({userId: apprentice.userId, gameId: gameId}, {$set: {role: masterRole}});
      }
      if (hunterActive && !player.died) {
        Roles.update({userId: hunter.userId, gameId: gameId}, {$set: {secrets: {tonightWeHunt: true}}});
      }
    });
  }
};

// Triggered when a player is killed during the day
dayKillPlayer = function(gameId, userId, cod) {
  if (cod === "smite") {
    Roles.update({userId: userId, gameId: gameId}, {$set: {lives: 0}});
  } else if (cod === "bod") {
    Roles.update({userId: userId, gameId: gameId}, {$inc: {lives: 1}});
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