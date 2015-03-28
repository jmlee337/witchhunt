Jasmine.onTest(function() {
  describe("hunterVote", function() {
    var GAME_ID = "game-id";
    var TARGET_ID = "target-id";
    var TARGET_NAME = "target-name";
    var TIMEOUT_ID = 1000;
    var USER_ID = "user-id";

    beforeEach(function() {
      spyOn(Meteor, "userId").and.returnValue(USER_ID);
      spyOn(Meteor, "setTimeout").and.returnValue(TIMEOUT_ID);
      Games.insert({_id: GAME_ID, view: "hunter"});
      Players.insert({gameId: GAME_ID, userId: USER_ID, alive: true});
      Roles.insert({
          gameId: GAME_ID,
          userId: USER_ID, 
          role: "hunter", 
          lives: 1, 
          secrets: {tonightWeHunt: true}
      });
      Players.insert({gameId: GAME_ID, userId: TARGET_ID, name: TARGET_NAME, alive: true});
      Roles.insert({gameId: GAME_ID, userId: TARGET_ID, lives: 1, secrets: {}});
    });

    afterEach(function() {
      Games.remove({});
      NightTargets.remove({});
      Players.remove({});
      Roles.remove({});
      Timeouts.remove({});
    });

    it("requires hunter to be hunting tonight", function() {
      Roles.update(
          {gameId: GAME_ID, userId: USER_ID, role: "hunter", lives: 1}, 
          {$set: {secrets: {tonightWeHunt: false}}});

      expect(function() {
        Meteor.call("hunterVote", GAME_ID, TARGET_ID);
      }).toThrow(jasmine.objectContaining({errorType: "Meteor.Error"}));

      Roles.update(
          {gameId: GAME_ID, userId: USER_ID, role: "hunter", lives: 1},
          {$set: {secrets: {tonightWeHunt: true}}});
      expect(function() {
        Meteor.call("hunterVote", GAME_ID, TARGET_ID);
      }).not.toThrow();
    });

    it("requires hunter to not have used hunt already", function() {
      Roles.update(
          {gameId: GAME_ID, userId: USER_ID, role: "hunter", lives: 1}, 
          {$set: {secrets: {tonightWeHunt: true, used: true}}});

      expect(function() {
        Meteor.call("hunterVote", GAME_ID, TARGET_ID);
      }).toThrow(jasmine.objectContaining({errorType: "Meteor.Error"}));

      Roles.update(
          {gameId: GAME_ID, userId: USER_ID, role: "hunter", lives: 1},
          {$set: {secrets: {tonightWeHunt: true, used: false}}});
      expect(function() {
        Meteor.call("hunterVote", GAME_ID, TARGET_ID);
      }).not.toThrow();
    });

    it("clears hunter timeout", function() {
      spyOn(Meteor, "clearTimeout");
      Timeouts.insert({gameId: GAME_ID, view: "hunter", id: TIMEOUT_ID});

      Meteor.call("hunterVote", GAME_ID, TARGET_ID);

      expect(Meteor.clearTimeout.calls.count()).toBe(1);
      expect(Meteor.clearTimeout.calls.argsFor(0)).toEqual([TIMEOUT_ID]);
    });

    it("kills no one for NO_KILL", function() {
      Meteor.call("hunterVote", GAME_ID, NO_KILL_ID);

      expect(NightTargets.find({gameId: GAME_ID}).count()).toBe(0);
    });

    it("kills target player", function() {
      Meteor.call("hunterVote", GAME_ID, TARGET_ID);

      expect(NightTargets.findOne({
          gameId: GAME_ID, userId: TARGET_ID, name: TARGET_NAME
      })).toBeTruthy();
    });

    it("sets hunter used", function() {
      Meteor.call("hunterVote", GAME_ID, TARGET_ID);

      var secrets = Roles.findOne({
          gameId: GAME_ID, userId: USER_ID, role: "hunter", lives: 1
      }).secrets;
      expect(secrets.used).toBe(true);
      expect(secrets.tonightWeHunt).toBe(false);
    });

    it("moves to preDay", function() {
      Meteor.call("hunterVote", GAME_ID, TARGET_ID);

      expect(Games.findOne(GAME_ID).view).toBe("preDay");
    });
  });
});