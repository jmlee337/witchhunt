Jasmine.onTest(function() {
  describe("covenVote", function() {
    var GAME_ID = "game-id";
    var USER_ID = "user-id";
    var VOTE_ID = "vote-id";
    var TIMEOUT_ID = 1000;

    beforeEach(function() {
      spyOn(Meteor, "userId").and.returnValue(USER_ID);
      spyOn(Meteor, "setTimeout").and.returnValue(TIMEOUT_ID);
      Games.insert({_id: GAME_ID, view: "coven"});
      Players.insert({gameId: GAME_ID, userId: USER_ID, alive: true});
      Players.insert({gameId: GAME_ID, userId: VOTE_ID, alive: true});
      Roles.insert({gameId: GAME_ID, userId: USER_ID, alignment: "coven", lives: 1, secrets: {}});
      Roles.insert({gameId: GAME_ID, userId: VOTE_ID, alignment: "coven", lives: 1, secrets: {}});
    });

    afterEach(function() {
      Games.remove({});
      NightTargets.remove({});
      Players.remove({});
      Roles.remove({});
      Votes.remove({});
      Timeouts.remove({});
    });

    it("adds a vote", function() {
      Meteor.call("covenVote", GAME_ID, VOTE_ID);

      expect(Players.findOne({gameId: GAME_ID, userId: VOTE_ID}).votes).toBe(1);
      expect(Votes.findOne({gameId: GAME_ID, userId: USER_ID}).voteId).toBe(VOTE_ID);
    });

    it("clears old vote", function() {
      var oldId = "old-id";
      Players.insert({gameId: GAME_ID, userId: oldId, votes: 1});
      Votes.insert({gameId: GAME_ID, userId: USER_ID, voteId: oldId});

      Meteor.call("covenVote", GAME_ID, VOTE_ID);

      expect(Players.findOne({gameId: GAME_ID, userId: oldId}).votes).toBe(0);
      expect(Votes.findOne({gameId: GAME_ID, userId: USER_ID}).voteId).not.toBe(oldId);
    });

    it("doesn't move game if vote is not deciding", function() {
      Meteor.call("covenVote", GAME_ID, VOTE_ID);

      expect(Games.findOne(GAME_ID).view).toBe("coven");
    });

    it("can be called twice safely", function() {
      Meteor.call("covenVote", GAME_ID, VOTE_ID);

      expect(Players.findOne({gameId: GAME_ID, userId: VOTE_ID}).votes).toBe(1);
      expect(Votes.findOne({gameId: GAME_ID, userId: USER_ID}).voteId).toBe(VOTE_ID);
      expect(Games.findOne(GAME_ID).view).toBe("coven");

      Meteor.call("covenVote", GAME_ID, VOTE_ID);

      expect(Players.findOne({gameId: GAME_ID, userId: VOTE_ID}).votes).toBe(1);
      expect(Votes.findOne({gameId: GAME_ID, userId: USER_ID}).voteId).toBe(VOTE_ID);
      expect(Games.findOne(GAME_ID).view).toBe("coven");
    });

    it("clears votes if vote is deciding", function() {
      Players.insert({gameId: GAME_ID, userId: NO_KILL_ID, alive: true, votes: 1});
      Votes.insert({gameId: GAME_ID, userId: VOTE_ID, voteId: NO_KILL_ID});

      Meteor.call("covenVote", GAME_ID, NO_KILL_ID);

      expect(Players.findOne({gameId: GAME_ID, userId: NO_KILL_ID}).votes).toBe(0);
      expect(Votes.find({gameId: GAME_ID}).count()).toBe(0);
    });

    it("doesn't kill for NO_KILL if vote is deciding", function() {
      Players.insert({gameId: GAME_ID, userId: NO_KILL_ID, alive: true, votes: 1});

      Meteor.call("covenVote", GAME_ID, NO_KILL_ID);

      expect(NightTargets.find({gameId: GAME_ID}).count()).toBe(0);
    });

    it("kills player", function() {
      var voteName = "voteName"
      Players.update({gameId: GAME_ID, userId: VOTE_ID}, {$set: {name: voteName, votes: 1}});

      Meteor.call("covenVote", GAME_ID, VOTE_ID);

      expect(NightTargets.find({gameId: GAME_ID, userId: VOTE_ID, name: voteName})).toBeTruthy();
    });

    it("clears timeout and moves if not last stand", function() {
      spyOn(Meteor, "clearTimeout");
      Timeouts.insert({gameId: GAME_ID, view: "coven", id: TIMEOUT_ID});
      Players.update({gameId: GAME_ID, userId: VOTE_ID}, {$set: {votes: 1}});

      Meteor.call("covenVote", GAME_ID, VOTE_ID);

      expect(Meteor.clearTimeout.calls.count()).toBe(1);
      expect(Meteor.clearTimeout.calls.argsFor(0)).toEqual([TIMEOUT_ID]);
      expect(Games.findOne(GAME_ID).view).not.toBe("coven");
    });

    it("goes to last stand if applicable", function() {
      spyOn(Meteor, "clearTimeout");
      Timeouts.insert({gameId: GAME_ID, view: "coven", id: TIMEOUT_ID});
      Roles.update({gameId: GAME_ID, userId: VOTE_ID}, {$set: {alignment: "town"}});
      Roles.update({gameId: GAME_ID, userId: USER_ID}, {$set: {secrets: {lastStand: true}}});

      Meteor.call("covenVote", GAME_ID, VOTE_ID);

      expect(Meteor.clearTimeout.calls.any()).toBe(false);
      expect(Games.findOne(GAME_ID).view).toBe("coven");
      expect(Roles.findOne({gameId: GAME_ID, userId: USER_ID}).secrets.lastStand).toBe(false);
    });

    it("moves to fake priest if priest is dead", function() {
      Roles.insert({gameId: GAME_ID, userId: "whatever", role: "priest", lives: 0});
      Players.insert({gameId: GAME_ID, userId: NO_KILL_ID, alive: true, votes: 1});

      Meteor.call("covenVote", GAME_ID, NO_KILL_ID);

      expect(Games.findOne(GAME_ID).view).toBe("priest");
      expect(Timeouts.findOne({gameId: GAME_ID, view: "priest"})).toBeFalsy();
    });

    it("moves to real demons if demons", function() {
      Roles.insert({gameId: GAME_ID, userId: "whatever", role: "priest", lives: 1});
      Players.insert({gameId: GAME_ID, userId: NO_KILL_ID, alive: true, votes: 1});

      Meteor.call("covenVote", GAME_ID, NO_KILL_ID);

      expect(Games.findOne(GAME_ID).view).toBe("priest");
      expect(Timeouts.findOne({gameId: GAME_ID, view: "priest"}).id).toBe(TIMEOUT_ID);
    });
  });
});