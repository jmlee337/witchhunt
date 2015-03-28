Jasmine.onTest(function() {
  describe("confirmSleepAck", function() {
    var GAME_ID = "game-id";
    var USER_ID = "user-id";
    var TIMEOUT_ID = 1000;
    
    beforeEach(function() {
      spyOn(Meteor, "userId").and.returnValue(USER_ID);
      spyOn(Meteor, "setTimeout").and.returnValue(TIMEOUT_ID);
      Games.insert({_id: GAME_ID, userId: USER_ID, view: "confirmSleep"});
      Players.insert({gameId: GAME_ID, userId: USER_ID, alive: true});
    });
    
    afterEach(function() {
      Games.remove({});
      Players.remove({});
      DayAcks.remove({});
      DayKills.remove({});
      NightShields.remove({});
      Roles.remove({});
      Timeouts.remove({});
    });
    
    it("requires player to be alive", function() {
      Players.update({gameId: GAME_ID, userId: USER_ID}, {$set: {alive: false}});
      
      expect(function() {
        Meteor.call("confirmSleepAck", GAME_ID);
      }).toThrow(jasmine.objectContaining({errorType: "Meteor.Error"}));
      
      Players.update({gameId: GAME_ID, userId: USER_ID}, {$set: {alive: true}});
      expect(function() {
        Meteor.call("confirmSleepAck", GAME_ID);
      }).not.toThrow();
    });
    
    it("requires player to not have successfully called confirmSleepAck", function() {
      DayAcks.insert({gameId: GAME_ID, userId: USER_ID});

      expect(function() {
        Meteor.call("confirmSleepAck", GAME_ID);
      }).toThrow(jasmine.objectContaining({errorType: "Meteor.Error"}));
    });
    
    it("moves game if no more acks are needed", function() {
      Meteor.call("confirmSleepAck", GAME_ID);
      
      expect(Games.findOne(GAME_ID).view).not.toBe("confirmSleep");
      expect(DayAcks.find({gameId: GAME_ID}).count()).toBe(0);
    });
    
    it("doesn't move game if more acks are needed", function() {
      Players.insert({gameId: GAME_ID, userId: "other-id", alive: true});
      
      Meteor.call("confirmSleepAck", GAME_ID);

      expect(Games.findOne(GAME_ID).view).toBe("confirmSleep");
      expect(DayAcks.findOne({gameId: GAME_ID, userId: USER_ID})).toBeTruthy();
    });
    
    it("doesn't count dead players as being needed", function() {
      Players.insert({gameId: GAME_ID, userId: "other-id", alive: false});
      
      Meteor.call("confirmSleepAck", GAME_ID);

      expect(Games.findOne(GAME_ID).view).not.toBe("confirmSleep");
      expect(DayAcks.find({gameId: GAME_ID}).count()).toBe(0);
    });
    
    it("doesn't count NO_KILL as being needed", function() {
      Players.insert({gameId: GAME_ID, userId: NO_KILL_ID, alive: true});
      
      Meteor.call("confirmSleepAck", GAME_ID);

      expect(Games.findOne(GAME_ID).view).not.toBe("confirmSleep");
      expect(DayAcks.find({gameId: GAME_ID}).count()).toBe(0);
    });
    
    it("clears votes when moving", function() {
      var OTHER_ID = "other-id";
      Players.update({gameId: GAME_ID, userId: USER_ID}, {$set: {votes: 1}});
      Players.insert({gameId: GAME_ID, userId: OTHER_ID, alive: true, votes: 1});
      Votes.insert({gameId: GAME_ID, userId: USER_ID, voteId: OTHER_ID});
      Votes.insert({gameId: GAME_ID, userId: OTHER_ID, voteId: USER_ID});
      DayAcks.insert({gameId: GAME_ID, userId: OTHER_ID});
      
      Meteor.call("confirmSleepAck", GAME_ID);
      
      expect(Players.findOne({gameId: GAME_ID, userId: USER_ID}).votes).toBe(0);
      expect(Players.findOne({gameId: GAME_ID, userId: OTHER_ID}).votes).toBe(0);
      expect(Votes.find({gameId: GAME_ID}).count()).toBe(0);
    });
    
    it("clears day DBs when moving", function() {
      DayKills.insert({gameId: GAME_ID, userId: "other-id", name: "some poor bloke", died: true});
      DayKills.insert({gameId: GAME_ID, userId: "other-id-2", name: "lucker", died: false});
      
      Meteor.call("confirmSleepAck", GAME_ID);
      
      expect(DayAcks.find({gameId: GAME_ID}).count()).toBe(0);
      expect(DayKills.find({gameId: GAME_ID}).count()).toBe(0);
    });
    
    it("sets up hunter when moving with survived kill", function() {
      var otherId = "other-id";
      Roles.insert({gameId: GAME_ID, userId: otherId, role: "hunter", lives: 1, secrets: {}});
      DayKills.insert({gameId: GAME_ID, userId: otherId, died: false});
      
      Meteor.call("confirmSleepAck", GAME_ID);
      
      expect(Roles.findOne({gameId: GAME_ID, userId: otherId, role: "hunter", lives: 1}).secrets)
          .toEqual({tonightWeHunt: true});
    });
    
    it("sets up hunter when moving with no survived kill", function() {
      var otherId = "other-id";
      Roles.insert({gameId: GAME_ID, userId: otherId, role: "hunter", lives: 1, secrets: {}});
      
      Meteor.call("confirmSleepAck", GAME_ID);
      
      expect(Roles.findOne({
          gameId: GAME_ID, userId: otherId, role: "hunter", lives: 1
      }).secrets.tonightWeHunt).toBeFalsy();
    });
    
    it("sets up hunter when moving with survived kill and hunter has already hunted", function() {
      var otherId = "other-id";
      Roles.insert({gameId: GAME_ID, userId: otherId, role: "hunter", lives: 1, secrets: {used: true}});
      DayKills.insert({gameId: GAME_ID, userId: otherId, died: false});
      
      Meteor.call("confirmSleepAck", GAME_ID);
      
      expect(Roles.findOne({
          gameId: GAME_ID, userId: otherId, role: "hunter", lives: 1
      }).secrets.tonightWeHunt).toBeFalsy();
    });
    
    it("sets up hunter when moving with no survived kill and hunter has already hunted", function() {
      var otherId = "other-id";
      Roles.insert({gameId: GAME_ID, userId: otherId, role: "hunter", lives: 1, secrets: {used: true}});
      
      Meteor.call("confirmSleepAck", GAME_ID);
      
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
      
      Meteor.call("confirmSleepAck", GAME_ID);
      
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
      DayKills.insert({gameId: GAME_ID, userId: masterId, died: true});
      
      Meteor.call("confirmSleepAck", GAME_ID);
      
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
      DayKills.insert({gameId: GAME_ID, userId: masterId, died: true});
      
      Meteor.call("confirmSleepAck", GAME_ID);
      
      expect(Roles.findOne({gameId: GAME_ID, userId: otherId, lives: 1}).role).toBe("gravedigger");
    });
    
    it("sets up gravedigger when moving with no deaths or targes", function() {
      var otherId = "other-id";
      Roles.insert({gameId: GAME_ID, userId: otherId, role: "gravedigger", lives: 1, secrets: {}});
      
      Meteor.call("confirmSleepAck", GAME_ID);
      
      expect(Roles.findOne({gameId: GAME_ID, userId: otherId, role: "gravedigger", lives: 1}).secrets)
          .toEqual({killedToday: 0, graves: []});
    });
    
    it("sets up gravedigger when moving with targets but no deaths", function() {
      var otherId = "other-id";
      Roles.insert({gameId: GAME_ID, userId: otherId, role: "gravedigger", lives: 1, secrets: {}});
      DayKills.insert({gameId: GAME_ID, userId: "does not matter", died: false});
      
      Meteor.call("confirmSleepAck", GAME_ID);
      
      expect(Roles.findOne({gameId: GAME_ID, userId: otherId, role: "gravedigger", lives: 1}).secrets)
          .toEqual({killedToday: 0, graves: []});
    });
    
    it("sets up gravedigger when moving with one death", function() {
      var otherId = "other-id";
      Roles.insert({gameId: GAME_ID, userId: otherId, role: "gravedigger", lives: 1, secrets: {}});
      
      var victimId = "victim-id";
      var victimName = "victim name";
      var role = "role";
      var align = "alignment"
      Roles.insert({gameId: GAME_ID, userId: victimId, role: role, alignment: align, lives: 0, secrets: {}});
      DayKills.insert({gameId: GAME_ID, userId: victimId, died: true, name: victimName});
      
      Meteor.call("confirmSleepAck", GAME_ID);
      
      expect(Roles.findOne({gameId: GAME_ID, userId: otherId, role: "gravedigger", lives: 1}).secrets)
          .toEqual({
              killedToday: 1,
              graves: [{id: victimId, name: victimName, alignment: align, role: role}]
          });
    });
    
    it("sets up gravedigger when moving with multiple deaths", function() {
      var otherId = "other-id";
      Roles.insert({gameId: GAME_ID, userId: otherId, role: "gravedigger", lives: 1, secrets: {}});
      
      var victimId = "victim-id";
      var victimName = "victim name";
      var role = "role";
      var align = "alignment"
      Roles.insert({gameId: GAME_ID, userId: victimId, role: role, alignment: align, lives: 0, secrets: {}});
      DayKills.insert({gameId: GAME_ID, userId: victimId, died: true, name: victimName});
      
      var victimId2 = "victim-id";
      var victimName2 = "victim name";
      var role2 = "role";
      var align2 = "alignment"
      Roles.insert({gameId: GAME_ID, userId: victimId2, role: role2, alignment: align2, lives: 0, secrets: {}});
      DayKills.insert({gameId: GAME_ID, userId: victimId2, died: true, name: victimName2});
      
      Meteor.call("confirmSleepAck", GAME_ID);

      expect(Roles.findOne({gameId: GAME_ID, userId: otherId, role: "gravedigger", lives: 1}).secrets)
          .toEqual({
              killedToday: 2,
              graves: [
                  {id: victimId, name: victimName, alignment: align, role: role},
                  {id: victimId2, name: victimName2, alignment: align2, role: role2}
              ]
          });
    });
    
    it("sets up gambler when moving with protection", function() {
      var otherId = "other-id";
      Roles.insert({gameId: GAME_ID, userId: otherId, role: "gambler", lives: 1, secrets: {odd: true}});
      Games.update(GAME_ID, {$set: {turn: 1}});
      
      Meteor.call("confirmSleepAck", GAME_ID);
      
      expect(NightShields.findOne({gameId: GAME_ID, userId: otherId}).shields).toBe(1);
    });
    
    it("sets up gambler when moving without protection", function() {
      var otherId = "other-id";
      Roles.insert({gameId: GAME_ID, userId: otherId, role: "gambler", lives: 1, secrets: {odd: true}});
      Games.update(GAME_ID, {$set: {turn: 2}});
      
      Meteor.call("confirmSleepAck", GAME_ID);
      
      expect(NightShields.findOne({gameId: GAME_ID, userId: otherId})).toBeFalsy();
    });
    
    it("sets up priest when moving", function() {
      var otherId = "other-id";
      Roles.insert({gameId: GAME_ID, userId: otherId, role: "priest", lives: 1, secrets: {}});
      
      Meteor.call("confirmSleepAck", GAME_ID);
      
      expect(Roles.findOne({gameId: GAME_ID, userId: otherId, role: "priest", lives: 1}).secrets)
          .toEqual({hasInvestigated: false});
    });
    
    it("sets up last stand when moving with last stand", function() {
      var otherId = "other-id";
      Roles.insert({gameId: GAME_ID, userId: otherId, alignment: "coven", lives: 1, secrets: {}});
      
      Meteor.call("confirmSleepAck", GAME_ID);
      
      expect(Roles.findOne({gameId: GAME_ID, userId: otherId, alignment: "coven", lives: 1}).secrets)
          .toEqual({lastStand: true});
    });
    
    it("sets up last stand when moving with no last stand", function() {
      var otherId = "other-id";
      var allyId = "ally-id";
      Roles.insert({gameId: GAME_ID, userId: otherId, alignment: "coven", lives: 1, secrets: {}});
      Roles.insert({gameId: GAME_ID, userId: allyId, alignment: "coven", lives: 1, secrets: {}});
      
      Meteor.call("confirmSleepAck", GAME_ID);
      
      expect(Roles.findOne({gameId: GAME_ID, userId: otherId, alignment: "coven", lives: 1}).secrets)
          .toEqual({});
      expect(Roles.findOne({gameId: GAME_ID, userId: allyId, alignment: "coven", lives: 1}).secrets)
          .toEqual({});
    });
    
    it("moves to real gravedigger if alive", function() {
      var graveId = "grave-id";
      Roles.insert({gameId: GAME_ID, userId: graveId, role: "gravedigger", lives: 1, secrets: {}});
      
      Meteor.call("confirmSleepAck", GAME_ID);
      
      expect(Games.findOne(GAME_ID).view).toBe("gravedigger");
      expect(Timeouts.findOne({gameId: GAME_ID, view: "gravedigger"}).id).toBe(TIMEOUT_ID);
    });
    
    it("moves to fake gravedigger if dead", function() {
      var graveId = "grave-id";
      Roles.insert({gameId: GAME_ID, userId: graveId, role: "gravedigger", lives: 0});
      
      Meteor.call("confirmSleepAck", GAME_ID);
      
      expect(Games.findOne(GAME_ID).view).toBe("gravedigger");
      expect(Timeouts.findOne({gameId: GAME_ID, view: "gravedigger"})).toBeFalsy();
    });
  });
});