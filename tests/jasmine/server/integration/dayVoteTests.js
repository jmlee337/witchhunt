Jasmine.onTest(function() {
  describe("dayVote", function() {
    var GAME_ID = "game-id";
    var USER_ID = "user-id";
    var VOTE_ID = "vote-id";

    beforeEach(function() {
      spyOn(Meteor, "userId").and.returnValue(USER_ID);
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

    it("clears timeout if vote is deciding", function() {
      var TIMEOUT_ID = 1000;
      spyOn(Meteor, "clearTimeout");
      Players.update({gameId: GAME_ID, userId: VOTE_ID}, {$set: {votes: 1}});
      Roles.insert({gameId: GAME_ID, userId: VOTE_ID, lives: 1});
      Timeouts.insert({gameId: GAME_ID, view: "day", id: TIMEOUT_ID});

      Meteor.call("dayVote", GAME_ID, VOTE_ID);

      expect(Meteor.clearTimeout.calls.count()).toBe(1);
      expect(Meteor.clearTimeout.calls.argsFor(0)).toEqual([TIMEOUT_ID]);
    });

    it("moves game to judge if vote is deciding, no kill, and judge is alive", function() {
      var TIMEOUT_ID = 1000;
      spyOn(Meteor, "setTimeout").and.returnValue(TIMEOUT_ID);
      Players.insert({gameId: GAME_ID, userId: NO_KILL_ID, votes: 1, alive: true});
      Roles.insert({gameId: GAME_ID, userId: USER_ID, role: "judge", lives: 1});

      Meteor.call("dayVote", GAME_ID, NO_KILL_ID);

      expect(Games.findOne(GAME_ID).view).toBe("judge");
      expect(Timeouts.findOne({gameId: GAME_ID, view: "judge"}).id).toBe(TIMEOUT_ID);
    });

    it("moves game to judge if vote is deciding, no kill, and judge is dead", function() {
      spyOn(Meteor, "setTimeout");
      var deadId = "dead-id";
      Players.insert({gameId: GAME_ID, userId: NO_KILL_ID, votes: 1, alive: true});
      Roles.insert({gameId: GAME_ID, userId: deadId, role: "judge", lives: 0});

      Meteor.call("dayVote", GAME_ID, NO_KILL_ID);

      expect(Games.findOne(GAME_ID).view).toBe("judge");
      expect(Timeouts.findOne({gameId: GAME_ID, view: "judge"})).toBeFalsy();
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
      expect(Players.findOne({gameId: GAME_ID, userId: VOTE_ID}).alive).toBe(false);
      expect(Roles.findOne({gameId: GAME_ID, userId: VOTE_ID}).lives).toBe(0);
    });
  });
});