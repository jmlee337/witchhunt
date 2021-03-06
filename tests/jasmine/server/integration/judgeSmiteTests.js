Jasmine.onTest(function() {
  describe("judgeSmite", function() {
    var GAME_ID = "game-id";
    var TARGET_ID = "target-id";
    var USER_ID = "user-id";

    beforeEach(function() {
      spyOn(Meteor, "userId").and.returnValue(USER_ID);
      Games.insert({_id: GAME_ID, userId: USER_ID, view: "judge"});
      Players.insert({gameId: GAME_ID, userId: USER_ID, alive: true});
      Roles.insert({gameId: GAME_ID, userId: USER_ID, role: "judge"});
      Players.insert({gameId: GAME_ID, userId: TARGET_ID, alive: true});
      Roles.insert({gameId: GAME_ID, userId: TARGET_ID, lives: 1});
    });

    afterEach(function() {
      DayKills.remove({});
      Games.remove({});
      Players.remove({});
      Roles.remove({});
      Timeouts.remove({});
    });

    it("clears timeout", function() {
      Meteor.call("judgeSmite", GAME_ID, TARGET_ID);

      expect(Timeouts.findOne({gameId: GAME_ID, view: "judge"})).toBeTruthy();
    });

    it("doesn't kill anyone for NO_KILL", function() {
      Meteor.call("judgeSmite", GAME_ID, NO_KILL_ID);

      expect(DayKills.find({gameId: GAME_ID}).count()).toBe(0);
    });

    it("smites a player", function() {
      Meteor.call("judgeSmite", GAME_ID, TARGET_ID);

      expect(DayKills.findOne({gameId: GAME_ID, userId: TARGET_ID, died: true, cod: "smite"})).toBeTruthy();
    });

    it("moves to preNight with kill", function() {
      Meteor.call("judgeSmite", GAME_ID, TARGET_ID);

      expect(Games.findOne(GAME_ID).view).toBe("preNight");
    });

    it("moves to preNight with no kill", function() {
      Meteor.call("judgeSmite", GAME_ID, NO_KILL_ID);

      expect(Games.findOne(GAME_ID).view).toBe("preNight");
    });
  });
});