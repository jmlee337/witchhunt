Meteor.methods({
  nightAck: function(gameId) {
    check(gameId, String);
    checkUserGame(gameId);
    checkGameState(gameId, Roles.findOne({userId: Meteor.userId(), gameId: gameId}).role);
    checkUserLive(gameId);

    goToNextRole(gameId);
  },

  covenVote: function(gameId, userId) {
    check(gameId, String);
    checkGameState(gameId, "coven");
    checkUserGame(gameId);
    checkUserLive(gameId);
    checkUserCoven(gameId);
    check(userId, String);

    var witches = Roles.find({gameId: gameId, alignment: "coven", lives: {$gt: 0}});
    var numCoven = witches.count();
    if (vote(gameId, userId, numCoven)) {
      if (userId != NO_KILL_ID) {
        nightKillPlayer(gameId, userId);
      }
      clearPlayerVotes(gameId);
      if (numCoven == 1 && witches.fetch()[0].secrets.lastStand) {
        var secrets = witches.fetch()[0].secrets;
        secrets.lastStand = false;
        Roles.update({gameId: gameId, alignment: "coven", lives: {$gt: 0}}, {$set: {secrets: secrets}});
      } else {
        goToNextRole(gameId);
      }
    }
  },

  demonVote: function(gameId, userId) {
    check(gameId, String);
    checkGameState(gameId, "demons");
    checkUserGame(gameId);
    checkUserDead(gameId);
    checkUserCoven(gameId);
    check(userId, String);

    var numDemons = Roles.find({gameId: gameId, alignment: "coven", lives: {$lt: 1}}).count();
    if (vote(gameId, userId, numDemons)) {
      demonsEndResolve(gameId, userId);
    }
  },

  angelVote: function(gameId, userId) {
    check(gameId, String);
    checkGameState(gameId, "angels");
    checkUserGame(gameId);
    checkUserDead(gameId);
    checkUserTown(gameId);
    check(userId, String);
    if (NightCurse.findOne({userId: userId, gameId: gameId})) {
      throw new Meteor.Error("argument", "cannot protect cursed player");
    }

    var numAngels = Roles.find({
        gameId: gameId, 
        $or: [{alignment: "town"}, {alignment: "holy"}], 
        lives: {$lt: 1}}).count();
    if (vote(gameId, userId, numAngels)) {
      angelsEndResolve(gameId, userId);
    }
  },

  priestVote: function(gameId, userId) {
    check(gameId, String);
    checkGameState(gameId, "priest");
    checkUserGame(gameId);
    checkUserLive(gameId);
    checkUserRole(gameId, "priest");
    check(userId, String);

    if (userId === NO_KILL_ID) {
      goToNextRole(gameId);
    } else {
      var player = checkTarget(gameId, userId);

      var secrets = self.secrets;
      if (!secrets.investigations) {
        secrets.investigations = [];
      }
      var target = Roles.findOne({userId: userId, gameId: gameId});
      secrets.investigations.push({
        id: userId,
        name: player.name,
        isWitch: target.alignment === "coven"
      });
      secrets.hasInvestigated = true;
      Roles.update({userId: Meteor.userId(), gameId: gameId}, {$set: {secrets: secrets}});
    }
  },

  hunterVote: function(gameId, userId) {
    check(gameId, String);
    checkGameState(gameId, "hunter");
    checkUserGame(gameId);
    checkUserLive(gameId);
    checkUserRole(gameId, "hunter");
    check(userId, String);
    var secrets = hunter.secrets;
    if (!secrets.tonightWeHunt) {
      throw new Meteor.Error("state", "no my son, your time has not yet come");
    }

    if (userId != NO_KILL_ID) {
      checkTarget(gameId, userId);

      nightKillPlayer(gameId, userId);
    }
    secrets.tonightWeHunt = false;
    secrets.used = true;
    Roles.update({userId: Meteor.userId(), gameId: gameId}, {$set: {secrets: secrets}});
    goToNextRole(gameId);
  }
});