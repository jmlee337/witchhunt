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

    it("requires a Meteor user id", function() {
      spyOn(Meteor, "userId").and.returnValue(undefined);

      expect(function() {
        Meteor.call("reconnect");
      }).toThrow();
    });

    it("requires a valid Meteor user id", function() {
      spyOn(Meteor, "userId").and.returnValue("the-wrong-user-id");

      expect(function() {
        Meteor.call("reconnect");
      }).toThrow();
    });

    it("returns the gameId for the player", function() {
      spyOn(Meteor, "userId").and.returnValue(USER_ID);

      expect(Meteor.call("reconnect")).toBe(GAME_ID);
    });

    it("returns the gameId for the most recent player", function() {
      Players.insert({gameId: "the wrong game id", userId: USER_ID, createdMs: 500});
      spyOn(Meteor, "userId").and.returnValue(USER_ID);

      expect(Meteor.call("reconnect")).toBe(GAME_ID);
    });
  });
});