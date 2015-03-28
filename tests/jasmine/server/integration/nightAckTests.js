Jasmine.onTest(function() {
  var GAME_ID = "game-id";
  var TIMEOUT_ID = 1000;
  var USER_ID = "user-id";

  describe("nightAck", function() {
    beforeEach(function() {
      spyOn(Meteor, "userId").and.returnValue(USER_ID);
      spyOn(Meteor, "setTimeout").and.returnValue(TIMEOUT_ID);
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
      spyOn(Meteor, "setTimeout").and.returnValue(TIMEOUT_ID);
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
      spyOn(Meteor, "clearTimeout");
      Timeouts.insert({gameId: GAME_ID, view: "gravedigger", id: TIMEOUT_ID});

      Meteor.call("nightAck", GAME_ID);

      expect(Meteor.clearTimeout.calls.count()).toBe(1);
      expect(Meteor.clearTimeout.calls.argsFor(0)).toEqual([TIMEOUT_ID]);
    });

    it("moves to real demons if there are demons", function() {
      Roles.insert({gameId: GAME_ID, userId: "whatever", alignment: "coven", lives: 0});

      Meteor.call("nightAck", GAME_ID);

      expect(Games.findOne(GAME_ID).view).toBe("demons");
      expect(Timeouts.findOne({gameId: GAME_ID, view: "demons"}).id).toBe(TIMEOUT_ID);
    });

    it("moves to fake demons if there are no demons", function() {
      Meteor.call("nightAck", GAME_ID);

      expect(Games.findOne(GAME_ID).view).toBe("demons");
      expect(Timeouts.findOne({gameId: GAME_ID, view: "demons"})).toBeFalsy();
    });
  });

  describe("nightAck for priest", function() {
    beforeEach(function() {
      spyOn(Meteor, "userId").and.returnValue(USER_ID);
      spyOn(Meteor, "setTimeout").and.returnValue(TIMEOUT_ID);
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
      spyOn(Meteor, "clearTimeout");
      Timeouts.insert({gameId: GAME_ID, view: "priest", id: TIMEOUT_ID});

      Meteor.call("nightAck", GAME_ID);

      expect(Meteor.clearTimeout.calls.count()).toBe(1);
      expect(Meteor.clearTimeout.calls.argsFor(0)).toEqual([TIMEOUT_ID]);
    });

    it("moves to real hunter if hunter can hunt and is alive", function() {
      var hunterId = "hunter-id";
      Roles.insert({
          gameId: GAME_ID, userId: hunterId, role: "hunter", lives: 1, secrets: {tonightWeHunt: true}
      });

      Meteor.call("nightAck", GAME_ID);

      expect(Games.findOne(GAME_ID).view).toBe("hunter");
      expect(Timeouts.findOne({gameId: GAME_ID, view: "hunter"}).id).toBe(TIMEOUT_ID);
    });

    it("moves to fake hunter if hunter can hunt and is dead", function() {
      var hunterId = "hunter-id";
      Roles.insert({
          gameId: GAME_ID, userId: hunterId, role: "hunter", lives: 0, secrets: {tonightWeHunt: true}
      });

      Meteor.call("nightAck", GAME_ID);

      expect(Games.findOne(GAME_ID).view).toBe("hunter");
      expect(Timeouts.findOne({gameId: GAME_ID, view: "hunter"})).toBeFalsy();
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