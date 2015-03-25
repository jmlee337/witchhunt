Jasmine.onTest(function() {
  describe("joinGame", function() {
    var GAME_ID = "game-id";
    var NAME = "name";
    var NOW_MS = 10000;
    var USER_ID = "user-id";

    beforeEach(function() {
      Games.insert({_id: GAME_ID, userId: "owner-user-id", view: "lobby"});
    });

    afterEach(function() {
      Games.remove({});
      Players.remove({});
    });

    it("requires a gameId", function(done) {
      Meteor.call("joinGame", function(error, result) {
        expect(error).toBeDefined();
        done();
      });
    });

    it("requires a Meteor user id", function(done) {
      spyOn(Meteor, "userId").and.returnValue(undefined);

      Meteor.call("joinGame", GAME_ID, function(error, result) {
        expect(error).toBeDefined();
        done();
      })
    });

    it("requires a valid gameId", function(done) {
      spyOn(Meteor, "userId").and.returnValue(USER_ID);

      Meteor.call("joinGame", "not a valid gameId", function(error, result) {
        expect(error).toBeDefined();
        done();
      });
    });

    it("requires name to add player", function(done) {
      spyOn(Meteor, "userId").and.returnValue(USER_ID);

      Meteor.call("joinGame", GAME_ID, function(error, result) {
        expect(error).toBeDefined();
        done();
      });
    });

    it("requires game to be in lobby to add player", function(done) {
      Games.update({}, {$set: {view: "not lobby"}});
      spyOn(Meteor, "userId").and.returnValue(USER_ID);

      Meteor.call("joinGame", GAME_ID, NAME, function(error, result) {
        expect(error).toBeDefined();
        done();
      });
    });

    it("adds player", function(done) {
      spyOn(Meteor, "userId").and.returnValue(USER_ID);
      jasmine.clock().install();
      jasmine.clock().mockDate(new Date(NOW_MS));

      Meteor.call("joinGame", GAME_ID, NAME, function(error, result) {
        expect(error).toBeUndefined();
        expect(result).toBeUndefined();

        expect(Players.findOne()).toEqual(jasmine.objectContaining({
          gameId: GAME_ID, userId: USER_ID, name: NAME, alive: true, votes: 0, createdMs: NOW_MS
        }));

        jasmine.clock().uninstall();
        done();
      });
    });

    it("reconnects if player already exists", function(done) {
      Players.insert({gameId: GAME_ID, userId: USER_ID});
      spyOn(Meteor, "userId").and.returnValue(USER_ID);
      spyOn(Players, "insert");

      Meteor.call("joinGame", GAME_ID, function(error, result) {
        expect(error).toBeUndefined();
        expect(result).toBeUndefined();
        expect(Players.insert.calls.any()).toBe(false);
        done();
      });
    });
  });
});