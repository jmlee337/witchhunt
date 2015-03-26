Meteor.methods({
  clearVote: function(gameId) {
    check(gameId, String);
    checkGameExists(gameId);
    checkUserGame(gameId);
    var unauthorized = false;
    switch (Games.findOne(gameId).view) {
      case "day":
        unauthorized = !Roles.findOne({userId: Meteor.userId(), gameId: gameId, lives: {$gt: 0}});
        break;
      case "coven":
        unauthorized = !Roles.findOne({
            userId: Meteor.userId(), 
            gameId: gameId, 
            alignment: "coven", 
            lives: {$gt: 0}});
        break;
      case "demons":
        unauthorized = !Roles.findOne({
            userId: Meteor.userId(), 
            gameId: gameId, 
            alignment: "coven", 
            lives: {$lt: 1}});
        break;
      case "angels":
        unauthorized = !Roles.findOne({
            userId: Meteor.userId(), 
            gameId: gameId, 
            $or: [{alignment: "town"}, {alignment: "holy"}], 
            lives: {$lt: 1}});
        break;
      default:
        throw new Meteor.Error("state", "clearVote cannot be called at this time");
    }
    if (unauthorized) {
      throw new Meteor.Error("authorization", "not authorized to clearVote");
    }

    var userId = Meteor.userId();
    var oldVote = Votes.findOne({userId: userId, gameId: gameId});
    if (oldVote) {
      Players.update({userId: oldVote.voteId, gameId: gameId}, {$inc: {votes: -1}});
      Votes.remove({userId:userId, gameId: gameId});
    }
  }
});