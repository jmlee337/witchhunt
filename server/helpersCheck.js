checkGameState = function(gameId, stateName) {
  if (Games.findOne(gameId).view != stateName) {
    throw new Meteor.Error("state", "can only be called during " + stateName);
  }
};

checkUserGame = function(gameId) {
  if (!Players.findOne({userId: Meteor.userId(), gameId: gameId})) {
    throw new Meteor.Error("argument", "can only be called by member of game: " + gameId);
  }
};

checkUserLive = function(gameId) {
  if (!Players.findOne({userId: Meteor.userId(), gameId: gameId, alive: true})) {
    throw new Meteor.Error("argument", "can only be called by living player");
  }
};

checkUserDead = function(gameId) {
  if (!Players.findOne({userId: Meteor.userId(), gameId: gameId, alive: false})) {
    throw new Meteor.Error("argument", "can only be called by dead player");
  }
};

checkUserRole = function(gameId, roleName) {
  if (!Roles.findOne({userId: Meteor.userId(), gameId: gameId, role: roleName})) {
    throw new Meteor.Error("argument", "can only be called by role: ", roleName);
  }
};

checkUserCoven = function(gameId) {
  if (!Roles.findOne({userId: Meteor.userId(), gameId: gameId, alignment: "coven"})) {
    throw new Meteor.Error("argument", "can only be called by alignment: coven");
  }
};

checkUserTown = function(gameId) {
  if (!Roles.findOne({userId: Meteor.userId(), gameId: gameId, $or: [{alignment: "town"}, {alignment: "holy"}]})) {
    throw new Meteor.Error("argument", "can only be called by alignment: town/holy");
  }
};

checkTarget = function(gameId, userId) {
  // This check must reference Players and not Roles to keep secrets during night
  var player = Players.findOne({userId: userId, gameId: gameId, alive: true});
  if (!player) {
    throw new Meteor.Error("argument", "can only be called for a valid target");
  }
  return player;
};