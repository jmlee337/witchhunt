Meteor.methods({
  newGame: function(name) {
    if (!name) {
      throw new Meteor.Error("argument", "no player name specified");
    }
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
    if (!gameId) {
      throw new Meteor.Error("argument", "no game id specified");
    }
    var userId = Meteor.userId();
    if (!userId) {
      throw new Meteor.Error("state", "no player id available");
    }

    var game = Games.findOne(gameId);
    if (!game) {
      throw new Meteor.Error("argument", "no game with specified game id exists");
    }

    if (!Players.findOne({gameId: gameId, userId: userId})) {
      if (game.view != "lobby") {
        throw new Meteor.Error("state", "game with specified gameid has already started");
      }
      if (!name) {
        throw new Meteor.Error("argument", "no player name specified");
      }

      insertNewPlayer(userId, gameId, name);
    }
  },

  startGame: function(gameId) {
    if (!gameId) {
      throw new Meteor.Error("argument", "no game id specified");
    }
    var game = Games.findOne(gameId);
    if (!game) {
      throw new Meteor.Error("argument", "no game with specified game id exists");
    }
    if (game.userId !== Meteor.userId()) {
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

    // setup acolyte
    var priestRole = Roles.findOne({gameId: gameId, role: "priest"});
    var priest = Players.findOne({gameId: gameId, userId: priestRole.userId});
    Roles.update({gameId: gameId, role: "acolyte"}, {$set: {
        secrets: {
            priest: {
                id: priest.userId, 
                name: priest.name}}}});

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

    insertNewPlayer(NO_KILL_ID, gameId, "Vote to do nothing");

    Games.update(gameId, {$set: {view: "setup", turn: 0}});
  },

  setupAck: function(gameId) {
    if (Games.findOne(gameId).view != "setup") {
      throw new Meteor.Error("state", "setupAck can only be called during setup");
    }
    setupAck(gameId);
  },

  apprenticeChoose: function(gameId, master) {
    if (master != "gravedigger" && master != "judge") {
      throw new Meteor.Error("argument", "master must be gravedigger or judge");
    }
    if (Games.findOne(gameId).view != "setup") {
      throw new Meteor.Error("state", "apprenticeChoose can only be called during setup");
    }
    var user = Roles.findOne({userId: Meteor.userId(), gameId: gameId});
    if (user.role != "apprentice") {
      throw new Meteor.Error("authorization", "apprenticeChoose can only be called by the apprentice");
    }

    var masterRole = Roles.findOne({gameId: gameId, role: master});
    var masterPlayer = Players.findOne({userId: masterRole.userId, gameId: gameId});
    var masterObj = {id: masterPlayer.userId, name: masterPlayer.name, role: master};
    Roles.update({userId: Meteor.userId(), gameId: gameId}, {$set: {secrets: {master: masterObj}}});
    setupAck(gameId);
  },

  gamblerChoose: function(gameId, odd) {
    check(odd, Boolean);
    if (Games.findOne(gameId).view != "setup") {
      throw new Meteor.Error("state", "gamblerChoose can only be called during setup");
    }
    var user = Roles.findOne({userId: Meteor.userId(), gameId: gameId});
    if (user.role != "gambler") {
      throw new Meteor.Error("authorization", "gamblerChoose can only be called by the gambler");
    }

    Roles.update({userId: Meteor.userId(), gameId: gameId}, {$set: {secrets: {odd: odd}}});
    setupAck(gameId);
  }

  // TODO: offline failsafe
});

insertNewPlayer = function(id, gameId, name) {
  Players.insert({
    userId: id,
    gameId: gameId,
    name: name,
    alive: true,
    votes: 0
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
  for (var i = 0; i < n - (numScum + 2); i++) {
    arr.push({alignment: "town", role: roleArr[i]});
  }
  return shuffle(arr);
};

setupAck = function(gameId) {
  if (wakeAck(gameId, true)) {
    WakeAcks.remove({gameId: gameId});

    goToDay(gameId);
  }
};