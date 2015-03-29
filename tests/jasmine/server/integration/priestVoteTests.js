Jasmine.onTest(function() {
  var GAME_ID = "game-id";
  var TIMEOUT_ID = 1000;
  var USER_ID = "user-id";

  describe("priestVote with NO_KILL", function() {
    beforeEach(function() {
      spyOn(Meteor, "userId").and.returnValue(USER_ID);
      spyOn(Meteor, "setTimeout").and.returnValue(TIMEOUT_ID);
      Games.insert({_id: GAME_ID, view: "priest"});
      Players.insert({gameId: GAME_ID, userId: USER_ID, alive: true});
      Roles.insert({gameId: GAME_ID, userId: USER_ID, role: "priest", lives: 1, secrets: {investigations: []}});
    });

    afterEach(function() {
      Games.remove({});
      Players.remove({});
      Roles.remove({});
      Timeouts.remove({});
    });

    it("moves to real hunter if hunter can hunt and is alive", function() {
      var hunterId = "hunter-id";
      Roles.insert({
          gameId: GAME_ID, userId: hunterId, role: "hunter", lives: 1, secrets: {tonightWeHunt: true}
      });

      Meteor.call("priestVote", GAME_ID, NO_KILL_ID);

      expect(Games.findOne(GAME_ID).view).toBe("hunter");
      expect(Timeouts.findOne({gameId: GAME_ID, view: "hunter"}).id).toBe(TIMEOUT_ID);
    });

    it("moves to fake hunter if hunter can hunt and is dead", function() {
      var hunterId = "hunter-id";
      Roles.insert({
          gameId: GAME_ID, userId: hunterId, role: "hunter", lives: 0, secrets: {tonightWeHunt: true}
      });

      Meteor.call("priestVote", GAME_ID, NO_KILL_ID);

      expect(Games.findOne(GAME_ID).view).toBe("hunter");
      expect(Timeouts.findOne({gameId: GAME_ID, view: "hunter"})).toBeFalsy();
    });

    it("moves to preDay if hunter cannot hunt", function() {
      Roles.insert({
          gameId: GAME_ID, userId: "whatever", role: "hunter", lives: 1, secrets: {tonightWeHunt: false}
      });

      Meteor.call("priestVote", GAME_ID, NO_KILL_ID);

      expect(Games.findOne(GAME_ID).view).toBe("preDay");
    });

    it("moves to preDay if there is no hunter", function() {
      Meteor.call("priestVote", GAME_ID, NO_KILL_ID);

      expect(Games.findOne(GAME_ID).view).toBe("preDay");
    });
  });

  describe("priestVote with investigation", function() {
    var TARGET_ID = "target-id";
    var TARGET_NAME = "target-name";

    beforeEach(function() {
      spyOn(Meteor, "userId").and.returnValue(USER_ID);
      Games.insert({_id: GAME_ID, view: "priest"});
      Players.insert({gameId: GAME_ID, userId: USER_ID, alive: true});
      Roles.insert({gameId: GAME_ID, userId: USER_ID, role: "priest", lives: 1, secrets: {investigations: []}});
      Players.insert({gameId: GAME_ID, userId: TARGET_ID, name: TARGET_NAME, alive: true});
      Roles.insert({gameId: GAME_ID, userId: TARGET_ID, alignment: "coven", lives: 1, secrets: {}});
    });

    afterEach(function() {
      Games.remove({});
      Players.remove({});
      Roles.remove({});
    });

    it("adds investigation for coven", function() {
      Meteor.call("priestVote", GAME_ID, TARGET_ID);

      var investigations = Roles.findOne({
          gameId: GAME_ID, userId: USER_ID, role: "priest", lives: 1
      }).secrets.investigations;
      expect(investigations.length).toBe(1);
      expect(investigations[0]).toEqual({id: TARGET_ID, name: TARGET_NAME, isWitch: true});
    });

    it("adds investigation for town", function() {
      Roles.update({gameId: GAME_ID, userId: TARGET_ID, lives: 1}, {$set: {alignment: "town"}});

      Meteor.call("priestVote", GAME_ID, TARGET_ID);

      var investigations = Roles.findOne({
          gameId: GAME_ID, userId: USER_ID, role: "priest", lives: 1
      }).secrets.investigations;
      expect(investigations.length).toBe(1);
      expect(investigations[0]).toEqual({id: TARGET_ID, name: TARGET_NAME, isWitch: false});
    });

    it("adds investigation for holy", function() {
      Roles.update({gameId: GAME_ID, userId: TARGET_ID, lives: 1}, {$set: {alignment: "holy"}});

      Meteor.call("priestVote", GAME_ID, TARGET_ID);

      var investigations = Roles.findOne({
          gameId: GAME_ID, userId: USER_ID, role: "priest", lives: 1
      }).secrets.investigations;
      expect(investigations.length).toBe(1);
      expect(investigations[0]).toEqual({id: TARGET_ID, name: TARGET_NAME, isWitch: false});
    });

    it("sets investigation for fanatic", function() {
      Roles.update({gameId: GAME_ID, userId: TARGET_ID, lives: 1}, {$set: {role: "fanatic"}});

      Meteor.call("priestVote", GAME_ID, TARGET_ID);

      var fanatic = Roles.findOne({gameId: GAME_ID, userId: TARGET_ID, alignment: "coven"});
      expect(fanatic.lives).toBe(2);
      expect(fanatic.secrets.investigated).toBe(true);
    });

    it("sets hasInvestigated true", function() {
      Meteor.call("priestVote", GAME_ID, TARGET_ID);

      expect(Roles.findOne({
          gameId: GAME_ID, userId: USER_ID, role: "priest", lives: 1
      }).secrets.hasInvestigated).toBe(true);
    });

    it("short circuits when called more than once", function() {
      Meteor.call("priestVote", GAME_ID, TARGET_ID);

      var secrets = Roles.findOne({gameId: GAME_ID, userId: USER_ID, role: "priest", lives: 1}).secrets;
      expect(secrets.investigations.length).toBe(1);
      expect(secrets.investigations[0]).toEqual({id: TARGET_ID, name: TARGET_NAME, isWitch: true});
      expect(secrets.hasInvestigated).toBe(true);

      Meteor.call("priestVote", GAME_ID, NO_KILL_ID);

      var secrets = Roles.findOne({gameId: GAME_ID, userId: USER_ID, role: "priest", lives: 1}).secrets;
      expect(secrets.investigations.length).toBe(1);
      expect(secrets.investigations[0]).toEqual({id: TARGET_ID, name: TARGET_NAME, isWitch: true});
      expect(secrets.hasInvestigated).toBe(true);
      expect(Games.findOne(GAME_ID).view).toBe("priest");

      Meteor.call("priestVote", GAME_ID, "even an invalid id");

      var secrets = Roles.findOne({gameId: GAME_ID, userId: USER_ID, role: "priest", lives: 1}).secrets;
      expect(secrets.investigations.length).toBe(1);
      expect(secrets.investigations[0]).toEqual({id: TARGET_ID, name: TARGET_NAME, isWitch: true});
      expect(secrets.hasInvestigated).toBe(true);
      expect(Games.findOne(GAME_ID).view).toBe("priest");
    });
  });
});