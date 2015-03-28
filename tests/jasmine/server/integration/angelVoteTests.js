Jasmine.onTest(function() {
  var GAME_ID = "game-id";
  var TARGET_ID = "target-id";
  var USER_ID = "user-id";

  describe("angelVote without deciding vote", function() {
    var OTHER_ID = "other-id";

    beforeEach(function() {
      spyOn(Meteor, "userId").and.returnValue(USER_ID);
      Games.insert({_id: GAME_ID, view: "angels"});
      Players.insert({gameId: GAME_ID, userId: USER_ID, alive: false});
      Players.insert({gameId: GAME_ID, userId: OTHER_ID, alive: false});
      Players.insert({gameId: GAME_ID, userId: TARGET_ID, alive: true});
      Roles.insert({gameId: GAME_ID, userId: USER_ID, alignment: "town", lives: 0, secrets: {}});
      Roles.insert({gameId: GAME_ID, userId: OTHER_ID, alignment: "town", lives: 0, secrets: {}});
    });

    afterEach(function() {
      Games.remove({});
      NightCurse.remove({});
      Players.remove({});
      Roles.remove({});
      Votes.remove({});
    });

    it("cannot be used on cursed player", function() {
      NightCurse.insert({gameId: GAME_ID, userId: TARGET_ID});

      expect(function() {
        Meteor.call("angelVote", GAME_ID, TARGET_ID);
      }).toThrow(jasmine.objectContaining({errorType: "Meteor.Error"}));

      NightCurse.remove({gameId: GAME_ID, userId: TARGET_ID});
      expect(function() {
        Meteor.call("angelVote", GAME_ID, TARGET_ID);
      }).not.toThrow();
    });

    it("adds vote", function() {
      Meteor.call("angelVote", GAME_ID, TARGET_ID);

      expect(Players.findOne({gameId: GAME_ID, userId: TARGET_ID}).votes).toBe(1);
      expect(Votes.findOne({gameId: GAME_ID, userId: USER_ID}).voteId).toBe(TARGET_ID);
    });

    it("clears old vote", function() {
      var oldId = "old-id";
      Players.insert({gameId: GAME_ID, userId: oldId, votes: 1});
      Votes.insert({gameId: GAME_ID, userId: USER_ID, voteId: oldId});

      Meteor.call("angelVote", GAME_ID, TARGET_ID);

      expect(Players.findOne({gameId: GAME_ID, userId: oldId}).votes).toBe(0);
      expect(Votes.findOne({gameId: GAME_ID, userId: USER_ID}).voteId).not.toBe(oldId);
    });

    it("doesn't move game", function() {
      Meteor.call("angelVote", GAME_ID, TARGET_ID);

      expect(Games.findOne(GAME_ID).view).toBe("angels");
    });
  });

  describe("angelVote with deciding vote", function() {
    var TIMEOUT_ID = 1000;

    beforeEach(function() {
      spyOn(Meteor, "userId").and.returnValue(USER_ID);
      spyOn(Meteor, "setTimeout").and.returnValue(TIMEOUT_ID);
      Games.insert({_id: GAME_ID, view: "angels"});
      Players.insert({gameId: GAME_ID, userId: USER_ID, alive: false});
      Players.insert({gameId: GAME_ID, userId: TARGET_ID, alive: true});
      Roles.insert({gameId: GAME_ID, userId: USER_ID, alignment: "town", lives: 0, secrets: {}});
    });

    afterEach(function() {
      Games.remove({});
      NightShields.remove({});
      Players.remove({});
      Roles.remove({});
      Votes.remove({});
      Timeouts.remove({});
    });

    it("clears votes", function() {
      Meteor.call("angelVote", GAME_ID, TARGET_ID);

      expect(Players.findOne({gameId: GAME_ID, userId: TARGET_ID}).votes).toBe(0);
      expect(Votes.find({gameId: GAME_ID}).count()).toBe(0);
    });

    it("clears timeout", function() {
      spyOn(Meteor, "clearTimeout");
      Timeouts.insert({gameId: GAME_ID, view: "angels", id: TIMEOUT_ID});

      Meteor.call("angelVote", GAME_ID, TARGET_ID);

      expect(Meteor.clearTimeout.calls.count()).toBe(1);
      expect(Meteor.clearTimeout.calls.argsFor(0)).toEqual([TIMEOUT_ID]);
    });

    it("doesn't add shield for NO_KILL", function() {
      Players.insert({gameId: GAME_ID, userId: NO_KILL_ID, alive: true});

      Meteor.call("angelVote", GAME_ID, NO_KILL_ID);

      expect(NightShields.find({gameId: GAME_ID}).count()).toBe(0);
    });

    it("shields player", function() {
      Meteor.call("angelVote", GAME_ID, TARGET_ID);

      expect(NightShields.findOne({gameId: GAME_ID, userId: TARGET_ID}).shields).toBe(1);
    });

    it("moves to coven because there has to be live coven", function() {
      Roles.insert({gameId: GAME_ID, userId: "whatever", alignment: "coven", lives: 1});

      Meteor.call("angelVote", GAME_ID, TARGET_ID);

      expect(Games.findOne(GAME_ID).view).toBe("coven");
      expect(Timeouts.findOne({gameId: GAME_ID, view: "coven"}).id).toBe(TIMEOUT_ID);
    });
  });
});