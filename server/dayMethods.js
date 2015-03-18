Meteor.methods({
  dayVote: function(gameId, userId) {
    if (Games.findOne(gameId).view != "day") {
      throw new Meteor.Error("state", "dayVote can only be called during day");
    }
    if (!Roles.findOne({userId: Meteor.userId(), gameId: gameId, lives: {$gt: 0}})) {
      throw new Meteor.Error("authorization", "not authorized to dayVote");
    }
    if (vote(gameId, userId, numLivePlayers(gameId))) {
      if (userId === NO_KILL_ID) {
        goToJudge(gameId);
      } else {
        dayKillPlayer(gameId, userId, "lynch");
        Games.update(gameId, {$set: {view: "preNight"}});
      }
    }
  },

  clearVote: function(gameId) {
    if (!gameId) {
      throw new Meteor.Error("argument", "no game id specified");
    }
    var unauthorized = false;
    switch (Games.findOne(gameId).view) {
      case "day":
        unauthorized = !Roles.findOne({userId: Meteor.userId(), gameId: gameId, lives: {$gt: 0}});
        break;
      case "coven":
        unauthorized = !Roles.findOne({
            userId: Meteor.userId(), 
            gameId: gameId, 
            alignment: "coven", 
            lives: {$gt: 0}});
        break;
      case "demons":
        unauthorized = !Roles.findOne({
            userId: Meteor.userId(), 
            gameId: gameId, 
            alignment: "coven", 
            lives: {$lt: 1}});
        break;
      case "angels":
        unauthorized = !Roles.findOne({
            userId: Meteor.userId(), 
            gameId: gameId, 
            $or: [{alignment: "town"}, {alignment: "holy"}], 
            lives: {$lt: 1}});
        break;
      default:
        throw new Meteor.Error("state", "clearVote cannot be called at this time");
    }
    if (unauthorized) {
      throw new Meteor.Error("authorization", "not authorized to clearVote");
    }

    var oldVote = Votes.findOne({userId:Meteor.userId(), gameId: gameId});
    if (oldVote) {
      Players.update({userId: oldVote.voteId, gameId: gameId}, {$inc: {votes: -1}});
    }
    Votes.remove({userId:Meteor.userId(), gameId: gameId});
  },

  preNightAck: function(gameId) {
    if (Games.findOne(gameId).view != "preNight") {
      throw new Meteor.Error("state", "preNightAck can only be called during preNight");
    }
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
    var game = Games.findOne(gameId);
    if (game.view != "confirmSleep") {
      throw new Meteor.Error("state", "confirmSleepAck can only be called during confirmSleep");
    }
    if (dayAck(gameId, true)) {
      // DAY TO NIGHT
      var dayKilled = DayKills.find({gameId: gameId});

      // Give gambler protection
      var gambler = Roles.findOne({role: "gambler", gameId: gameId, lives: {$gt: 0}});
      if (gambler && (game.turn % 2 == 1) == gambler.secrets.odd) {
        NightShields.insert({
          userId: gambler.userId,
          gameId: gameId,
          shields: 1
        });
      }

      // Check for hunter/apprentice
      checkKilledPlayers(gameId, dayKilled);
      
      // Give gravedigger killed player cards
      var gravedigger = Roles.findOne({role: "gravedigger", gameId: gameId, lives: {$gt: 0}});
      if (gravedigger) {
        var secrets = gravedigger.secrets;
        secrets.killedToday = 0;
        if (!secrets.graves) {
          secrets.graves = [];
        }
        if (dayKilled.count() > 0) {
          dayKilled.forEach(function(player) {
            if (player.died) {
              var role = Roles.findOne({userId: player.userId, gameId: gameId});
              secrets.graves.push({
                id: player.userId,
                name: player.name,
                alignment: role.alignment,
                role: role.role
              });
              secrets.killedToday++;
            }
          });
          Roles.update({userId: gravedigger.userId, gameId: gameId}, {$set: {secrets: secrets}});
        }
      }

      // Reset priest
      var priest = Roles.findOne({role: "priest", gameId: gameId, lives: {$gt: 0}});
      if (priest) {
        var secrets = priest.secrets;
        secrets.hasInvestigated = false;
        Roles.update({userId: priest.userId, gameId: gameId}, {$set: {secrets: secrets}});
      }

      clearPlayerVotes(gameId);
      DayKills.remove({gameId: gameId});
      DayAcks.remove({gameId: gameId});

      goToNightRole(gameId, "gravedigger");
    }
  },

  preDayAck: function(gameId) {
    if (Games.findOne(gameId).view != "preDay") {
      throw new Meteor.Error("state", "preDayAck can only be called during preDay");
    }
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
    if (Games.findOne(gameId).view != "confirmWake") {
      throw new Meteor.Error("state", "confirmWakeAck can only be called during confirmWake");
    }
    if (wakeAck(gameId, true)) {
      // Check for hunter/apprentice
      checkKilledPlayers(gameId, NightKills.find({gameId: gameId}));

      Players.update({gameId: gameId}, {$set: {votes: 0}}, {multi: true});
      Votes.remove({gameId: gameId});
      NightShields.remove({gameId: gameId});
      NightCurse.remove({gameId: gameId});
      NightTargets.remove({gameId: gameId});
      NightKills.remove({gameId: gameId});
      WakeAcks.remove({gameId: gameId});

      goToDay(gameId);
    }
  }
});






/**
 * Server helpers code
 */
numLivePlayers = function(gameId) {
  return Roles.find({gameId: gameId, lives: {$gt: 0}}).count();
};

// Triggered when the vote is for no lynch
goToJudge = function(gameId) {
  if (!maybeGoToRole(gameId, "judge")) {
    Games.update(gameId, {$set: {view: "preNight"}});
  }
};

// Writes a document to DayAcks, returns true if all expected acks are in.
dayAck = function(gameId, excludeKilled) {
  check(excludeKilled, Boolean);
  if (!gameId) {
    throw new Meteor.Error("argument", "no game id specified");
  }
  var userId = Meteor.userId();
  var player = Players.findOne({userId: userId, gameId: gameId});
  if (!player.alive) {
    if (excludeKilled || !DayKills.findOne({userId: player.userId})) {
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
  var numCoven = Roles.find({gameId: gameId, alignment: "coven"}).count();
  if (numCoven == 0) {
    Games.update(gameId, {$set: {winner: "town"}});
    return true;
  }
  var numTown = Roles.find({gameId: gameId, $or: [{alignment: "town"}, {alignment: "holy"}]}).count();
  if (numCoven > numTown) {
    Games.update(gameId, {$set: {winner: "coven"}});
    return true;
  }
  if (numCoven == numTown) {
    if (Roles.findOne({gameId: gameId, role: "judge", alignment: "town"})) {
      return false;
    }
    var hunter = Roles.findOne({gameId: gameId, role: "hunter", alignment: "town"});
    if (hunter && !hunter.secrets.used) {
      return false;
    }
    Games.update(gameId, {$set: {winner: "coven"}});
    return true;
  }
  return false;
};

wakeAck = function(gameId, excludeKilled) {
  check(excludeKilled, Boolean);
  if (!gameId) {
    throw new Meteor.Error("argument", "no game id specified");
  }
  var userId = Meteor.userId();
  var player = Players.findOne({userId: userId, gameId: gameId});
  if (!player.alive) {
    if (excludeKilled || !NightKills.findOne({userId: player.userId})) {
      throw new Meteor.Error("authorization", "this user is not allowed to ack");
    }
  }
  if (WakeAcks.findOne({userId: userId, gameId: gameId})) {
    throw new Meteor.Error("state", "this user already acked");
  }

  WakeAcks.insert({
    userId: userId, 
    gameId: gameId,
  });

  var livePlayers = numLivePlayers(gameId);
  var killedPlayers = excludeKilled ? 0 : NightKills.find({gameId: gameId, died: true}).count();
  var actualAcks = WakeAcks.find({gameId: gameId}).count();
  return actualAcks == livePlayers + killedPlayers;
};