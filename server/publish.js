Meteor.publish("games", function(gameId) {
  return Games.find(gameId);
});
Meteor.publish("players", function(gameId) {
  return Players.find({gameId: gameId});
});
Meteor.publish("roles", function(gameId) {
  return Roles.find({userId: this.userId, gameId: gameId});
});
Meteor.publish("allies", function(gameId) {
  var player = Roles.findOne({userId: this.userId, gameId: gameId});
  if (player && player.alignment === "coven") {
    return Roles.find({alignment: "coven", gameId: gameId});
  }
});
Meteor.publish("dayKills", function(gameId) {
  return DayKills.find({gameId: gameId});
});
Meteor.publish("dayAcks", function(gameId) {
  return DayAcks.find({userId: this.userId, gameId: gameId});
});
Meteor.publish("nightCurse", function(gameId) {
  if (!Players.findOne({userId: this.userId, gameId: gameId}).alive) {
    return NightCurse.find({gameId: gameId});
  }
});
Meteor.publish("nightKills", function(gameId) {
  return NightKills.find({gameId: gameId});
});
Meteor.publish("wakeAcks", function(gameId) {
  return WakeAcks.find({userId: this.userId, gameId: gameId});
});