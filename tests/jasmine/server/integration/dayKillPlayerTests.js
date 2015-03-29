Jasmine.onTest(function() {
  describe("dayKillPlayer", function() {
    var GAME_ID = "game-id";
    var TARGET_ID = "target-id";
    var TARGET_NAME = "target-name";

    beforeEach(function() {
      Players.insert({gameId: GAME_ID, userId: TARGET_ID, name: TARGET_NAME, alive: true});
      Roles.insert({gameId: GAME_ID, userId: TARGET_ID, secrets: {}, lives: 1});
    });

    afterEach(function() {
      DayKills.remove({});
      Players.remove({});
      Roles.remove({});
    });

    it("smites", function() {
      Roles.update({gameId: GAME_ID, userId: TARGET_ID}, {$set: {lives: 2}});

      dayKillPlayer(GAME_ID, TARGET_ID, "smite");

      expect(DayKills.findOne({
          gameId: GAME_ID, userId: TARGET_ID, name: TARGET_NAME, died: true, cod: "smite"
      })).toBeTruthy();
      expect(Players.findOne({gameId: GAME_ID, userId: TARGET_ID}).alive).toBe(false);
      expect(Roles.findOne({gameId: GAME_ID, userId: TARGET_ID}).lives).toBe(0);
    });

    it("lynches", function() {
      dayKillPlayer(GAME_ID, TARGET_ID, "lynch");

      expect(DayKills.findOne({
          gameId: GAME_ID, userId: TARGET_ID, name: TARGET_NAME, died: true, cod: "lynch"
      })).toBeTruthy();
      expect(Players.findOne({gameId: GAME_ID, userId: TARGET_ID}).alive).toBe(false);
      expect(Roles.findOne({gameId: GAME_ID, userId: TARGET_ID}).lives).toBe(0);
    });

    it("spites", function() {
      dayKillPlayer(GAME_ID, TARGET_ID, "dob");

      expect(DayKills.findOne({
          gameId: GAME_ID, userId: TARGET_ID, name: TARGET_NAME, died: true, cod: "dob"
      })).toBeTruthy();
      expect(Players.findOne({gameId: GAME_ID, userId: TARGET_ID}).alive).toBe(false);
      expect(Roles.findOne({gameId: GAME_ID, userId: TARGET_ID}).lives).toBe(0);
    });

    it("blesses", function() {
      dayKillPlayer(GAME_ID, TARGET_ID, "bod");

      expect(DayKills.findOne({
          gameId: GAME_ID, userId: TARGET_ID, name: TARGET_NAME, died: false, cod: "bod"
      })).toBeTruthy();
      expect(Players.findOne({gameId: GAME_ID, userId: TARGET_ID}).alive).toBe(true);
      expect(Roles.findOne({gameId: GAME_ID, userId: TARGET_ID}).lives).toBe(2);
    });

    it("updates fanatic", function() {
      var otherId = "other-id";
      Roles.insert({gameId: GAME_ID, userId: otherId, role: "fanatic", lives: 1, secrets: {}});
      Roles.update({gameId: GAME_ID, userId: TARGET_ID}, {$set: {role: "priest"}});

      dayKillPlayer(GAME_ID, TARGET_ID, "lynch");

      var fanatic = Roles.findOne({gameId: GAME_ID, userId: otherId, role: "fanatic"});
      expect(fanatic.lives).toBe(2);
      expect(fanatic.secrets.priestDied).toBe(true);
    });
  });
});