Jasmine.onTest(function() {
  describe("gamblerChoose", function() {
    var GAME_ID = "game-id";
    var USER_ID = "user-id";

    beforeEach(function() {
      spyOn(Meteor, "userId").and.returnValue(USER_ID);
      Games.insert({_id: GAME_ID, userId: USER_ID, view: "setup"});
      Players.insert({gameId: GAME_ID, userId: USER_ID, alive: true});
      Roles.insert({gameId: GAME_ID, userId: USER_ID, role: "gambler"});
    });

    afterEach(function() {
      Games.remove({});
      Players.remove({});
      Roles.remove({});
      WakeAcks.remove({});
    });

    it("requires game to be in setup", function() {
      Games.update({}, {$set: {view: "not setup"}});

      expect(function() {
        Meteor.call("gamblerChoose", GAME_ID);
      }).toThrow();
    });

    it("requires player to be the gambler", function() {
      Roles.update({}, {$set: {role: "not gambler"}});

      expect(function() {
        Meteor.call("gamblerChoose", GAME_ID);
      }).toThrow();
    });

    it("chooses odd correctly", function() {
      Meteor.call("gamblerChoose", GAME_ID, true);

      expect(Roles.findOne({gameId: GAME_ID, userId: USER_ID, role: "gambler"}).secrets).toEqual({odd: true});
    });

    it("chooses even correctly", function() {
      Meteor.call("gamblerChoose", GAME_ID, false);

      expect(Roles.findOne({gameId: GAME_ID, userId: USER_ID, role: "gambler"}).secrets).toEqual({odd: false});
    });

    it("moves game to confirmWake if all acks are done", function() {
      Meteor.call("gamblerChoose", GAME_ID, true);

      expect(Games.findOne(GAME_ID).view).toBe("confirmWake");
      expect(WakeAcks.find({gameId: GAME_ID}).count()).toBe(0);
    });

    it("doesn't move game if more acks are needed", function() {
      Players.insert({gameId: GAME_ID, userId: "other-user-id", alive: true});

      Meteor.call("gamblerChoose", GAME_ID, true);

      expect(WakeAcks.findOne({gameId: GAME_ID, userId: USER_ID})).toBeTruthy();
      expect(Games.findOne(GAME_ID).view).toBe("setup");
    });

    it("doesn't count NO_KILL as needing to ack", function() {
      Players.insert({gameId: GAME_ID, userId: NO_KILL_ID, alive: true});

      Meteor.call("gamblerChoose", GAME_ID, true);

      expect(Games.findOne(GAME_ID).view).toBe("confirmWake");
      expect(WakeAcks.find({gameId: GAME_ID}).count()).toBe(0);
    });
  });
});