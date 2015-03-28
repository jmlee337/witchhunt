Jasmine.onTest(function() {
  var GAME_ID = "game-id";
  var TARGET_ID = "target-id";
  var USER_ID = "user-id";

  describe("demonVote without deciding vote", function() {
    var OTHER_ID = "other-id";

    beforeEach(function() {
      spyOn(Meteor, "userId").and.returnValue(USER_ID);
      Games.insert({_id: GAME_ID, view: "demons"});
      Players.insert({gameId: GAME_ID, userId: USER_ID, alive: false});
      Players.insert({gameId: GAME_ID, userId: OTHER_ID, alive: false});
      Players.insert({gameId: GAME_ID, userId: TARGET_ID, alive: true});
      Roles.insert({gameId: GAME_ID, userId: USER_ID, alignment: "coven", lives: 0, secrets: {}});
      Roles.insert({gameId: GAME_ID, userId: OTHER_ID, alignment: "coven", lives: 0, secrets: {}});
    });

    afterEach(function() {
      Games.remove({});
      Players.remove({});
      Roles.remove({});
      Votes.remove({});
    });

    it("adds vote", function() {
      Meteor.call("demonVote", GAME_ID, TARGET_ID);

      expect(Players.findOne({gameId: GAME_ID, userId: TARGET_ID}).votes).toBe(1);
      expect(Votes.findOne({gameId: GAME_ID, userId: USER_ID}).voteId).toBe(TARGET_ID);
    });

    it("clears old vote", function() {
      var oldId = "old-id";
      Players.insert({gameId: GAME_ID, userId: oldId, votes: 1});
      Votes.insert({gameId: GAME_ID, userId: USER_ID, voteId: oldId});

      Meteor.call("demonVote", GAME_ID, TARGET_ID);

      expect(Players.findOne({gameId: GAME_ID, userId: oldId}).votes).toBe(0);
      expect(Votes.findOne({gameId: GAME_ID, userId: USER_ID}).voteId).not.toBe(oldId);
    });

    it("doesn't move game", function() {
      Meteor.call("demonVote", GAME_ID, TARGET_ID);

      expect(Games.findOne(GAME_ID).view).toBe("demons");
    });
  });

  describe("demonVote with deciding vote", function() {
    var TIMEOUT_ID = 1000;

    beforeEach(function() {
      spyOn(Meteor, "userId").and.returnValue(USER_ID);
      spyOn(Meteor, "setTimeout").and.returnValue(TIMEOUT_ID);
      Games.insert({_id: GAME_ID, view: "demons"});
      Players.insert({gameId: GAME_ID, userId: USER_ID, alive: false});
      Players.insert({gameId: GAME_ID, userId: TARGET_ID, alive: true});
      Roles.insert({gameId: GAME_ID, userId: USER_ID, alignment: "coven", lives: 0, secrets: {}});
    });

    afterEach(function() {
      Games.remove({});
      NightCurse.remove({});
      Players.remove({});
      Roles.remove({});
      Votes.remove({});
      Timeouts.remove({});
    });

    it("clears votes", function() {
      Meteor.call("demonVote", GAME_ID, TARGET_ID);

      expect(Players.findOne({gameId: GAME_ID, userId: TARGET_ID}).votes).toBe(0);
      expect(Votes.find({gameId: GAME_ID}).count()).toBe(0);
    });

    it("clears timeout", function() {
      spyOn(Meteor, "clearTimeout");
      Timeouts.insert({gameId: GAME_ID, view: "demons", id: TIMEOUT_ID});

      Meteor.call("demonVote", GAME_ID, TARGET_ID);

      expect(Meteor.clearTimeout.calls.count()).toBe(1);
      expect(Meteor.clearTimeout.calls.argsFor(0)).toEqual([TIMEOUT_ID]);
    });

    it("doesn't add curse for NO_KILL", function() {
      Players.insert({gameId: GAME_ID, userId: NO_KILL_ID, alive: true});

      Meteor.call("demonVote", GAME_ID, NO_KILL_ID);

      expect(NightCurse.find({gameId: GAME_ID}).count()).toBe(0);
    });

    it("curses player", function() {
      Meteor.call("demonVote", GAME_ID, TARGET_ID);

      expect(NightCurse.findOne({gameId: GAME_ID, userId: TARGET_ID})).toBeTruthy();
    });

    it("moves to fake angels if no angels", function() {
      Meteor.call("demonVote", GAME_ID, TARGET_ID);

      expect(Games.findOne(GAME_ID).view).toBe("angels");
      expect(Timeouts.findOne({gameId: GAME_ID, view: "angels"})).toBeFalsy();
    });

    it("moves to real angels if angels", function() {
      Roles.insert({gameId: GAME_ID, userId: "whatever", alignment: "town", lives: 0});

      Meteor.call("demonVote", GAME_ID, TARGET_ID);

      expect(Games.findOne(GAME_ID).view).toBe("angels");
      expect(Timeouts.findOne({gameId: GAME_ID, view: "angels"}).id).toBe(TIMEOUT_ID);
    });
  });
});