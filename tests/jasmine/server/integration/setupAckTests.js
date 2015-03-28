Jasmine.onTest(function() {
  describe("setupAck", function() {
    var GAME_ID = "game-id";
    var USER_ID = "user-id";

    beforeEach(function() {
      spyOn(Meteor, "userId").and.returnValue(USER_ID);
      Games.insert({_id: GAME_ID, userId: USER_ID, view: "setup"});
      Players.insert({gameId: GAME_ID, userId: USER_ID, alive: true});
    });

    afterEach(function() {
      Games.remove({});
      Players.remove({});
      WakeAcks.remove({});
    });

    it("moves game to confirmWake if all acks are done", function() {
      Meteor.call("setupAck", GAME_ID);

      expect(Games.findOne(GAME_ID).view).toBe("confirmWake");
      expect(WakeAcks.find({gameId: GAME_ID}).count()).toBe(0);
    });

    it("doesn't move game if more acks are needed", function() {
      Players.insert({gameId: GAME_ID, userId: "other-user-id", alive: true});

      Meteor.call("setupAck", GAME_ID);

      expect(WakeAcks.findOne({gameId: GAME_ID, userId: USER_ID})).toBeTruthy();
      expect(Games.findOne(GAME_ID).view).toBe("setup");
    });

    it("short circuits if called a second time", function() {
      Players.insert({gameId: GAME_ID, userId: "other-user-id", alive: true});

      Meteor.call("setupAck", GAME_ID);

      expect(WakeAcks.findOne({gameId: GAME_ID, userId: USER_ID})).toBeTruthy();
      expect(Games.findOne(GAME_ID).view).toBe("setup");

      Meteor.call("setupAck", GAME_ID);

      expect(WakeAcks.findOne({gameId: GAME_ID, userId: USER_ID})).toBeTruthy();
      expect(Games.findOne(GAME_ID).view).toBe("setup");
    });

    it("doesn't count NO_KILL as needing to ack", function() {
      Players.insert({gameId: GAME_ID, userId: NO_KILL_ID, alive: true});

      Meteor.call("setupAck", GAME_ID);

      expect(Games.findOne(GAME_ID).view).toBe("confirmWake");
      expect(WakeAcks.find({gameId: GAME_ID}).count()).toBe(0);
    });
  });
});