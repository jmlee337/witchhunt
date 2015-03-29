Jasmine.onTest(function() {
  describe("dayVote", function() {
    var GAME_ID = "game-id";
    var USER_ID = "user-id";
    var VOTE_ID = "vote-id";

    beforeEach(function() {
      spyOn(Meteor, "userId").and.returnValue(USER_ID);
      spyOn(Meteor, "setTimeout");
      Games.insert({_id: GAME_ID, view: "day"});
      Players.insert({gameId: GAME_ID, userId: USER_ID, alive: true});
      Players.insert({gameId: GAME_ID, userId: VOTE_ID, alive: true});
    });

    afterEach(function() {
      DayKills.remove({});
      Games.remove({});
      Players.remove({});
      Roles.remove({});
      Votes.remove({});
      Timeouts.remove({});
    });

    it("adds vote", function() {
      Meteor.call("dayVote", GAME_ID, VOTE_ID);

      expect(Players.findOne({gameId: GAME_ID, userId: VOTE_ID}).votes).toBe(1);
      expect(Votes.findOne({gameId: GAME_ID, userId: USER_ID}).voteId).toBe(VOTE_ID);
    });

    it("clears old vote", function() {
      var oldId = "old-id";
      Players.insert({gameId: GAME_ID, userId: oldId, votes: 1});
      Votes.insert({gameId: GAME_ID, userId: USER_ID, voteId: oldId});

      Meteor.call("dayVote", GAME_ID, VOTE_ID);

      expect(Players.findOne({gameId: GAME_ID, userId: oldId}).votes).toBe(0);
      expect(Votes.findOne({gameId: GAME_ID, userId: USER_ID}).voteId).not.toBe(oldId);
    });

    it("doesn't move game if vote is not deciding", function() {
      Meteor.call("dayVote", GAME_ID, VOTE_ID);

      expect(Games.findOne(GAME_ID).view).toBe("day");
    });

    it("can be called twice safely", function() {
      Meteor.call("dayVote", GAME_ID, VOTE_ID);

      expect(Players.findOne({gameId: GAME_ID, userId: VOTE_ID}).votes).toBe(1);
      expect(Votes.findOne({gameId: GAME_ID, userId: USER_ID}).voteId).toBe(VOTE_ID);
      expect(Games.findOne(GAME_ID).view).toBe("day");

      Meteor.call("dayVote", GAME_ID, VOTE_ID);

      expect(Players.findOne({gameId: GAME_ID, userId: VOTE_ID}).votes).toBe(1);
      expect(Votes.findOne({gameId: GAME_ID, userId: USER_ID}).voteId).toBe(VOTE_ID);
      expect(Games.findOne(GAME_ID).view).toBe("day");
    });

    it("clears timeout if vote is deciding", function() {
      Players.update({gameId: GAME_ID, userId: VOTE_ID}, {$set: {votes: 1}});
      Roles.insert({gameId: GAME_ID, userId: VOTE_ID, lives: 1});

      Meteor.call("dayVote", GAME_ID, VOTE_ID);

      expect(Timeouts.findOne({gameId: GAME_ID, view: "day"})).toBeTruthy();
    });

    it("moves game to judge if vote is deciding, and no kill", function() {
      Players.insert({gameId: GAME_ID, userId: NO_KILL_ID, votes: 1, alive: true});
      Roles.insert({gameId: GAME_ID, userId: USER_ID, role: "judge", lives: 1});

      Meteor.call("dayVote", GAME_ID, NO_KILL_ID);

      expect(Games.findOne(GAME_ID).view).toBe("judge");
    });

    it("moves game to preNight and kills player if vote is deciding", function() {
      var voteName = "voteName";
      Players.update({gameId: GAME_ID, userId: VOTE_ID}, {$set: {name: voteName, votes: 1}});
      Roles.insert({gameId: GAME_ID, userId: VOTE_ID, lives: 1});

      Meteor.call("dayVote", GAME_ID, VOTE_ID);

      expect(DayKills.findOne({
          gameId: GAME_ID, userId: VOTE_ID, name: voteName, died: true, cod: "lynch"
      })).toBeTruthy();
      expect(Games.findOne(GAME_ID).view).toBe("preNight");
    });
  });
});