// Gravedigger
Template.gravedigger.onRendered(function() {
  speak("gravedigger wake up");
});

Template.gravedigger.helpers({
  isGravedigger: function() {
    var role = Roles.findOne({userId: Meteor.userId(), role: "gravedigger"});
    return role && role.lives > 0;
  },

  killedToday: function() {
    var role = Roles.findOne({userId: Meteor.userId()});
    if (role.role === "gravedigger") {
      var arr = [];
      role.secrets.graves.slice(-role.secrets.killedToday).forEach(function(killed) {
        arr.push({
            name: killed.name,
            roleTitle: roleTitle(killed.role),
            roleDesc: roleDesc(killed.role),
            alignTitle: alignmentTitle(killed.alignment),
            alignDesc: alignmentDesc(killed.alignment)
        });
      });
      return arr;
    }
  },

  timeRemaining: function() {
    return moment(Games.findOne().dayEndMs - TimeSync.serverTime()).format("mm:ss");
  }
});

Template.gravedigger.events({
  'click .button': function() {
    Meteor.call('nightAck', GameId, standardCallback);
  }
});

Template.gravedigger.onDestroyed(function() {
  speak("gravedigger go to sleep");
});

// Demons
Template.demons.onRendered(function() {
  speak("demons wake up");
});

Template.demons.helpers({
  isDemon: function() {
    var role = Roles.findOne({userId: Meteor.userId()});
    return role.alignment === "coven" && role.lives < 1;
  },

  players: function() {
    return Players.find({alive: true}, {sort: [["votes", "desc"],["name", "asc"]]});
  },

  timeRemaining: function() {
    return moment(Games.findOne().dayEndMs - TimeSync.serverTime()).format("mm:ss");
  }
});

Template.demons.events({
  'change .demonsVote': function(event) {
    var userId = event.target.value;
    if (userId === "_none") {
      Meteor.call('clearVote', GameId, standardCallback);
    } else {
      Meteor.call('demonVote', GameId, userId, standardCallback);
    }
  }
});

Template.demons.onDestroyed(function() {
  speak("demons go to sleep");
});

// Angels
Template.angels.onRendered(function() {
  speak("angels wake up");
});

Template.angels.helpers({
  isAngel: function() {
    var role = Roles.findOne({userId: Meteor.userId()});
    return (role.alignment === "town" || role.alignment === "holy") && role.lives < 1;
  },

  players: function() {
    var cursedUser = NightCurse.findOne();
    if (cursedUser) {
      return Players.find({
          alive: true,
          userId: {$ne: cursedUser.userId}},
          {sort: [["votes", "desc"],["name", "asc"]]
      });
    }
    return Players.find({alive: true}, {sort: [["votes", "desc"],["name", "asc"]]});
  },

  timeRemaining: function() {
    return moment(Games.findOne().dayEndMs - TimeSync.serverTime()).format("mm:ss");
  }
});

Template.angels.events({
  'change .angelsVote': function(event) {
    var userId = event.target.value;
    if (userId === "_none") {
      Meteor.call('clearVote', GameId, standardCallback);
    } else {
      Meteor.call('angelVote', GameId, userId, standardCallback);
    }
  }
});

Template.angels.onDestroyed(function() {
  speak("angels go to sleep");
});

// Coven
Template.coven.onRendered(function() {
  speak("witches wake up");
});

Template.coven.helpers({
  isCoven: function() {
    var role = Roles.findOne({userId: Meteor.userId()});
    return role.alignment === "coven" && role.lives > 0;
  },

  isLastStand: function() {
    return Roles.findOne({userId: Meteor.userId()}).secrets.lastStand;
  },

  usedLastStand: function() {
    var lastStand = Roles.findOne({userId: Meteor.userId()}).secrets.lastStand;
    return lastStand != null && !lastStand;
  },

  players: function() {
    return Players.find({alive: true}, {sort: [["votes", "desc"],["name", "asc"]]});
  },

  timeRemaining: function() {
    return moment(Games.findOne().dayEndMs - TimeSync.serverTime()).format("mm:ss");
  }
});

Template.coven.events({
  'change .covenVote': function(event) {
    var userId = event.target.value;
    if (userId === "_none") {
      Meteor.call('clearVote', GameId, standardCallback);
    } else {
      Meteor.call('covenVote', GameId, userId, standardCallback);
    }
  }
});

Template.coven.onDestroyed(function() {
  speak("witches go to sleep");
});

// Priest
Template.priest.onRendered(function() {
  speak("priest wake up");
});

Template.priest.helpers({
  isPriest: function() {
    var role = Roles.findOne({userId: Meteor.userId()});
    return role.role === "priest" && role.lives > 0;
  },

  players: function() {
    return Players.find({alive: true}, {sort: [["name", "asc"]]});
  },

  hasSecret: function() {
    var role = Roles.findOne({userId: Meteor.userId()});
    if (role.role === "priest") {
      return role.secrets.hasInvestigated;
    }
  },

  secret: function() {
    var role = Roles.findOne({userId: Meteor.userId()});
    if (role.role === "priest" && role.secrets.hasInvestigated) {
      var secrets = role.secrets.investigations;
      return secrets[secrets.length - 1];
    }
  },

  timeRemaining: function() {
    return moment(Games.findOne().dayEndMs - TimeSync.serverTime()).format("mm:ss");
  }
});

Template.priest.events({
  'change .priestVote': function(event) {
    var userId = event.target.value;
    Meteor.call('priestVote', GameId, userId, function(error) {
      if (error) {
        alert(error);
      } else {
        $("input").prop('disabled', true);
        $("input").css("display", "none");
        $(".space8").css("display", "none");
      }
    });
  },

  'click .button': function() {
    Meteor.call('nightAck', GameId, standardCallback);
  }
});

Template.priest.onDestroyed(function() {
  speak("priest go to sleep");
});

// Hunter
Template.hunter.onRendered(function() {
  speak("hunter wake up");
});

Template.hunter.helpers({
  isHunter: function() {
    var role = Roles.findOne({userId: Meteor.userId()});
    return role.role === "hunter" && role.lives > 0;
  },

  players: function() {
    return Players.find({alive: true}, {sort: [["name", "asc"]]});
  },

  timeRemaining: function() {
    return moment(Games.findOne().dayEndMs - TimeSync.serverTime()).format("mm:ss");
  }
});

Template.hunter.events({
  'change .hunterVote': function(event) {
    var userId = event.target.value;
    Meteor.call('hunterVote', GameId, userId, standardCallback);
  }
});

Template.hunter.onDestroyed(function() {
  speak("hunter go to sleep");
});





/**
 * helpers
 */
speak = function(text) {
  if (window.speechSynthesis) {
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
  }
};