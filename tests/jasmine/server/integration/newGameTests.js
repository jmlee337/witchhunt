Jasmine.onTest(function() {
  describe("newGame", function() {
    var GAME_ID = "game id string";
    var NAME = "name";
    var NOW_MS = 1000000;
    var USER_ID = "user-id";

    afterEach(function() {
      Games.remove({});
      Players.remove({});
    });

    it("requires a name", function(done) {
      Meteor.call("newGame", function(error, result) {
        expect(error).toBeDefined();
        expect(result).toBeUndefined();
        done();
      });
    });

    it("requires a Meteor user id", function(done) {
      spyOn(Meteor, "userId").and.returnValue(undefined);

      Meteor.call("newGame", NAME, function(error, result) {
        expect(error).toBeDefined();
        expect(result).toBeUndefined();
        done();
      });
    });

    it("inserts a new Game", function(done) {
      spyOn(Meteor, "userId").and.returnValue(USER_ID);
      spyOn(global, "xkcd_pw_gen").and.returnValue(GAME_ID);

      Meteor.call("newGame", NAME, function(error, result) {
        expect(error).toBeUndefined();
        expect(Games.findOne()).toEqual({_id: GAME_ID, userId: USER_ID, view: "lobby"});
        done();
      });
    });

    it("inserts a new Player", function(done) {
      spyOn(Meteor, "userId").and.returnValue(USER_ID);
      spyOn(global, "xkcd_pw_gen").and.returnValue(GAME_ID);
      jasmine.clock().install();
      jasmine.clock().mockDate(new Date(NOW_MS));

      Meteor.call("newGame", NAME, function(error, result) {
        expect(error).toBeUndefined();

        expect(Players.findOne()).toEqual(jasmine.objectContaining({
          gameId: GAME_ID, userId: USER_ID, name: NAME, alive: true, votes: 0, createdMs: NOW_MS
        }));

        jasmine.clock().uninstall();
        done();
      });
    });

    it("returns a gameId", function(done) {
      spyOn(Meteor, "userId").and.returnValue(USER_ID);
      spyOn(global, "xkcd_pw_gen").and.returnValue(GAME_ID);

      Meteor.call("newGame", NAME, function(error, result) {
        expect(error).toBeUndefined();
        expect(result).toBe(GAME_ID);
        done();
      });
    });
  });
});