/**
 * External (public)
 */
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