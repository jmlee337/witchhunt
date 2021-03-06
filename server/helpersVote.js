/**
 * External (public)
 */
// Returns true if the vote is deciding
vote = function(gameId, userId, numVoters) {
  check(numVoters, Number);
  checkTarget(gameId, userId);
  // Since no kills can happen before coven, NightTargets will only be populated if the user is voting on
  // the second last stand kill
  if (Games.findOne(gameId).view == "coven" && NightTargets.findOne({gameId: gameId, userId: userId})) {
    throw new Meteor.Error("argument", "last stand cannot be used to double kill");
  }

  var oldVote = Votes.findOne({userId:Meteor.userId(), gameId: gameId});
  if (oldVote) {
    Players.update({userId: oldVote.voteId, gameId: gameId}, {$inc: {votes: -1}});
  }
  Players.update({userId: userId, gameId: gameId}, {$inc: {votes: 1}});
  Votes.upsert({userId:Meteor.userId(), gameId: gameId}, {$set: {voteId: userId}});

  var victim = Players.findOne({userId: userId, gameId: gameId});
  return victim.votes > (numVoters / 2) && victim.votes >= (numVoters - 1);
};

clearPlayerVotes = function(gameId) {
  Players.update({gameId: gameId}, {$set: {votes: 0}}, {multi: true});
  Votes.remove({gameId: gameId});
};