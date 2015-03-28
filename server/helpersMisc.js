/**
 * External (public)
 */
clearViewTimeout = function(gameId, view) {
  var timeout = Timeouts.findOne({gameId: gameId, view: view});
  if (timeout) {
    Meteor.clearTimeout(timeout.id);
  }
};

numLivePlayers = function(gameId) {
  return Players.find({gameId: gameId, alive: true, userId: {$ne: NO_KILL_ID}}).count();
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
  NightTargets.insert({
      userId: userId, gameId: gameId, name: Players.findOne({userId: userId, gameId: gameId}).name
  });
};