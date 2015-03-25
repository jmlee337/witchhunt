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
    })

    it("requires a gameId", function(done) {
      Meteor.call("apprenticeChoose", function(error, result) {
        expect(error).toBeDefined();
        done();
      });
    });

    it("requires game to be in setup", function(done) {
      Games.update({}, {$set: {view: "not setup"}});

      Meteor.call("apprenticeChoose", GAME_ID, function(error, result) {
        expect(error).toBeDefined();
        done();
      });
    });

    it("requires player to be in the game", function(done) {
      Players.update({}, {$set: {gameId: "not the right gameId"}});

      Meteor.call("apprenticeChoose", GAME_ID, function(error, result) {
        expect(error).toBeDefined();
        done();
      });
    });

    it("requires player to be the apprentice", function(done) {
      Roles.update({}, {$set: {role: "not apprentice"}});

      Meteor.call("apprenticeChoose", GAME_ID, function(error, result) {
        expect(error).toBeDefined();
        done();
      });
    });

    it("requires a master", function(done) {
      Meteor.call("apprenticeChoose", GAME_ID, function(error, result) {
        expect(error).toBeDefined();
        done();
      });
    });

    it("requires master to be a valid value", function(done) {
      Meteor.call("apprenticeChoose", GAME_ID, "not judge or gravedigger", function(error, result) {
        expect(error).toBeDefined();
        done();
      });
    });

    it("chooses judge correctly", function(done) {
      var judgeId = "judge-user-id";
      var judgeName = "judge-name";
      Players.insert({gameId: GAME_ID, userId: judgeId, name: judgeName});
      Roles.insert({gameId: GAME_ID, userId: judgeId, role: "judge"});

      Meteor.call("apprenticeChoose", GAME_ID, "judge", function(error, result) {
        expect(error).toBeUndefined();
        expect(result).toBeUndefined();

        expect(Roles.findOne({gameId: GAME_ID, userId: USER_ID, role: "apprentice"}).secrets).toEqual({
          master: {
            id: judgeId,
            name: judgeName,
            role: "judge"
          }
        });
        done();
      });
    });

    it("chooses gravedigger correctly", function(done) {
      var gravediggerId = "gravedigger-user-id";
      var gravediggerName = "gravedigger-name";
      Players.insert({gameId: GAME_ID, userId: gravediggerId, name: gravediggerName});
      Roles.insert({gameId: GAME_ID, userId: gravediggerId, role: "gravedigger"});

      Meteor.call("apprenticeChoose", GAME_ID, "gravedigger", function(error, result) {
        expect(error).toBeUndefined();
        expect(result).toBeUndefined();

        expect(Roles.findOne({gameId: GAME_ID, userId: USER_ID, role: "apprentice"}).secrets).toEqual({
          master: {
            id: gravediggerId,
            name: gravediggerName,
            role: "gravedigger"
          }
        });
        done();
      });
    });

    it("moves game to confirmWake if all acks are done", function(done) {
      var judgeId = "judge-user-id";
      Players.insert({gameId: GAME_ID, userId: judgeId, name: "judge-name"});
      Roles.insert({gameId: GAME_ID, userId: judgeId, role: "judge"});

      Meteor.call("apprenticeChoose", GAME_ID, "judge", function(error, result) {
        expect(error).toBeUndefined();
        expect(result).toBeUndefined();

        expect(Games.findOne(GAME_ID).view).toBe("confirmWake");
        expect(WakeAcks.find({gameId: GAME_ID}).count()).toBe(0);
        done();
      });
    });

    it("doesn't move game if more acks are needed", function(done) {
      var judgeId = "judge-user-id";
      Players.insert({gameId: GAME_ID, userId: judgeId, name: "judge-name"});
      Roles.insert({gameId: GAME_ID, userId: judgeId, role: "judge"});

      Players.insert({gameId: GAME_ID, userId: "other-user-id", alive: true});

      Meteor.call("apprenticeChoose", GAME_ID, "judge", function(error, result) {
        expect(error).toBeUndefined();
        expect(result).toBeUndefined();

        expect(WakeAcks.findOne({gameId: GAME_ID, userId: USER_ID})).toBeTruthy();
        expect(Games.findOne(GAME_ID).view).toBe("setup");
        done();
      });
    });

    it("doesn't count NO_KILL as needing to ack", function(done) {
      var judgeId = "judge-user-id";
      Players.insert({gameId: GAME_ID, userId: judgeId, name: "judge-name"});
      Roles.insert({gameId: GAME_ID, userId: judgeId, role: "judge"});

      Players.insert({gameId: GAME_ID, userId: NO_KILL_ID, alive: true});

      Meteor.call("apprenticeChoose", GAME_ID, "judge", function(error, result) {
        expect(error).toBeUndefined();
        expect(result).toBeUndefined();

        expect(Games.findOne(GAME_ID).view).toBe("confirmWake");
        expect(WakeAcks.find({gameId: GAME_ID}).count()).toBe(0);
        done();
      });
    });
  });
});