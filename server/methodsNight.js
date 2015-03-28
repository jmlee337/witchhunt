Meteor.methods({
  nightAck: function(gameId) {
    check(gameId, String);
    checkGameExists(gameId);
    checkUserGame(gameId);
    checkUserLive(gameId);
    var view = Games.findOne(gameId).view;
    if (!(view === "gravedigger" || view === "priest")) {
      throw new Meteor.Error("state", "nightAck cannot be called at this time");
    }
    checkUserRole(gameId, view);

    clearViewTimeout(gameId, Games.findOne(gameId).view);
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
      clearPlayerVotes(gameId);
      if (userId != NO_KILL_ID) {
        nightKillPlayer(gameId, userId);
      }
      if (numCoven == 1 && witches.fetch()[0].secrets.lastStand) {
        var secrets = witches.fetch()[0].secrets;
        secrets.lastStand = false;
        Roles.update({gameId: gameId, alignment: "coven", lives: {$gt: 0}}, {$set: {secrets: secrets}});
      } else {
        clearViewTimeout(gameId, "coven");
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
      clearViewTimeout(gameId, "demons");
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
      clearViewTimeout(gameId, "angels");
      angelsEndResolve(gameId, userId);
    }
  },

  priestVote: function(gameId, userId) {
    check(gameId, String);
    checkGameState(gameId, "priest");
    checkUserGame(gameId);
    checkUserLive(gameId);
    var role = checkUserRole(gameId, "priest");
    check(userId, String);

    if (role.secrets.hasInvestigated) {
      return;
    }

    if (userId === NO_KILL_ID) {
      goToNextRole(gameId);
    } else {
      var player = checkTarget(gameId, userId);

      var playerRole = Roles.findOne({userId: userId, gameId: gameId});
      var secrets = Roles.findOne({userId: Meteor.userId(), gameId: gameId}).secrets;
      secrets.investigations.push({
        id: userId,
        name: player.name,
        isWitch: playerRole.alignment === "coven"
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
    var hunterRole = checkUserRole(gameId, "hunter");
    check(userId, String);
    var secrets = hunterRole.secrets;
    if (!secrets.tonightWeHunt) {
      throw new Meteor.Error("state", "no my son, your time has not yet come");
    }
    if (secrets.used) {
      throw new Meteor.Error("state", "already used your hunt: how did you even get here");
    }

    clearViewTimeout(gameId, "hunter");
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