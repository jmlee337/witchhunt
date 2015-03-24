/**
 * External (public)
 */
clearViewTimeout = function(gameId, view) {
  var timeoutId = Timeouts.findOne({gameId: gameId, view: view});
  if (timeoutId) {
    Meteor.clearTimeout(timeoutId);
  }
};

numLivePlayers = function(gameId) {
  return Roles.find({gameId: gameId, lives: {$gt: 0}}).count();
};

wakeAck = function(gameId, excludeKilled) {
  check(excludeKilled, Boolean);
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

demonsEndResolve = function(gameId, userId) {
  if (userId != NO_KILL_ID) {
    NightCurse.insert({
      userId: userId,
      gameId: gameId
    });
  }
  clearPlayerVotes(gameId);
  goToNextRole(gameId);
};

angelsEndResolve = function(gameId, userId) {
  if (userId != NO_KILL_ID) {
    NightShields.upsert({
      userId: userId,
      gameId: gameId
    }, {$inc: {shields: 1}});
  }
  clearPlayerVotes(gameId);
  goToNextRole(gameId);
};

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