Meteor.methods({
  nightAck: function(gameId) {
    if (!gameId) {
      throw new Meteor.Error("argument", "no game id specified");
    }
    var role = Roles.findOne({userId: Meteor.userId(), gameId: gameId}).role;
    var gameView = Games.findOne(gameId).view;
    if (role != gameView) {
      throw new Meteor.Error("authorization", "user with role: " + role + " cannot ack for " + gameView);
    }

    goToNextRole(gameId);
  },

  covenVote: function(gameId, userId) {
    if (Games.findOne(gameId).view != "coven") {
      throw new Meteor.Error("state", "covenVote can only be called during coven");
    }
    if (!Roles.findOne({userId: Meteor.userId(), gameId: gameId, alignment: "coven", lives: {$gt: 0}})) {
      throw new Meteor.Error("authorization", "not authorized to covenVote");
    }
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
    if (Games.findOne(gameId).view != "demons") {
      throw new Meteor.Error("state", "demonVote can only be called during demons");
    }
    if (!Roles.findOne({userId: Meteor.userId(), gameId: gameId, alignment: "coven", lives: {$lt: 1}})) {
      throw new Meteor.Error("authorization", "not authorized to demonVote");
    }
    var numDemons = Roles.find({gameId: gameId, alignment: "coven", lives: {$lt: 1}}).count();
    if (vote(gameId, userId, numDemons)) {
      demonsEndResolve(gameId, userId);
    }
  },

  angelVote: function(gameId, userId) {
    if (Games.findOne(gameId).view != "angels") {
      throw new Meteor.Error("state", "angelVote can only be called during angels");
    }
    if (!Roles.findOne({
        userId: Meteor.userId(), 
        gameId: gameId, 
        $or: [{alignment: "town"}, {alignment: "holy"}], 
        lives: {$lt: 1}})) {
      throw new Meteor.Error("authorization", "not authorized to angelVote");
    }
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
    if (Games.findOne(gameId).view != "priest") {
      throw new Meteor.Error("state", "priestVote can only be called during priest");
    }
    var self = Roles.findOne({userId: Meteor.userId(), gameId: gameId, role: "priest", lives: {$gt: 0}});
    if (!self) {
      throw new Meteor.Error("authorization", "not authorized to priestVote");
    }

    if (userId != NO_KILL_ID) {
      var player = Players.findOne({userId: userId, gameId: gameId, alive: true});
      if (!player) {
        throw new Meteor.Error("argument", "not a valid investigation target");
      }
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
    } else {
      goToNextRole(gameId);
    }
  },

  hunterVote: function(gameId, userId) {
    if (Games.findOne(gameId).view != "hunter") {
      throw new Meteor.Error("state", "hunterVote can only be called during hunter");
    }
    var hunter = Roles.findOne({userId: Meteor.userId(), gameId: gameId, role: "hunter", lives: {$gt: 0}});
    if (!hunter) {
      throw new Meteor.Error("authorization", "not authorized to hunterVote");
    }
    var secrets = hunter.secrets;
    if (!secrets.tonightWeHunt) {
      throw new Meteor.Error("state", "no my son, your time has not yet come");
    }

    if (userId != NO_KILL_ID) {
      var player = Players.findOne({userId: userId, gameId: gameId, alive: true});
      if (!player) {
        throw new Meteor.Error("argument", "not a valid hunt target");
      }

      nightKillPlayer(gameId, userId);
    }
    secrets.tonightWeHunt = false;
    secrets.used = true;
    Roles.update({userId: Meteor.userId(), gameId: gameId}, {$set: {secrets: secrets}});
    goToNextRole(gameId);
  }
});