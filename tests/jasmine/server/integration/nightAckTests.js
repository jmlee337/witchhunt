Jasmine.onTest(function() {
  var GAME_ID = "game-id";
  var USER_ID = "user-id";

  describe("nightAck", function() {
    beforeEach(function() {
      spyOn(Meteor, "userId").and.returnValue(USER_ID);
      spyOn(Meteor, "setTimeout");
      Games.insert({_id: GAME_ID, view: "gravedigger"});
      Players.insert({gameId: GAME_ID, userId: USER_ID, alive: true});
      Roles.insert({gameId: GAME_ID, userId: USER_ID, role: "gravedigger", lives: 1, secrets: {}});
    });

    afterEach(function() {
      Games.remove({});
      Players.remove({});
      Roles.remove({});
    });

    it("checks game state for validity", function() {
      Games.update(GAME_ID, {$set: {view: "not gravedigger or priest"}});

      expect(function() {
        Meteor.call("nightAck", GAME_ID);
      }).toThrow(jasmine.objectContaining({errorType: "Meteor.Error"}));
    });
  });

  describe("nightAck for gravedigger", function() {
    beforeEach(function() {
      spyOn(Meteor, "userId").and.returnValue(USER_ID);
      spyOn(Meteor, "setTimeout");
      Games.insert({_id: GAME_ID, view: "gravedigger"});
      Players.insert({gameId: GAME_ID, userId: USER_ID, alive: true});
      Roles.insert({gameId: GAME_ID, userId: USER_ID, role: "gravedigger", lives: 1, secrets: {}});
    });

    afterEach(function() {
      Games.remove({});
      Players.remove({});
      Roles.remove({});
      Timeouts.remove({});
    });

    it("requires player to be gravedigger", function() {
      Roles.update({gameId: GAME_ID, userId: USER_ID, lives: 1}, {$set: {role: "not gravedigger"}});

      expect(function() {
        Meteor.call("nightAck", GAME_ID);
      }).toThrow(jasmine.objectContaining({errorType: "Meteor.Error"}));

      Roles.update({gameId: GAME_ID, userId: USER_ID, lives: 1}, {$set: {role: "gravedigger"}});
      expect(function() {
        Meteor.call("nightAck", GAME_ID);
      }).not.toThrow();
    });

    it("clears timeout", function() {
      Meteor.call("nightAck", GAME_ID);

      expect(Timeouts.findOne({gameId: GAME_ID, view: "gravedigger"})).toBeTruthy();
    });

    it("moves to demons", function() {
      Roles.insert({gameId: GAME_ID, userId: "whatever", alignment: "coven", lives: 0});

      Meteor.call("nightAck", GAME_ID);

      expect(Games.findOne(GAME_ID).view).toBe("demons");
    });
  });

  describe("nightAck for priest", function() {
    beforeEach(function() {
      spyOn(Meteor, "userId").and.returnValue(USER_ID);
      spyOn(Meteor, "setTimeout");
      Games.insert({_id: GAME_ID, view: "priest"});
      Players.insert({gameId: GAME_ID, userId: USER_ID, alive: true});
      Roles.insert({gameId: GAME_ID, userId: USER_ID, role: "priest", lives: 1, secrets: {}});
    });

    afterEach(function() {
      Games.remove({});
      Players.remove({});
      Roles.remove({});
      Timeouts.remove({});
    });

    it("requires player to be priest", function() {
      Roles.update({gameId: GAME_ID, userId: USER_ID, lives: 1}, {$set: {role: "not priest"}});

      expect(function() {
        Meteor.call("nightAck", GAME_ID);
      }).toThrow(jasmine.objectContaining({errorType: "Meteor.Error"}));

      Roles.update({gameId: GAME_ID, userId: USER_ID, lives: 1}, {$set: {role: "priest"}});
      expect(function() {
        Meteor.call("nightAck", GAME_ID);
      }).not.toThrow();
    });

    it("clears timeout", function() {
      Meteor.call("nightAck", GAME_ID);

      expect(Timeouts.findOne({gameId: GAME_ID, view: "priest"})).toBeTruthy();
    });

    it("moves to hunter if hunter can hunt", function() {
      var hunterId = "hunter-id";
      Roles.insert({
          gameId: GAME_ID, userId: hunterId, role: "hunter", lives: 1, secrets: {tonightWeHunt: true}
      });

      Meteor.call("nightAck", GAME_ID);

      expect(Games.findOne(GAME_ID).view).toBe("hunter");
    });

    it("moves to preDay if hunter cannot hunt", function() {
      Roles.insert({
          gameId: GAME_ID, userId: "whatever", role: "hunter", lives: 1, secrets: {tonightWeHunt: false}
      });

      Meteor.call("nightAck", GAME_ID);

      expect(Games.findOne(GAME_ID).view).toBe("preDay");
    });

    it("moves to preDay if there is no hunter", function() {
      Meteor.call("nightAck", GAME_ID);

      expect(Games.findOne(GAME_ID).view).toBe("preDay");
    });
  });
});