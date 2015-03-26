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

    it("requires a name", function() {
      expect(function() {
        Meteor.call("newGame");
      }).toThrow();
    });

    it("requires a Meteor user id", function() {
      spyOn(Meteor, "userId").and.returnValue(undefined);

      expect(function() {
        Meteor.call("newGame", NAME);
      }).toThrow();
    });

    it("inserts a new Game", function() {
      spyOn(Meteor, "userId").and.returnValue(USER_ID);
      spyOn(global, "xkcd_pw_gen").and.returnValue(GAME_ID);

      Meteor.call("newGame", NAME);
      expect(Games.findOne()).toEqual({_id: GAME_ID, userId: USER_ID, view: "lobby"});
    });

    it("inserts a new Player", function() {
      spyOn(Meteor, "userId").and.returnValue(USER_ID);
      spyOn(global, "xkcd_pw_gen").and.returnValue(GAME_ID);
      jasmine.clock().install();
      jasmine.clock().mockDate(new Date(NOW_MS));

      Meteor.call("newGame", NAME);

      expect(Players.findOne()).toEqual(jasmine.objectContaining({
        gameId: GAME_ID, userId: USER_ID, name: NAME, alive: true, votes: 0, createdMs: NOW_MS
      }));

      jasmine.clock().uninstall();
    });

    it("returns a gameId", function() {
      spyOn(Meteor, "userId").and.returnValue(USER_ID);
      spyOn(global, "xkcd_pw_gen").and.returnValue(GAME_ID);

      expect(Meteor.call("newGame", NAME)).toBe(GAME_ID);
    });
  });
});