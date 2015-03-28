Jasmine.onTest(function() {
  describe("nightKillPlayer", function() {
    var GAME_ID = "game-id";
    var TARGET_ID = "target-id";
    var TARGET_NAME = "target-name";

    beforeEach(function() {
      Players.insert({gameId: GAME_ID, userId: TARGET_ID, name: TARGET_NAME, alive: true});
      Roles.insert({gameId: GAME_ID, userId: TARGET_ID, secrets: {}, lives: 1});
    });

    afterEach(function() {
      NightTargets.remove({});
      Players.remove({});
      Roles.remove({});
    });

    it("inserts target", function() {
      nightKillPlayer(GAME_ID, TARGET_ID);

      expect(NightTargets.findOne({gameId: GAME_ID, userId: TARGET_ID, name: TARGET_NAME}))
          .toBeTruthy();
    });

    it("does not leak information", function() {
      nightKillPlayer(GAME_ID, TARGET_ID);

      expect(Players.findOne({gameId: GAME_ID, userId: TARGET_ID, name: TARGET_NAME}).alive)
          .toBe(true);
      expect(Roles.findOne({gameId: GAME_ID, userId: TARGET_ID}).lives).toBe(1);
    });
  });
});