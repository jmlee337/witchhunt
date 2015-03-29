Jasmine.onTest(function() {
  describe("startGame", function() {
    var GAME_ID = "game-id";
    var NAME = "name";
    var USER_ID = "user-id";

    var addPlayers = function(n) {
      for(var i = 0; i < n; i++) {
        Players.insert({gameId: GAME_ID, userId: "user-id" + i, name: "name" + i});
      }
    };

    var verifyRoles = function(n) {
      var userIdSet = new Set();
      var alignCounts = {town: 0, coven: 0};
      switch (n) {
        case 12:
          var bod = Roles.findOne({gameId: GAME_ID, role: "bod", lives: 1});
          expect(bod).toBeDefined();
          expect(bod.userId).toBeDefined();
          expect(Players.findOne({gameId: GAME_ID, userId: bod.userId})).toBeTruthy();
          userIdSet.add(bod.userId);
          expect(bod.secrets).toEqual({});
          alignCounts[bod.alignment]++;
        case 11:
          var hunter = Roles.findOne({gameId: GAME_ID, role: "hunter", lives: 1});
          expect(hunter).toBeDefined();
          expect(hunter.userId).toBeDefined();
          expect(Players.findOne({gameId: GAME_ID, userId: hunter.userId})).toBeTruthy();
          userIdSet.add(hunter.userId);
          expect(hunter.secrets).toEqual({});
          alignCounts[hunter.alignment]++;
        case 10:
          var oracle = Roles.findOne({gameId: GAME_ID, role: "oracle", lives: 1});
          expect(oracle).toBeDefined();
          expect(oracle.userId).toBeDefined();
          expect(Players.findOne({gameId: GAME_ID, userId: oracle.userId})).toBeTruthy();
          userIdSet.add(oracle.userId);
          expect(oracle.secrets).toEqual({});
          alignCounts[oracle.alignment]++;
        case 9:
          var peepingTom = Roles.findOne({gameId: GAME_ID, role: "peepingTom", lives: 1});
          expect(peepingTom).toBeDefined();
          expect(peepingTom.userId).toBeDefined();
          expect(Players.findOne({gameId: GAME_ID, userId: peepingTom.userId})).toBeTruthy();
          userIdSet.add(peepingTom.userId);
          expect(peepingTom.secrets).toBeDefined();
          expect(peepingTom.secrets.innocent).toBeDefined();
          expect(peepingTom.secrets.innocent.id).toBeDefined();
          var innocentId = peepingTom.secrets.innocent.id;
          expect(Roles.findOne({gameId: GAME_ID, userId: innocentId}).alignment).toBe("town");
          expect(Players.findOne({gameId: GAME_ID, userId: innocentId}).name).toBe(peepingTom.secrets.innocent.name);
          alignCounts[peepingTom.alignment]++;
        case 8:
          var fanatic = Roles.findOne({gameId: GAME_ID, role: "fanatic", lives: 1});
          expect(fanatic).toBeDefined();
          expect(fanatic.userId).toBeDefined();
          expect(Players.findOne({gameId: GAME_ID, userId: fanatic.userId})).toBeTruthy();
          userIdSet.add(fanatic.userId);
          expect(fanatic.secrets).toEqual({});
          alignCounts[fanatic.alignment]++;
        case 7:
          var priest = Roles.findOne({gameId: GAME_ID, role: "priest", lives: 1, alignment: "holy"});
          expect(priest).toBeDefined();
          expect(priest.userId).toBeDefined();
          expect(Players.findOne({gameId: GAME_ID, userId: priest.userId})).toBeTruthy();
          userIdSet.add(priest.userId);
          expect(priest.secrets).toEqual({investigations: []});

          var judge = Roles.findOne({gameId: GAME_ID, role: "judge", lives: 1});
          expect(judge).toBeDefined();
          expect(judge.userId).toBeDefined();
          expect(Players.findOne({gameId: GAME_ID, userId: judge.userId})).toBeTruthy();
          userIdSet.add(judge.userId);
          expect(judge.secrets).toEqual({});
          alignCounts[judge.alignment]++;

          var gravedigger = Roles.findOne({gameId: GAME_ID, role: "gravedigger", lives: 1});
          expect(gravedigger).toBeDefined();
          expect(gravedigger.userId).toBeDefined();
          expect(Players.findOne({gameId: GAME_ID, userId: gravedigger.userId})).toBeTruthy();
          userIdSet.add(gravedigger.userId);
          expect(gravedigger.secrets).toEqual({});
          alignCounts[gravedigger.alignment]++;

          var apprentice = Roles.findOne({gameId: GAME_ID, role: "apprentice", lives: 1});
          expect(apprentice).toBeDefined();
          expect(apprentice.userId).toBeDefined();
          expect(Players.findOne({gameId: GAME_ID, userId: apprentice.userId})).toBeTruthy();
          userIdSet.add(apprentice.userId);
          expect(apprentice.secrets).toEqual({});
          alignCounts[apprentice.alignment]++;

          var survivalist = Roles.findOne({gameId: GAME_ID, role: "survivalist", lives: 2});
          expect(survivalist).toBeDefined();
          expect(survivalist.userId).toBeDefined();
          expect(Players.findOne({gameId: GAME_ID, userId: survivalist.userId})).toBeTruthy();
          userIdSet.add(survivalist.userId);
          expect(survivalist.secrets).toEqual({});
          alignCounts[survivalist.alignment]++;

          var dob = Roles.findOne({gameId: GAME_ID, role: "dob", lives: 1});
          expect(dob).toBeDefined();
          expect(dob.userId).toBeDefined();
          expect(Players.findOne({gameId: GAME_ID, userId: dob.userId})).toBeTruthy();
          userIdSet.add(dob.userId);
          expect(dob.secrets).toEqual({});
          alignCounts[dob.alignment]++;

          var gambler = Roles.findOne({gameId: GAME_ID, role: "gambler", lives: 1});
          expect(gambler).toBeDefined();
          expect(gambler.userId).toBeDefined();
          expect(Players.findOne({gameId: GAME_ID, userId: gambler.userId})).toBeTruthy();
          userIdSet.add(gambler.userId);
          expect(gambler.secrets).toEqual({});
          alignCounts[gambler.alignment]++;
          break;
        default:
          fail();
      }
      expect(userIdSet.size).toBe(n);
      switch (n) {
        case 7:
          expect(alignCounts.coven).toBe(2);
          expect(alignCounts.town).toBe(4);
          break;
        case 8:
          expect(alignCounts.coven).toBe(2);
          expect(alignCounts.town).toBe(5);
          break;
        case 9:
          expect(alignCounts.coven).toBe(3);
          expect(alignCounts.town).toBe(5);
          break;
        case 10:
          expect(alignCounts.coven).toBe(3);
          expect(alignCounts.town).toBe(6);
          break;
        case 11:
          expect(alignCounts.coven).toBe(3);
          expect(alignCounts.town).toBe(7);
          break;
        case 12:
          expect(alignCounts.coven).toBe(3);
          expect(alignCounts.town).toBe(8);
          break;
        default:
          fail();
      }
    };

    beforeEach(function() {
      spyOn(Meteor, "userId").and.returnValue(USER_ID);
      Games.insert({_id: GAME_ID, userId: USER_ID, view: "lobby"});
      Players.insert({gameId: GAME_ID, userId: USER_ID, name: NAME});
    });

    afterEach(function() {
      Games.remove({});
      Players.remove({});
      Roles.remove({});
    });

    it("requires player to be owner of the game", function() {
      addPlayers(6); // 7 total

      Games.update({}, {$set: {userId: "not the right userId"}});

      expect(function() {
        Meteor.call("startGame", GAME_ID);
      }).toThrow(jasmine.objectContaining({errorType: "Meteor.Error"}));

      Games.update({}, {$set: {userId: USER_ID}});
      expect(function() {
        Meteor.call("startGame", GAME_ID);
      }).not.toThrow();
    });

    it("requires at least 7 players", function() {
      addPlayers(5); // 6 total

      expect(function() {
        Meteor.call("startGame", GAME_ID);
      }).toThrow(jasmine.objectContaining({errorType: "Meteor.Error"}));
    });

    it("requires at most 12 players", function() {
      addPlayers(12); // 13 total

      expect(function() {
        Meteor.call("startGame", GAME_ID);
      }).toThrow(jasmine.objectContaining({errorType: "Meteor.Error"}));
    });

    it("inserts NO_KILL player", function() {
      addPlayers(6); // 7 total

      Meteor.call("startGame", GAME_ID);

      expect(Players.findOne({gameId: GAME_ID, userId: NO_KILL_ID, name: NO_KILL_STRING})).toBeTruthy();
    });

    it("moves game to setup", function() {
      addPlayers(6); // 7 total

      Meteor.call("startGame", GAME_ID);

      expect(Games.findOne().view).toBe("setup");
    });

    it("gives correct roles for 7 players", function() {
      addPlayers(6) // 7 total

      Meteor.call("startGame", GAME_ID);

      verifyRoles(7);
    });

    it("gives correct roles for 8 players", function() {
      addPlayers(7) // 8 total

      Meteor.call("startGame", GAME_ID);

      verifyRoles(8);
    });

    it("gives correct roles for 9 players", function() {
      addPlayers(8) // 9 total

      Meteor.call("startGame", GAME_ID);

      verifyRoles(9);
    });

    it("gives correct roles for 10 players", function() {
      addPlayers(9) // 10 total

      Meteor.call("startGame", GAME_ID);

      verifyRoles(10);
    });

    it("gives correct roles for 11 players", function() {
      addPlayers(10) // 11 total

      Meteor.call("startGame", GAME_ID);

      verifyRoles(11);
    });

    it("gives correct roles for 12 players", function() {
      addPlayers(11) // 12 total

      Meteor.call("startGame", GAME_ID);

      verifyRoles(12);
    });
  });
});