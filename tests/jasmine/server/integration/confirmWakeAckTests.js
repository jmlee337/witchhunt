Jasmine.onTest(function() {
  describe("confirmWakeAck", function() {
    var GAME_ID = "game-id";
    var USER_ID = "user-id";
    var TIMEOUT_ID = 1000;

    beforeEach(function() {
      spyOn(Meteor, "userId").and.returnValue(USER_ID);
      spyOn(Meteor, "setTimeout").and.returnValue(TIMEOUT_ID);
      Games.insert({_id: GAME_ID, userId: USER_ID, view: "confirmWake"});
      Players.insert({gameId: GAME_ID, userId: USER_ID, alive: true});
    });

    afterEach(function() {
      Games.remove({});
      Players.remove({});
      NightCurse.remove({});
      NightKills.remove({});
      NightShields.remove({});
      NightTargets.remove({});
      Roles.remove({});
      Timeouts.remove({});
      WakeAcks.remove({});
    });

    it("requires player to be alive", function() {
      Players.update({gameId: GAME_ID, userId: USER_ID}, {$set: {alive: false}});

      expect(function() {
        Meteor.call("confirmWakeAck", GAME_ID);
      }).toThrow(jasmine.objectContaining({errorType: "Meteor.Error"}));

      Players.update({gameId: GAME_ID, userId: USER_ID}, {$set: {alive: true}});
      expect(function() {
        Meteor.call("confirmWakeAck", GAME_ID);
      }).not.toThrow();
    });

    it("requires player to not have successfully called confirmWakeAck", function() {
      WakeAcks.insert({gameId: GAME_ID, userId: USER_ID});

      expect(function() {
        Meteor.call("confirmWakeAck", GAME_ID);
      }).toThrow(jasmine.objectContaining({errorType: "Meteor.Error"}));
    });

    it("moves game if no more acks are needed", function() {
      Meteor.call("confirmWakeAck", GAME_ID);

      expect(Games.findOne(GAME_ID).view).not.toBe("confirmWake");
      expect(WakeAcks.find({gameId: GAME_ID}).count()).toBe(0);
    });

    it("doesn't move game if more acks are needed", function() {
      Players.insert({gameId: GAME_ID, userId: "other-id", alive: true});

      Meteor.call("confirmWakeAck", GAME_ID);

      expect(Games.findOne(GAME_ID).view).toBe("confirmWake");
      expect(WakeAcks.findOne({gameId: GAME_ID, userId: USER_ID})).toBeTruthy();
    });

    it("doesn't count dead players as being needed", function() {
      Players.insert({gameId: GAME_ID, userId: "other-id", alive: false});

      Meteor.call("confirmWakeAck", GAME_ID);

      expect(Games.findOne(GAME_ID).view).not.toBe("confirmWake");
      expect(WakeAcks.find({gameId: GAME_ID}).count()).toBe(0);
    });

    it("doesn't count NO_KILL as being needed", function() {
      Players.insert({gameId: GAME_ID, userId: NO_KILL_ID, alive: true});

      Meteor.call("confirmWakeAck", GAME_ID);

      expect(Games.findOne(GAME_ID).view).not.toBe("confirmWake");
      expect(WakeAcks.find({gameId: GAME_ID}).count()).toBe(0);
    });

    it("clears votes when moving", function() {
      var OTHER_ID = "other-id";
      Players.update({gameId: GAME_ID, userId: USER_ID}, {$set: {votes: 1}});
      Players.insert({gameId: GAME_ID, userId: OTHER_ID, alive: true, votes: 1});
      Votes.insert({gameId: GAME_ID, userId: USER_ID, voteId: OTHER_ID});
      Votes.insert({gameId: GAME_ID, userId: OTHER_ID, voteId: USER_ID});
      WakeAcks.insert({gameId: GAME_ID, userId: OTHER_ID});

      Meteor.call("confirmWakeAck", GAME_ID);

      expect(Players.findOne({gameId: GAME_ID, userId: USER_ID}).votes).toBe(0);
      expect(Players.findOne({gameId: GAME_ID, userId: OTHER_ID}).votes).toBe(0);
      expect(Votes.find({gameId: GAME_ID}).count()).toBe(0);
    });

    it("clears night DBs when moving", function() {
      NightCurse.insert({gameId: GAME_ID, userId: "who cares"});
      NightKills.insert({gameId: GAME_ID, userId: "whatever", died: true});
      NightShields.insert({gameId: GAME_ID, userId: "lucky guy", shields: 1});
      NightTargets.insert({gameId: GAME_ID, userId: "whatever", died: true});

      Meteor.call("confirmWakeAck", GAME_ID);

      expect(NightCurse.find({gameId: GAME_ID}).count()).toBe(0);
      expect(NightKills.find({gameId: GAME_ID}).count()).toBe(0);
      expect(NightShields.find({gameId: GAME_ID}).count()).toBe(0);
      expect(NightTargets.find({gameId: GAME_ID}).count()).toBe(0);
      expect(WakeAcks.find({gameId: GAME_ID}).count()).toBe(0);
    });

    it("sets up hunter when moving with survived kill", function() {
      var otherId = "other-id";
      Roles.insert({gameId: GAME_ID, userId: otherId, role: "hunter", lives: 1, secrets: {}});
      NightKills.insert({gameId: GAME_ID, userId: otherId, died: false});

      Meteor.call("confirmWakeAck", GAME_ID);

      expect(Roles.findOne({gameId: GAME_ID, userId: otherId, role: "hunter", lives: 1}).secrets)
          .toEqual({tonightWeHunt: true});
    });

    it("sets up hunter when moving with no survived kill", function() {
      var otherId = "other-id";
      Roles.insert({gameId: GAME_ID, userId: otherId, role: "hunter", lives: 1, secrets: {}});

      Meteor.call("confirmWakeAck", GAME_ID);

      expect(Roles.findOne({
          gameId: GAME_ID, userId: otherId, role: "hunter", lives: 1
      }).secrets.tonightWeHunt).toBeFalsy();
    });

    it("sets up hunter when moving with survived kill and hunter has already hunted", function() {
      var otherId = "other-id";
      Roles.insert({gameId: GAME_ID, userId: otherId, role: "hunter", lives: 1, secrets: {used: true}});
      NightKills.insert({gameId: GAME_ID, userId: otherId, died: false});

      Meteor.call("confirmWakeAck", GAME_ID);

      expect(Roles.findOne({
          gameId: GAME_ID, userId: otherId, role: "hunter", lives: 1
      }).secrets.tonightWeHunt).toBeFalsy();
    });

    it("sets up hunter when moving with no survived kill and hunter has already hunted", function() {
      var otherId = "other-id";
      Roles.insert({gameId: GAME_ID, userId: otherId, role: "hunter", lives: 1, secrets: {used: true}});

      Meteor.call("confirmWakeAck", GAME_ID);

      expect(Roles.findOne({
          gameId: GAME_ID, userId: otherId, role: "hunter", lives: 1
      }).secrets.tonightWeHunt).toBeFalsy();
    });

    it("sets up apprentice when moving with no succession", function() {
      var masterId = "master-id";
      var otherId = "other-id";
      Roles.insert({
          gameId: GAME_ID,
          userId: otherId,
          role: "apprentice",
          lives: 1,
          secrets: {master: {id: masterId, role: "judge"}}
      });

      Meteor.call("confirmWakeAck", GAME_ID);

      expect(Roles.findOne({gameId: GAME_ID, userId: otherId, lives: 1}).role).toBe("apprentice");
    });

    it("sets up apprentice when moving with succession to judge", function() {
      var masterId = "master-id";
      var otherId = "other-id";
      Roles.insert({
          gameId: GAME_ID,
          userId: otherId,
          role: "apprentice",
          lives: 1,
          secrets: {master: {id: masterId, role: "judge"}}
      });
      NightKills.insert({gameId: GAME_ID, userId: masterId, died: true});

      Meteor.call("confirmWakeAck", GAME_ID);

      expect(Roles.findOne({gameId: GAME_ID, userId: otherId, lives: 1}).role).toBe("judge");
    });

    it("sets up apprentice when moving with succession to gravedigger", function() {
      var masterId = "master-id";
      var otherId = "other-id";
      Roles.insert({
          gameId: GAME_ID,
          userId: otherId,
          role: "apprentice",
          lives: 1,
          secrets: {master: {id: masterId, role: "gravedigger"}}
      });
      Roles.insert({gameId: GAME_ID, userId: masterId, role: "gravedigger", lives: 0, secrets: {}});
      NightKills.insert({gameId: GAME_ID, userId: masterId, died: true});

      Meteor.call("confirmWakeAck", GAME_ID);

      expect(Roles.findOne({gameId: GAME_ID, userId: otherId, lives: 1}).role).toBe("gravedigger");
    });

    it("moves to day", function() {
      Meteor.call("confirmWakeAck", GAME_ID);

      expect(Games.findOne(GAME_ID).view).toBe("day");
      expect(Timeouts.findOne({gameId: GAME_ID, view: "day"}).id).toBe(TIMEOUT_ID);
    });
  });
});