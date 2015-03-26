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

    it("requires a Meteor user id", function() {
      spyOn(Meteor, "userId").and.returnValue(undefined);

      expect(function() {
        Meteor.call("joinGame", GAME_ID);
      }).toThrow(jasmine.objectContaining({errorType: "Meteor.Error"}));
    });

    it("requires name to add player", function() {
      spyOn(Meteor, "userId").and.returnValue(USER_ID);

      expect(function() {
        Meteor.call("joinGame", GAME_ID);
      }).toThrow(jasmine.objectContaining({errorType: "Match.Error"}));
    });

    it("requires game to be in lobby to add player", function() {
      Games.update({}, {$set: {view: "not lobby"}});
      spyOn(Meteor, "userId").and.returnValue(USER_ID);

      expect(function() {
        Meteor.call("joinGame", GAME_ID, NAME);
      }).toThrow(jasmine.objectContaining({errorType: "Meteor.Error"}));
    });

    it("adds player", function() {
      spyOn(Meteor, "userId").and.returnValue(USER_ID);
      jasmine.clock().install();
      jasmine.clock().mockDate(new Date(NOW_MS));

      Meteor.call("joinGame", GAME_ID, NAME);

      expect(Players.findOne()).toEqual(jasmine.objectContaining({
        gameId: GAME_ID, userId: USER_ID, name: NAME, alive: true, votes: 0, createdMs: NOW_MS
      }));

      jasmine.clock().uninstall();
    });

    it("reconnects if player already exists", function() {
      Players.insert({gameId: GAME_ID, userId: USER_ID});
      spyOn(Meteor, "userId").and.returnValue(USER_ID);
      spyOn(Players, "insert");

      Meteor.call("joinGame", GAME_ID);
      
      expect(Players.insert.calls.any()).toBe(false);
    });
  });
});