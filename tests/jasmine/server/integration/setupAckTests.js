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
    })

    it("requires a gameId", function(done) {
      Meteor.call("setupAck", function(error, result) {
        expect(error).toBeDefined();
        done();
      });
    });

    it("requires game to be in setup", function(done) {
      Games.update({}, {$set: {view: "not setup"}});

      Meteor.call("setupAck", GAME_ID, function(error, result) {
        expect(error).toBeDefined();
        done();
      });
    });

    it("requires player to be in the game", function(done) {
      Players.update({}, {$set: {gameId: "not the right gameId"}});

      Meteor.call("setupAck", GAME_ID, function(error, result) {
        expect(error).toBeDefined();
        done();
      });
    });

    it("requires player to not have already successfully called sleepAck", function(done) {
      WakeAcks.insert({gameId: GAME_ID, userId: USER_ID});

      Meteor.call("setupAck", GAME_ID, function(error, result) {
        expect(error).toBeDefined();
        done();
      });
    });

    it("moves game to confirmWake if all acks are done", function(done) {
      Meteor.call("setupAck", GAME_ID, function(error, result) {
        expect(error).toBeUndefined();
        expect(result).toBeUndefined();

        expect(Games.findOne(GAME_ID).view).toBe("confirmWake");
        expect(WakeAcks.find({gameId: GAME_ID}).count()).toBe(0);
        done();
      });
    });

    it("doesn't move game if more acks are needed", function(done) {
      Players.insert({gameId: GAME_ID, userId: "other-user-id", alive: true});

      Meteor.call("setupAck", GAME_ID, function(error, result) {
        expect(error).toBeUndefined();
        expect(result).toBeUndefined();

        expect(WakeAcks.findOne({gameId: GAME_ID, userId: USER_ID})).toBeTruthy();
        expect(Games.findOne(GAME_ID).view).toBe("setup");
        done();
      });
    });

    it("doesn't count NO_KILL as needing to ack", function(done) {
      Players.insert({gameId: GAME_ID, userId: NO_KILL_ID, alive: true});

      Meteor.call("setupAck", GAME_ID, function(error, result) {
        expect(error).toBeUndefined();
        expect(result).toBeUndefined();

        expect(Games.findOne(GAME_ID).view).toBe("confirmWake");
        expect(WakeAcks.find({gameId: GAME_ID}).count()).toBe(0);
        done();
      });
    });
  });
});