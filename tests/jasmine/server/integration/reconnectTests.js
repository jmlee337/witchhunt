Jasmine.onTest(function() {
  describe("reconnect", function() {
    var GAME_ID = "game-id";
    var USER_ID = "user-id";

    beforeEach(function() {
      Players.insert({gameId: GAME_ID, userId: USER_ID, createdMs: 1000});
    });

    afterEach(function() {
      Players.remove({});
    })

    it("requires a Meteor user id", function(done) {
      spyOn(Meteor, "userId").and.returnValue(undefined);

      Meteor.call("reconnect", function(error, result) {
        expect(error).toBeDefined();
        expect(result).toBeUndefined();
        done();
      });
    });

    it("requires a valid Meteor user id", function(done) {
      spyOn(Meteor, "userId").and.returnValue("the-wrong-user-id");

      Meteor.call("reconnect", function(error, result) {
        expect(error).toBeDefined();
        expect(result).toBeUndefined();
        done();
      });
    });

    it("returns the gameId for the player", function(done) {
      spyOn(Meteor, "userId").and.returnValue(USER_ID);

      Meteor.call("reconnect", function(error, result) {
        expect(error).toBeUndefined();
        expect(result).toBe(GAME_ID);
        done();
      });
    });

    it("returns the gameId for the most recent player", function(done) {
      Players.insert({gameId: "the wrong game id", userId: USER_ID, createdMs: 500});
      spyOn(Meteor, "userId").and.returnValue(USER_ID);

      Meteor.call("reconnect", function(error, result) {
        expect(error).toBeUndefined();
        expect(result).toBe(GAME_ID);
        done();
      });
    });
  });
});