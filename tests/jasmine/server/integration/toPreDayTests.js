Jasmine.onTest(function() {
  describe("to preDay with night kills", function() {
    var GAME_ID = "game-id";
    var TARGET_ID = "target-id";
    var TARGET_NAME = "target-name";

    beforeEach(function() {
      Games.insert({_id: GAME_ID});
      Players.insert({gameId: GAME_ID, userId: TARGET_ID, name: TARGET_NAME, alive: true});
      Roles.insert({gameId: GAME_ID, userId: TARGET_ID, secrets: {}, lives: 1});

      nightKillPlayer(GAME_ID, TARGET_ID);
    });

    afterEach(function() {
      Games.remove({});
      NightKills.remove({});
      NightShields.remove({});
      NightTargets.remove({});
      Players.remove({});
      Roles.remove({});
    });

    it("updates player lives", function() {
      maybeGoToRole(GAME_ID, "preDay");

      expect(Players.findOne({gameId: GAME_ID, userId: TARGET_ID, name: TARGET_NAME}).alive)
          .toBe(false);
      expect(Roles.findOne({gameId: GAME_ID, userId: TARGET_ID}).lives).toBe(0);
    });

    it("inserts into NightKills", function() {
      maybeGoToRole(GAME_ID, "preDay");

      expect(NightKills.findOne({
          gameId: GAME_ID, userId: TARGET_ID, name: TARGET_NAME, died: true
      })).toBeTruthy();
    });

    it("blocks with shields", function() {
      NightShields.insert({gameId: GAME_ID, userId: TARGET_ID, shields: 1});
      maybeGoToRole(GAME_ID, "preDay");

      expect(Players.findOne({gameId: GAME_ID, userId: TARGET_ID, name: TARGET_NAME}).alive)
          .toBe(true);
      expect(Roles.findOne({gameId: GAME_ID, userId: TARGET_ID}).lives).toBe(1);
      expect(NightKills.findOne({gameId: GAME_ID, userId: TARGET_ID, name: TARGET_NAME}).died)
          .toBe(false);
    });

    it("pierces shields", function() {
      NightShields.insert({gameId: GAME_ID, userId: TARGET_ID, shields: 1});
      nightKillPlayer(GAME_ID, TARGET_ID);
      maybeGoToRole(GAME_ID, "preDay");

      expect(Players.findOne({gameId: GAME_ID, userId: TARGET_ID, name: TARGET_NAME}).alive)
          .toBe(false);
      expect(Roles.findOne({gameId: GAME_ID, userId: TARGET_ID}).lives).toBe(0);
      expect(NightKills.findOne({gameId: GAME_ID, userId: TARGET_ID, name: TARGET_NAME}).died)
          .toBe(true);
    });

    it("handles overkill", function() {
      NightShields.insert({gameId: GAME_ID, userId: TARGET_ID, shields: 1});
      nightKillPlayer(GAME_ID, TARGET_ID);
      nightKillPlayer(GAME_ID, TARGET_ID);
      nightKillPlayer(GAME_ID, TARGET_ID);
      maybeGoToRole(GAME_ID, "preDay");

      expect(Players.findOne({gameId: GAME_ID, userId: TARGET_ID, name: TARGET_NAME}).alive)
          .toBe(false);
      expect(Roles.findOne({gameId: GAME_ID, userId: TARGET_ID}).lives).toBe(-2);
      expect(NightKills.findOne({gameId: GAME_ID, userId: TARGET_ID, name: TARGET_NAME}).died)
          .toBe(true);

    });

    it("tells oracle about priest death", function() {
      var oracleId = "oracle-id";
      Roles.insert({gameId: GAME_ID, userId: oracleId, role: "oracle", lives: 1, secrets: {}});
      Roles.update({gameId: GAME_ID, userId: TARGET_ID}, {$set: {role: "priest"}});
      maybeGoToRole(GAME_ID, "preDay");
      expect(Roles.findOne({
          gameId: GAME_ID, userId: oracleId, role: "oracle", lives: 1
      }).secrets.deadPriest).toEqual({id: TARGET_ID, name: TARGET_NAME});
    });

    it("tells oracle about priest death even if oracle is dead", function() {
      var oracleId = "oracle-id";
      Roles.insert({gameId: GAME_ID, userId: oracleId, role: "oracle", lives: 0, secrets: {}});
      Roles.update({gameId: GAME_ID, userId: TARGET_ID}, {$set: {role: "priest"}});
      maybeGoToRole(GAME_ID, "preDay");

      expect(Roles.findOne({
          gameId: GAME_ID, userId: oracleId, role: "oracle", lives: 0
      }).secrets.deadPriest).toEqual({id: TARGET_ID, name: TARGET_NAME});
    });

    it("doesn't tell oracle about priest death if priest didn't die", function() {
      var oracleId = "oracle-id";
      Roles.insert({gameId: GAME_ID, userId: oracleId, role: "oracle", lives: 1, secrets: {}});
      Roles.update({gameId: GAME_ID, userId: TARGET_ID}, {$set: {role: "priest"}});
      NightShields.insert({gameId: GAME_ID, userId: TARGET_ID, shields: 1});
      maybeGoToRole(GAME_ID, "preDay");

      expect(Roles.findOne({
          gameId: GAME_ID, userId: oracleId, role: "oracle", lives: 1
      }).secrets.deadPriest).toBeFalsy();
    });
  });
});