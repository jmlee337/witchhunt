Meteor.methods({
  newGame: function(name) {
    check(name, String);
    var userId = Meteor.userId();
    if (!userId) {
      throw new Meteor.Error("state", "no player id available");
    }

    var gameId = xkcd_pw_gen();
    Games.insert({
      _id: gameId,
      userId: userId,
      view: "lobby"
    });

    insertNewPlayer(userId, gameId, name);

    return gameId;
  },

  joinGame: function(gameId, name) {
    check(gameId, String);
    checkGameExists(gameId);
    var userId = Meteor.userId();
    if (!userId) {
      throw new Meteor.Error("state", "no player id available");
    }

    if (!Players.findOne({gameId: gameId, userId: userId})) {
      // normal case, else reconnect
      check(name, String);
      checkGameState(gameId, "lobby");

      insertNewPlayer(userId, gameId, name);
    }
  },

  reconnect: function() {
    var userId = Meteor.userId();
    if (!userId) {
      throw new Meteor.Error("state", "no player id available");
    }
    var player = Players.findOne({userId: userId}, {sort: [["createdMs", "desc"]]});
    if (!player) {
      throw new Meteor.Error("state", "no record of this player");
    }
    return player.gameId;
  },

  startGame: function(gameId) {
    check(gameId, String);
    checkGameExists(gameId);
    checkGameState(gameId, "lobby");
    checkUserGame(gameId);
    if (Games.findOne(gameId).userId !== Meteor.userId()) {
      throw new Meteor.Error("authorization", "user is not the owner of the specified game");
    }
    var players = Players.find({gameId: gameId});
    var numPlayers = players.count();
    if (numPlayers < 7 || numPlayers > 12) {
      throw new Meteor.Error("state", "only 7-12 players are supported");
    }

    var pairs = genRolePairs(numPlayers);
    var i = 0;
    players.forEach(function(player) {
      insertRole(player.userId, gameId, pairs[i].alignment, pairs[i].role);
      i++;
    });

    // setup priest
    if (Roles.findOne({gameId: gameId, role: "priest"})) {
      Roles.update({gameId: gameId, role: "priest"}, {$set: {secrets: {investigations: []}}});
    }

    // setup acolyte
    if (Roles.findOne({gameId: gameId, role: "acolyte"})) {
      var priestRole = Roles.findOne({gameId: gameId, role: "priest"});
      var priest = Players.findOne({gameId: gameId, userId: priestRole.userId});
      Roles.update({gameId: gameId, role: "acolyte"}, {$set: {
          secrets: {
              priest: {
                  id: priest.userId,
                  name: priest.name}}}});
    }

    // setup peepingTom
    if (Roles.findOne({gameId: gameId, role: "peepingTom"})) {
      var innocentRole = Roles.findOne({gameId: gameId, alignment: "town"}, {sort: {_id: 1}});
      var innocent = Players.findOne({gameId: gameId, userId: innocentRole.userId});
      Roles.update({gameId: gameId, role: "peepingTom"}, {$set: {
          secrets: {
              innocent: {
                  id: innocent.userId,
                  name: innocent.name}}}});
    }

    insertNewPlayer(NO_KILL_ID, gameId, NO_KILL_STRING);

    Games.update(gameId, {$set: {view: "setup", turn: 0}});
  },

  setupAck: function(gameId) {
    check(gameId, String);
    checkGameExists(gameId);
    checkGameState(gameId, "setup");
    checkUserGame(gameId);
    if (WakeAcks.findOne({gameId: gameId, userId: Meteor.userId()})) {
      return;
    }

    setupAck(gameId);
  },

  apprenticeChoose: function(gameId, master) {
    check(gameId, String);
    checkGameExists(gameId);
    checkGameState(gameId, "setup");
    checkUserGame(gameId);
    var role = checkUserRole(gameId, "apprentice");
    if (role.secrets.master) {
      throw new Meteor.Error("state", "cannot call apprenticeChoose twice");
    }
    check(master, Match.Where(function(master) {
      check(master, String);
      return master === "gravedigger" || master === "judge";
    }));

    var masterRole = Roles.findOne({gameId: gameId, role: master});
    var masterPlayer = Players.findOne({userId: masterRole.userId, gameId: gameId});
    var masterObj = {id: masterPlayer.userId, name: masterPlayer.name, role: master};
    Roles.update({userId: Meteor.userId(), gameId: gameId}, {$set: {secrets: {master: masterObj}}});
    setupAck(gameId);
  },

  gamblerChoose: function(gameId, odd) {
    check(gameId, String);
    checkGameExists(gameId);
    checkGameState(gameId, "setup");
    checkUserGame(gameId);
    var role = checkUserRole(gameId, "gambler");
    if (role.secrets.odd != null) {
      throw new Meteor.Error("state", "cannot call gamblerChoose twice");
    }
    check(odd, Boolean);

    Roles.update({userId: Meteor.userId(), gameId: gameId}, {$set: {secrets: {odd: odd}}});
    setupAck(gameId);
  }
});

insertNewPlayer = function(id, gameId, name) {
  Players.insert({
    userId: id,
    gameId: gameId,
    name: name,
    alive: true,
    votes: 0,
    createdMs: Date.now()
  });
};

insertRole = function(id, gameId, alignment, role) {
  Roles.insert({
      userId: id,
      gameId: gameId,
      lives: role === "survivalist" ? 2 : 1,
      alignment: alignment,
      role: role,
      secrets: {}
  });
};

genRolePairs = function(n) {
  var arr = [{alignment: "holy", role: "priest"}, {alignment: "holy", role: "acolyte"}];
  var roleArr = ROLES.slice(0, n - 2);
  var numScum = n < 9 ? 2 : 3;
  for (var i = 0; i < numScum; i++) {
    var index = Math.floor(Math.random() * roleArr.length);
    var spliced = roleArr.splice(index, 1);
    arr.push({alignment: "coven", role: spliced[0]});
  }
  for (var j = 0; j < n - (numScum + 2); j++) {
    arr.push({alignment: "town", role: roleArr[j]});
  }
  return shuffle(arr);
};

setupAck = function(gameId) {
  if (wakeAck(gameId, true)) {
    WakeAcks.remove({gameId: gameId});

    Games.update(gameId, {$set: {view: "confirmWake"}});
  }
};