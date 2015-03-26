Jasmine.onTest(function() {
  describe("apprenticeChoose", function() {
    var GAME_ID = "game-id";
    var USER_ID = "user-id";

    beforeEach(function() {
      spyOn(Meteor, "userId").and.returnValue(USER_ID);
      Games.insert({_id: GAME_ID, userId: USER_ID, view: "setup"});
      Players.insert({gameId: GAME_ID, userId: USER_ID, alive: true});
      Roles.insert({gameId: GAME_ID, userId: USER_ID, role: "apprentice"});
    });

    afterEach(function() {
      Games.remove({});
      Players.remove({});
      Roles.remove({});
      WakeAcks.remove({});
    });

    it("checks master for validity", function() {
      var judgeId = "judge-user-id";
      Players.insert({gameId: GAME_ID, userId: judgeId, name: "judge-name"});
      Roles.insert({gameId: GAME_ID, userId: judgeId, role: "judge"});

      expect(function() {
        Meteor.call("apprenticeChoose", GAME_ID, "not judge or gravedigger");
      }).toThrow(jasmine.objectContaining({errorType: "Match.Error"}));
    });

    it("chooses judge correctly", function() {
      var judgeId = "judge-user-id";
      var judgeName = "judge-name";
      Players.insert({gameId: GAME_ID, userId: judgeId, name: judgeName});
      Roles.insert({gameId: GAME_ID, userId: judgeId, role: "judge"});

      Meteor.call("apprenticeChoose", GAME_ID, "judge");

      expect(Roles.findOne({gameId: GAME_ID, userId: USER_ID, role: "apprentice"}).secrets).toEqual({
        master: {
          id: judgeId,
          name: judgeName,
          role: "judge"
        }
      });
    });

    it("chooses gravedigger correctly", function() {
      var gravediggerId = "gravedigger-user-id";
      var gravediggerName = "gravedigger-name";
      Players.insert({gameId: GAME_ID, userId: gravediggerId, name: gravediggerName});
      Roles.insert({gameId: GAME_ID, userId: gravediggerId, role: "gravedigger"});

      Meteor.call("apprenticeChoose", GAME_ID, "gravedigger");

      expect(Roles.findOne({gameId: GAME_ID, userId: USER_ID, role: "apprentice"}).secrets).toEqual({
        master: {
          id: gravediggerId,
          name: gravediggerName,
          role: "gravedigger"
        }
      });
    });

    it("moves game to confirmWake if all acks are done", function() {
      var judgeId = "judge-user-id";
      Players.insert({gameId: GAME_ID, userId: judgeId, name: "judge-name"});
      Roles.insert({gameId: GAME_ID, userId: judgeId, role: "judge"});

      Meteor.call("apprenticeChoose", GAME_ID, "judge");

      expect(Games.findOne(GAME_ID).view).toBe("confirmWake");
      expect(WakeAcks.find({gameId: GAME_ID}).count()).toBe(0);
    });

    it("doesn't move game if more acks are needed", function() {
      var judgeId = "judge-user-id";
      Players.insert({gameId: GAME_ID, userId: judgeId, name: "judge-name"});
      Roles.insert({gameId: GAME_ID, userId: judgeId, role: "judge"});

      Players.insert({gameId: GAME_ID, userId: "other-user-id", alive: true});

      Meteor.call("apprenticeChoose", GAME_ID, "judge");

      expect(WakeAcks.findOne({gameId: GAME_ID, userId: USER_ID})).toBeTruthy();
      expect(Games.findOne(GAME_ID).view).toBe("setup");
    });

    it("doesn't count NO_KILL as needing to ack", function() {
      var judgeId = "judge-user-id";
      Players.insert({gameId: GAME_ID, userId: judgeId, name: "judge-name"});
      Roles.insert({gameId: GAME_ID, userId: judgeId, role: "judge"});

      Players.insert({gameId: GAME_ID, userId: NO_KILL_ID, alive: true});

      Meteor.call("apprenticeChoose", GAME_ID, "judge");

      expect(Games.findOne(GAME_ID).view).toBe("confirmWake");
      expect(WakeAcks.find({gameId: GAME_ID}).count()).toBe(0);
    });
  });
});