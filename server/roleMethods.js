Meteor.methods({
  judgeSmite: function(gameId, userId) {
    if (!gameId) {
      throw new Meteor.Error("argument", "no game id specified");
    }
    if (!userId) {
      throw new Meteor.Error("argument", "no user id specified");
    }
    if (!Roles.findOne({userId: Meteor.userId(), gameId: gameId, role: "judge", lives: {$gt: 0}})) {
      throw new Meteor.Error("authorization", "not authorized to smite");
    }

    if (userId != NO_KILL_ID) {
      dayKillPlayer(gameId, userId, "smite");
    }
    Games.update(gameId, {$set: {view: "preNight"}});
  },

  deathRattle: function(gameId, targetId) {
    if (!gameId) {
      throw new Meteor.Error("argument", "no game id specified");
    }
    var userId = Meteor.userId()
    var role = Roles.findOne({userId: userId, gameId: gameId});
    if (!role || !(role.role === "bod" || role.role === "dob")) {
      throw new Meteor.Error("authorization", "this player doesn't have a deathrattle");
    }
    if (role.secrets.used) {
      throw new Meteor.Error("authorization", "this player has already deathrattled");
    }
    if (!DayKills.findOne({userId: userId, gameId: gameId, died: true})
        && !NightKills.findOne({userId: userId, gameId: gameId, died: true})) {
      throw new Meteor.Error("authorization", "this player cannot deathrattle now");
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
      nightDeathRattle(gameId, targetId, role.role);
      WakeAcks.remove({gameId: gameId});
    }
  },

  nightAck: function(gameId) {
    if (!gameId) {
      throw new Meteor.Error("argument", "no game id specified");
    }
    var role = Roles.findOne({userId: Meteor.userId(), gameId: gameId}).role;
    var gameView = Games.findOne(gameId).view;
    if (role != gameView) {
      throw new Meteor.Error("authorization", "user with role: " + role + " cannot ack for " + gameView);
    }

    goToNextNightRole(gameId);
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
        goToNextNightRole(gameId);
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
      nightEndResolve(gameId, userId);
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
      goToNextNightRole(gameId);
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
    goToNextNightRole(gameId);
  }
});

nightKillPlayer = function(gameId, userId) {
  var shield = NightShields.findOne({userId: userId, gameId: gameId});
  if (shield && shield.shields > 0) {
    NightShields.update({userId: userId, gameId: gameId}, {$inc: {shields: -1}});
  } else {
    Roles.update({userId: userId, gameId: gameId}, {$inc: {lives: -1}});
  }

  NightTargets.upsert({
    userId: userId,
    gameId: gameId,
    name: Players.findOne({userId: userId, gameId: gameId}).name
  }, {$set: {died: Roles.findOne({userId: userId, gameId: gameId}).lives < 1}});
};

nightDeathRattle = function(gameId, userId, cod) {
  if (cod === "bod") {
    Roles.update({userId: userId, gameId: gameId}, {$inc: {lives: 1}});
  } else if (cod === "dob") {
    Roles.update({userId: userId, gameId: gameId}, {$inc: {lives: -1}});
  } else {
    throw new Meteor.Error("argument", "invalid cod");
  }
  var victimRole = Roles.findOne({userId: userId, gameId: gameId});
  if (victimRole.lives < 1) {
    Players.update({userId: userId, gameId: gameId}, {$set: {alive: false}});
  }
  var victim = Players.findOne({userId: userId, gameId: gameId});
  NightKills.insert({
    userId: userId,
    gameId: gameId,
    name: victim.name,
    died: !victim.alive,
    cod: cod
  });
};