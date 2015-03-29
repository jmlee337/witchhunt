Jasmine.onTest(function() {
  var GAME_ID = "game-id";
  var TARGET_ID = "target-id";
  var TARGET_NAME = "target-name";
  var USER_ID = "user-id";

  describe("deathRattle", function() {
    beforeEach(function() {
      spyOn(Meteor, "userId").and.returnValue(USER_ID);
      Games.insert({_id: GAME_ID, userId: USER_ID, view: "preNight"});
      Players.insert({gameId: GAME_ID, userId: USER_ID, alive: false});
      Roles.insert({gameId: GAME_ID, userId: USER_ID, role: "bod", lives: 0, secrets: {}});
      DayKills.insert({gameId: GAME_ID, userId: USER_ID, died: true});

      Players.insert({gameId: GAME_ID, userId: TARGET_ID, name: TARGET_NAME, alive: true});
      Roles.insert({gameId: GAME_ID, userId: TARGET_ID, lives: 1});
    });

    afterEach(function() {
      DayKills.remove({});
      Games.remove({});
      NightKills.remove({});
      Players.remove({});
      Roles.remove({});
    });

    it("checks role for validity", function() {
      Roles.update({gameId: GAME_ID, userId: USER_ID, lives: 0}, {$set: {role: "not dob or bod"}});

      expect(function() {
        Meteor.call("deathRattle", GAME_ID, TARGET_ID);
      }).toThrow(jasmine.objectContaining({errorType: "Meteor.Error"}));
    });

    it("requires deathRattle not to be used", function() {
      Roles.update({gameId: GAME_ID, userId: USER_ID, lives: 0}, {$set: {secrets: {used: true}}});

      expect(function() {
        Meteor.call("deathRattle", GAME_ID, TARGET_ID);
      }).toThrow(jasmine.objectContaining({errorType: "Meteor.Error"}));

      Roles.update({gameId: GAME_ID, userId: USER_ID, lives: 0}, {$set: {secrets: {used: false}}});
      expect(function() {
        Meteor.call("deathRattle", GAME_ID, TARGET_ID);
      }).not.toThrow();
    });

    it("checks that player was day killed", function() {
      DayKills.remove({gameId: GAME_ID, userId: USER_ID});

      expect(function() {
        Meteor.call("deathRattle", GAME_ID, TARGET_ID);
      }).toThrow(jasmine.objectContaining({errorType: "Meteor.Error"}));

      DayKills.insert({gameId: GAME_ID, userId: USER_ID, died: false});
      expect(function() {
        Meteor.call("deathRattle", GAME_ID, TARGET_ID);
      }).toThrow(jasmine.objectContaining({errorType: "Meteor.Error"}));

      DayKills.update({gameId: GAME_ID, userId: USER_ID}, {$set: {died: true}});
      expect(function() {
        Meteor.call("deathRattle", GAME_ID, TARGET_ID);
      }).not.toThrow();
    });

    it("checks that player was night killed", function() {
      DayKills.remove({gameId: GAME_ID, userId: USER_ID});

      expect(function() {
        Meteor.call("deathRattle", GAME_ID, TARGET_ID);
      }).toThrow(jasmine.objectContaining({errorType: "Meteor.Error"}));

      NightKills.insert({gameId: GAME_ID, userId: USER_ID, died: false});
      expect(function() {
        Meteor.call("deathRattle", GAME_ID, TARGET_ID);
      }).toThrow(jasmine.objectContaining({errorType: "Meteor.Error"}));

      NightKills.update({gameId: GAME_ID, userId: USER_ID}, {$set: {died: true}});
      expect(function() {
        Meteor.call("deathRattle", GAME_ID, TARGET_ID);
      }).not.toThrow();
    });

    it("checks validity of the game phase", function() {
      Games.update(GAME_ID, {$set: {view: "not preDay or preNight"}});

      expect(function() {
        Meteor.call("deathRattle", GAME_ID, TARGET_ID);
      }).toThrow(jasmine.objectContaining({errorType: "Meteor.Error"}));
    });

    it("requires a real player target", function() {
      expect(function() {
        Meteor.call("deathRattle", GAME_ID, NO_KILL_ID);
      }).toThrow(jasmine.objectContaining({errorType: "Meteor.Error"}));
    });

    it("sets used", function() {
      Meteor.call("deathRattle", GAME_ID, TARGET_ID);

      expect(Roles.findOne({gameId: GAME_ID, userId: USER_ID, role: "bod", lives: 0}).secrets)
          .toEqual({used: true});
    });
  });

  describe("deathRattle with day bod", function() {
    beforeEach(function() {
      spyOn(Meteor, "userId").and.returnValue(USER_ID);
      Games.insert({_id: GAME_ID, userId: USER_ID, view: "preNight"});
      Players.insert({gameId: GAME_ID, userId: USER_ID, alive: false});
      Roles.insert({gameId: GAME_ID, userId: USER_ID, role: "bod", lives: 0, secrets: {}});
      DayKills.insert({gameId: GAME_ID, userId: USER_ID, died: true});

      Players.insert({gameId: GAME_ID, userId: TARGET_ID, name: TARGET_NAME, alive: true});
      Roles.insert({gameId: GAME_ID, userId: TARGET_ID, lives: 1});
    });

    afterEach(function() {
      DayAcks.remove({});
      DayKills.remove({});
      Games.remove({});
      Players.remove({});
      Roles.remove({});
    });

    it("blesses target", function() {
      Meteor.call("deathRattle", GAME_ID, TARGET_ID);

      expect(DayKills.findOne({
          gameId: GAME_ID, userId: TARGET_ID, name: TARGET_NAME, cod: "bod"
      }).died).toBe(false);
    });

    it("clears acks", function() {
      for (var i = 0; i < 11; i++) {
        DayAcks.insert({gameId: GAME_ID, userId: "userId" + i});
      }

      Meteor.call("deathRattle", GAME_ID, TARGET_ID);

      expect(DayAcks.find({gameId: GAME_ID}).count()).toBe(0);
    });
  });

  describe("deathRattle with day dob", function() {
    beforeEach(function() {
      spyOn(Meteor, "userId").and.returnValue(USER_ID);
      Games.insert({_id: GAME_ID, userId: USER_ID, view: "preNight"});
      Players.insert({gameId: GAME_ID, userId: USER_ID, alive: false});
      Roles.insert({gameId: GAME_ID, userId: USER_ID, role: "dob", lives: 0, secrets: {}});
      DayKills.insert({gameId: GAME_ID, userId: USER_ID, died: true});

      Players.insert({gameId: GAME_ID, userId: TARGET_ID, name: TARGET_NAME, alive: true});
      Roles.insert({gameId: GAME_ID, userId: TARGET_ID, lives: 1});
    });

    afterEach(function() {
      DayAcks.remove({});
      DayKills.remove({});
      Games.remove({});
      Players.remove({});
      Roles.remove({});
    });

    it("spites target", function() {
      Meteor.call("deathRattle", GAME_ID, TARGET_ID);

      expect(DayKills.findOne({
          gameId: GAME_ID, userId: TARGET_ID, name: TARGET_NAME, cod: "dob"
      }).died).toBe(true);
    });

    it("clears acks", function() {
      for (var i = 0; i < 11; i++) {
        DayAcks.insert({gameId: GAME_ID, userId: "userId" + i});
      }

      Meteor.call("deathRattle", GAME_ID, TARGET_ID);

      expect(DayAcks.find({gameId: GAME_ID}).count()).toBe(0);
    });
  });

  describe("deathRattle with night bod", function() {
    beforeEach(function() {
      spyOn(Meteor, "userId").and.returnValue(USER_ID);
      Games.insert({_id: GAME_ID, view: "preDay"});
      Players.insert({gameId: GAME_ID, userId: USER_ID, alive: false});
      Roles.insert({gameId: GAME_ID, userId: USER_ID, role: "bod", lives: 0, secrets: {}});
      NightKills.insert({gameId: GAME_ID, userId: USER_ID, died: true});

      Players.insert({gameId: GAME_ID, userId: TARGET_ID, name: TARGET_NAME, alive: true});
      Roles.insert({gameId: GAME_ID, userId: TARGET_ID, lives: 1});
    });

    afterEach(function() {
      Games.remove({});
      NightKills.remove({});
      Players.remove({});
      Roles.remove({});
      WakeAcks.remove({});
    });

    it("blesses target", function() {
      Meteor.call("deathRattle", GAME_ID, TARGET_ID);

      expect(Roles.findOne({gameId: GAME_ID, userId: TARGET_ID}).lives).toBe(2);
      expect(Players.findOne({gameId: GAME_ID, userId: TARGET_ID, name: TARGET_NAME}).alive).toBe(true);
      expect(NightKills.findOne({
          gameId: GAME_ID, userId: TARGET_ID, name: TARGET_NAME, cod: "bod"
      }).died).toBe(false);
    });

    it("clears acks", function() {
      for (var i = 0; i < 11; i++) {
        WakeAcks.insert({gameId: GAME_ID, userId: "userId" + i});
      }

      Meteor.call("deathRattle", GAME_ID, TARGET_ID);

      expect(WakeAcks.find({gameId: GAME_ID}).count()).toBe(0);
    });
  });

  describe("deathRattle with night dob", function() {
    beforeEach(function() {
      spyOn(Meteor, "userId").and.returnValue(USER_ID);
      Games.insert({_id: GAME_ID, view: "preDay"});
      Players.insert({gameId: GAME_ID, userId: USER_ID, alive: false});
      Roles.insert({gameId: GAME_ID, userId: USER_ID, role: "dob", lives: 0, secrets: {}});
      NightKills.insert({gameId: GAME_ID, userId: USER_ID, died: true});

      Players.insert({gameId: GAME_ID, userId: TARGET_ID, name: TARGET_NAME, alive: true});
      Roles.insert({gameId: GAME_ID, userId: TARGET_ID, lives: 1});
    });

    afterEach(function() {
      Games.remove({});
      NightKills.remove({});
      Players.remove({});
      Roles.remove({});
      WakeAcks.remove({});
    });

    it("spites target", function() {
      Meteor.call("deathRattle", GAME_ID, TARGET_ID);

      expect(Roles.findOne({gameId: GAME_ID, userId: TARGET_ID}).lives).toBe(0);
      expect(Players.findOne({gameId: GAME_ID, userId: TARGET_ID, name: TARGET_NAME}).alive).toBe(false);
      expect(NightKills.findOne({
          gameId: GAME_ID, userId: TARGET_ID, name: TARGET_NAME, cod: "dob"
      }).died).toBe(true);
    });

    it("updates fanatic", function() {
      var otherId = "other-id";
      Roles.insert({gameId: GAME_ID, userId: otherId, role: "fanatic", lives: 1, secrets: {}});
      Roles.update({gameId: GAME_ID, userId: TARGET_ID}, {$set: {role: "priest"}});

      Meteor.call("deathRattle", GAME_ID, TARGET_ID);

      var fanatic = Roles.findOne({gameId: GAME_ID, userId: otherId, role: "fanatic"});
      expect(fanatic.lives).toBe(2);
      expect(fanatic.secrets.investigated).toBe(true);
    });

    it("clears acks", function() {
      for (var i = 0; i < 11; i++) {
        WakeAcks.insert({gameId: GAME_ID, userId: "userId" + i});
      }

      Meteor.call("deathRattle", GAME_ID, TARGET_ID);

      expect(WakeAcks.find({gameId: GAME_ID}).count()).toBe(0);
    });
  });
});