Jasmine.onTest(function() {
  describe("clearVote", function() {
    var GAME_ID = "game-id";
    var USER_ID = "user-id";

    beforeEach(function() {
      spyOn(Meteor, "userId").and.returnValue(USER_ID);
      Players.insert({gameId: GAME_ID, userId: USER_ID});
    });

    afterEach(function() {
      Games.remove({});
      Players.remove({});
      Roles.remove({});
      Votes.remove({});
    });

    it("requires player to be alive if called during day", function() {
      Games.insert({_id: GAME_ID, view: "day"});
      Roles.insert({gameId: GAME_ID, userId: USER_ID, lives: 0});

      expect(function() {
        Meteor.call("clearVote", GAME_ID);
      }).toThrow(jasmine.objectContaining({errorType: "Meteor.Error"}));

      Roles.update({gameId: GAME_ID, userId: USER_ID}, {$set: {lives: 1}});
      expect(function() {
        Meteor.call("clearVote", GAME_ID);
      }).not.toThrow();
    });

    it("requires player to be live coven if called during coven", function() {
      Games.insert({_id: GAME_ID, view: "coven"});
      Roles.insert({gameId: GAME_ID, userId: USER_ID, lives: 0, alignment: "town"});

      expect(function() {
        Meteor.call("clearVote", GAME_ID);
      }).toThrow(jasmine.objectContaining({errorType: "Meteor.Error"}));

      Roles.update({gameId: GAME_ID, userId: USER_ID}, {$set: {lives: 1}});
      expect(function() {
        Meteor.call("clearVote", GAME_ID);
      }).toThrow(jasmine.objectContaining({errorType: "Meteor.Error"}));

      Roles.update({gameId: GAME_ID, userId: USER_ID}, {$set: {alignment: "coven"}});
      expect(function() {
        Meteor.call("clearVote", GAME_ID);
      }).not.toThrow();
    });

    it("requires player to be dead coven if called during demons", function() {
      Games.insert({_id: GAME_ID, view: "demons"});
      Roles.insert({gameId: GAME_ID, userId: USER_ID, lives: 1, alignment: "town"});

      expect(function() {
        Meteor.call("clearVote", GAME_ID);
      }).toThrow(jasmine.objectContaining({errorType: "Meteor.Error"}));

      Roles.update({gameId: GAME_ID, userId: USER_ID}, {$set: {lives: 0}});
      expect(function() {
        Meteor.call("clearVote", GAME_ID);
      }).toThrow(jasmine.objectContaining({errorType: "Meteor.Error"}));

      Roles.update({gameId: GAME_ID, userId: USER_ID}, {$set: {alignment: "coven"}});
      expect(function() {
        Meteor.call("clearVote", GAME_ID);
      }).not.toThrow();
    });

    it("requires player to be dead village if called during angels", function() {
      Games.insert({_id: GAME_ID, view: "angels"});
      Roles.insert({gameId: GAME_ID, userId: USER_ID, lives: 1, alignment: "coven"});

      expect(function() {
        Meteor.call("clearVote", GAME_ID);
      }).toThrow(jasmine.objectContaining({errorType: "Meteor.Error"}));

      Roles.update({gameId: GAME_ID, userId: USER_ID}, {$set: {lives: 0}});
      expect(function() {
        Meteor.call("clearVote", GAME_ID);
      }).toThrow(jasmine.objectContaining({errorType: "Meteor.Error"}));

      Roles.update({gameId: GAME_ID, userId: USER_ID}, {$set: {alignment: "town"}});
      expect(function() {
        Meteor.call("clearVote", GAME_ID);
      }).not.toThrow();

      Roles.update({gameId: GAME_ID, userId: USER_ID}, {$set: {alignment: "holy"}});
      expect(function() {
        Meteor.call("clearVote", GAME_ID);
      }).not.toThrow();
    });

    it("checks for a valid state", function() {
      Games.insert({_id: GAME_ID, view: "not a valid state"});

      expect(function() {
        Meteor.call("clearVote", GAME_ID);
      }).toThrow(jasmine.objectContaining({errorType: "Meteor.Error"}));
    });

    it("doesn't do anything if there's no vote to clear", function() {
      spyOn(Players, "update");
      spyOn(Votes, "remove");
      Games.insert({_id: GAME_ID, view: "day"});
      Roles.insert({gameId: GAME_ID, userId: USER_ID, lives: 1});

      Meteor.call("clearVote", GAME_ID);

      expect(Players.update.calls.any()).toBe(false);
      expect(Votes.remove.calls.any()).toBe(false);
    });

    it("clears vote", function() {
      var TARGET_ID = "target_id";
      Players.insert({gameId: GAME_ID, userId: TARGET_ID, votes: 1});
      Votes.insert({gameId: GAME_ID, userId: USER_ID, voteId: TARGET_ID});
      Games.insert({_id: GAME_ID, view: "day"});
      Roles.insert({gameId: GAME_ID, userId: USER_ID, lives: 1});

      Meteor.call("clearVote", GAME_ID);

      expect(Votes.findOne({gameId: GAME_ID, userId: USER_ID})).toBeFalsy();
      expect(Players.findOne({gameId: GAME_ID, userId: TARGET_ID}).votes).toBe(0);
    });

    it("can be called twice safely", function() {
      var TARGET_ID = "target_id";
      Players.insert({gameId: GAME_ID, userId: TARGET_ID, votes: 1});
      Votes.insert({gameId: GAME_ID, userId: USER_ID, voteId: TARGET_ID});
      Games.insert({_id: GAME_ID, view: "day"});
      Roles.insert({gameId: GAME_ID, userId: USER_ID, lives: 1});

      Meteor.call("clearVote", GAME_ID);

      expect(Votes.findOne({gameId: GAME_ID, userId: USER_ID})).toBeFalsy();
      expect(Players.findOne({gameId: GAME_ID, userId: TARGET_ID}).votes).toBe(0);

      Meteor.call("clearVote", GAME_ID);

      expect(Votes.findOne({gameId: GAME_ID, userId: USER_ID})).toBeFalsy();
      expect(Players.findOne({gameId: GAME_ID, userId: TARGET_ID}).votes).toBe(0);
    });
  });
});