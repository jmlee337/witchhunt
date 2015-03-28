Jasmine.onTest(function() {
  describe("preDayAck", function() {
    var GAME_ID = "game-id";
    var USER_ID = "user-id";

    beforeEach(function() {
      spyOn(Meteor, "userId").and.returnValue(USER_ID);
      Games.insert({_id: GAME_ID, userId: USER_ID, view: "preDay"});
      Players.insert({gameId: GAME_ID, userId: USER_ID, alive: true});
    });

    afterEach(function() {
      Games.remove({});
      NightKills.remove({});
      Players.remove({});
      Roles.remove({});
      WakeAcks.remove({});
    });

    it("requires player to be alive or killed today", function() {
      Players.update({gameId: GAME_ID, userId: USER_ID}, {$set: {alive: false}});

      expect(function() {
        Meteor.call("preDayAck", GAME_ID);
      }).toThrow(jasmine.objectContaining({errorType: "Meteor.Error"}));

      NightKills.insert({gameId: GAME_ID, userId: USER_ID, died: true});
      expect(function() {
        Meteor.call("preDayAck", GAME_ID);
      }).not.toThrow();
    });

    it("moves game if no more acks are needed", function() {
      Meteor.call("preDayAck", GAME_ID);

      expect(Games.findOne(GAME_ID).view).not.toBe("preDay");
      expect(WakeAcks.find({gameId: GAME_ID}).count()).toBe(0);
    });

    it("doesn't move game if more acks are needed", function() {
      Players.insert({gameId: GAME_ID, userId: "other-id", alive: true});

      Meteor.call("preDayAck", GAME_ID);

      expect(Games.findOne(GAME_ID).view).toBe("preDay");
      expect(WakeAcks.findOne({gameId: GAME_ID, userId: USER_ID})).toBeTruthy();
    });

    it("short circuits if called a second time", function() {
      Players.insert({gameId: GAME_ID, userId: "other-id", alive: true});

      Meteor.call("preDayAck", GAME_ID);

      expect(Games.findOne(GAME_ID).view).toBe("preDay");
      expect(WakeAcks.findOne({gameId: GAME_ID, userId: USER_ID})).toBeTruthy();

      Meteor.call("preDayAck", GAME_ID);

      expect(Games.findOne(GAME_ID).view).toBe("preDay");
      expect(WakeAcks.findOne({gameId: GAME_ID, userId: USER_ID})).toBeTruthy();
    });

    it("does count players killed tonight as being needed", function() {
      var otherId = "other-id";
      Players.insert({gameId: GAME_ID, userId: otherId, alive: false});
      NightKills.insert({gameId: GAME_ID, userId: otherId, died: true});

      Meteor.call("preDayAck", GAME_ID);

      expect(Games.findOne(GAME_ID).view).toBe("preDay");
      expect(WakeAcks.findOne({gameId: GAME_ID, userId: USER_ID})).toBeTruthy();
    });

    it("doesn't count normal dead players as being needed", function() {
      Players.insert({gameId: GAME_ID, userId: "other-id", alive: false});

      Meteor.call("preDayAck", GAME_ID);

      expect(Games.findOne(GAME_ID).view).not.toBe("preDay");
      expect(WakeAcks.find({gameId: GAME_ID}).count()).toBe(0);
    });

    it("doesn't count NO_KILL as being needed", function() {
      Players.insert({gameId: GAME_ID, userId: NO_KILL_ID, alive: true});

      Meteor.call("preDayAck", GAME_ID);

      expect(Games.findOne(GAME_ID).view).not.toBe("preDay");
      expect(WakeAcks.find({gameId: GAME_ID}).count()).toBe(0);
    });

    it("moves game to confirmWake if all acks are done and game isn't over", function() {
      Roles.insert({gameId: GAME_ID, userId: USER_ID, alignment: "town", lives: 1});
      Roles.insert({gameId: GAME_ID, userId: "user-id-2", alignment: "town", lives: 1});
      Roles.insert({gameId: GAME_ID, userId: "user-id-3", alignment: "coven", lives: 1});

      Meteor.call("preDayAck", GAME_ID);

      expect(Games.findOne(GAME_ID).view).toBe("confirmWake");
      expect(WakeAcks.find({gameId: GAME_ID}).count()).toBe(0);
    });

    it("moves game to end if all acks are done and game is over", function() {
      Meteor.call("preDayAck", GAME_ID);

      expect(Games.findOne(GAME_ID).view).toBe("end");
      expect(WakeAcks.find({gameId: GAME_ID}).count()).toBe(0);
    });
  });
});