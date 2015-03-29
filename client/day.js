GameId = null;

Template.body.helpers({
  view: function() {
    var game = Games.findOne();
    if (game) {
      return game.view;
    }
  }
});

Template.startScreen.helpers({
  roles: function() {
    var arr = [];
    ROLES.forEach(function(role) {
      arr.push({roleTitle: roleTitle(role), roleDesc: roleDesc(role)});
    });
    return arr;
  }
});

Template.startScreen.events({
  'submit form': function(event) {
    var playerName = event.target.playerName.value;
    var gameId = event.target.gameId.value;
    if (gameId) {
      Meteor.call('joinGame', gameId, playerName, function(error, result) {
        if (error) {
          alert(error);
        } else {
          subscribeToGame(gameId);
          GameId = gameId;
        }
      });
    } else if (playerName) {
      Meteor.call('newGame', playerName, function(error, result) {
        if (error) {
          alert(error);
        } else {
          subscribeToGame(result);
          GameId = result;
        }
      });
    } else {
      Meteor.call('reconnect', function(error, result) {
        if (error) {
          alert(error);
        } else {
          subscribeToGame(result);
          GameId = result;
        }
      });
    }
    return false;
  },

  'focus input': function() {
    $(".display1").animate({height: "72px"}, 250);
  },

  'click .seeRoles': function() {
    var roles = $(".displayRoles");
    var start = $(".displayStart");
    if (roles.css("display") === "none") {
      roles.css("display", "block");
      start.css("display", "none");
    } else {
      roles.css("display", "none");
      start.css("display", "block");
    }
    $(".displayRules").css("display", "none");
  },

  'click .seeRules': function() {
    var rules = $(".displayRules");
    var start = $(".displayStart");
    if (rules.css("display") === "none") {
      rules.css("display", "block");
      start.css("display", "none");
    } else {
      rules.css("display", "none");
      start.css("display", "block");
    }
    $(".displayRoles").css("display", "none");
  }
});

Template.lobby.helpers({
  players: function() {
    return Players.find({}, {sort: [["createdMs", "asc"]]});
  },

  gameName: function() {
    return GameId;
  },

  isOwner: function() {
    return Games.findOne().userId === Meteor.userId();
  }
});

Template.lobby.events({
  'click .startGame': function() {
    Meteor.call('startGame', GameId, standardCallback);
  }
});

Template.setup.onRendered(function() {
  TimeSync.resync();
  Meteor.subscribe("allies", GameId);
});

Template.setup.helpers({
  setup: function() {
    var user = Roles.findOne({userId: Meteor.userId()});
    if (user.role === "apprentice" || user.role === "gambler" || user.role === "bomber") {
      return user.role + "Setup";
    }
  }
});

Template.setup.events({
  'click .button': function() {
    Meteor.call('setupAck', GameId, buttonCallback);
  },

  'change .gamblerProtect': function(event) {
    var odd = event.target.value === "odd";
    Meteor.call('gamblerChoose', GameId, odd, disableCallback);
  },

  'change .apprenticeChoose': function(event) {
    var master = event.target.value;
    Meteor.call('apprenticeChoose', GameId, master, disableCallback);
  }
});

Template.day.helpers({
  turn: function() {
    return Games.findOne().turn;
  },

  timeRemaining: function() {
    return moment(Games.findOne().dayEndMs - TimeSync.serverTime()).format("mm:ss");
  },

  isAlive: function() {
    return Roles.findOne({userId: Meteor.userId()}).lives > 0;
  },

  players: function() {
    return Players.find({alive: true}, {sort: [["votes", "desc"],["name", "asc"]]});
  }
});

Template.day.events({
  'click .button': function() {
    $(".dayPlayers").toggle();
    $(".dayRole").toggle();
  },

  'change .vote': function(event) {
    var userId = event.target.value;
    if (userId === "_none") {
      Meteor.call('clearVote', GameId, standardCallback);
    } else {
      Meteor.call('dayVote', GameId, userId, standardCallback);
    }
  }
});

Template.role.helpers({
  self: function() {
    var userId = Meteor.userId();
    var user = Roles.findOne({userId: userId});
    var name = Players.findOne({userId: userId}).name;
    var secrets = user.secrets;

    var oldMaster;
    if (user.secrets.master && user.role != "apprentice") {
      var oldSecrets = {master: user.secrets.master};
      oldMaster = {
          roleTitle: roleTitle("apprentice"),
          roleDesc: roleDesc("apprentice"),
          secrets: secretsDesc(oldSecrets)
      };
      secrets = {graves: secrets.graves};
    }

    return {
        name: name,
        alignTitle: alignmentTitle(user.alignment),
        alignDesc: alignmentDesc(user.alignment),
        roleTitle: roleTitle(user.role),
        roleDesc: roleDesc(user.role),
        secrets: secretsDesc(secrets),
        oldMaster: oldMaster
    };
  }
});

Template.allies.helpers({
  allies: function() {
    var allies = Roles.find({userId: {$ne: Meteor.userId()}, lives: {$gt: 0}});
    var arr = [];
    allies.forEach(function(ally) {
      var name = Players.findOne({userId: ally.userId}).name;
      arr.push({
          name: name,
          alignTitle: alignmentTitle(ally.alignment),
          alignDesc: alignmentDesc(ally.alignment),
          roleTitle: roleTitle(ally.role),
          roleDesc: roleDesc(ally.role),
          secrets: secretsDesc(ally.secrets)
      });
    });
    return arr;
  }
});

Template.judge.onRendered(function() {
  speak("everybody go to sleep. judge wake up");
});

Template.judge.helpers({
  players: function() {
    return Players.find({alive: true}, {sort: [["votes", "desc"],["name", "asc"]]});
  },

  isJudge: function() {
    var role = Roles.findOne({userId: Meteor.userId()});
    return role.role === "judge" && role.lives > 0;
  },

  timeRemaining: function() {
    return moment(Games.findOne().dayEndMs - TimeSync.serverTime()).format("mm:ss");
  }
});

Template.judge.events({
  'change .smite': function(event) {
    var userId = event.target.value;
    Meteor.call('judgeSmite', GameId, userId, standardCallback);
  }
});

Template.judge.onDestroyed(function() {
  speak("everybody wake up");
});

Template.preNight.helpers({
  resultDescs: function() {
    var dayKills = DayKills.find();
    var arr = [];
    if (dayKills.count() == 0) {
      arr.push("No one died.");
    }
    dayKills.forEach(function(victim) {
      var desc = victim.name;
      switch (victim.cod) {
        case "lynch":
          desc += " was lynched by the Town";
          break;
        case "smite":
          desc += " was smited by the Judge";
          break;
        case "dob":
          desc += " was spited by the D.O.B.";
          break;
        case "cannon":
          desc += " was blown away by the Loose Cannon";
          break;
        case "assassin":
          desc += " was assassinated. By the Assassin";
          break;
        default:
          arr.push(desc + " was blessed by the B.O.D. and gained an extra life.");
          return;
      }
      if (victim.died) {
        desc += " and died.";
      } else {
        desc += ", but did not die.";
      }
      arr.push(desc);
    });
    var fanatic = Roles.findOne({userId: Meteor.userId(), role: "fanatic"});
    if (fanatic && fanatic.secrets.priestDied) {
      arr.push("You gained an extra life from the priest.");
    }
    return arr;
  },

  blockingActions: function() {
    var hasDeathrattle = false;
    var shouldBlock = false;
    var ackAvailable = !DayAcks.findOne();
    if (Roles.findOne({userId: Meteor.userId()}).lives > 0) {
      // Player is still alive
      shouldBlock = true;
    } else if (DayKills.findOne({userId: Meteor.userId()})) {
      //Player was killed today
      var user = Roles.findOne({userId: Meteor.userId()});
      if (user) {
        hasDeathrattle = (user.role === "dob" || user.role === "bod") && !user.secrets.used;
      }
      shouldBlock = true;
    }
    return {hasDeathrattle: hasDeathrattle, shouldBlock: shouldBlock, ackAvailable: ackAvailable};
  },

  players: function() {
    return Players.find({alive: true, userId: {$ne: NO_KILL_ID}}, {sort: [["name", "asc"]]});
  }
});

Template.preNight.events({
  'click .button': function(event) {
    if (event.target.classList.contains("rattle")) {
      $(".rattlePlayers").toggle();
    } else if (event.target.classList.contains("ack")) {
      Meteor.subscribe("nightCurse", GameId);
      Meteor.call('preNightAck', GameId, standardCallback);
    }
  },

  'change .rattlePlayer': function(event) {
    var userId = event.target.value;
    Meteor.call('deathRattle', GameId, userId, disableCallback);
    $(".rattlePlayers").css("display", "none");
  }
});

Template.confirmSleep.helpers({
  canAck: function() {
    return Roles.findOne({userId: Meteor.userId()}).lives > 0;
  }
});

Template.confirmSleep.events({
  'click .bigButton': function() {
    Meteor.call('confirmSleepAck', GameId, bigButtonCallback);
  }
});

Template.preDay.onRendered(function () {
  speak("everybody wake up");
});

Template.preDay.helpers({
  resultDescs: function() {
    var nightKills = NightKills.find();
    var arr = [];
    if (nightKills.count() == 0) {
      arr.push("No one died.");
    }
    var deadPriestId;
    var oracle = Roles.findOne({userId: Meteor.userId(), role: "oracle"});
    if (oracle && oracle.secrets.deadPriest) {
      deadPriestId = oracle.secrets.deadPriest.id;
    }
    nightKills.forEach(function(victim) {
      var desc = victim.name;
      if (victim.cod) {
        if (victim.cod === "dob") {
          desc += " was spited by the D.O.B";
        } else {
          arr.push(desc + " was blessed by the B.O.D. and gained an extra life.");
          return;
        }
      } else {
        desc += " was attacked in the night";
      }
      if (victim.died) {
        desc += " and died.";
      } else {
        desc += ", but did not die.";
      }
      if (victim.userId === deadPriestId) {
        desc += " (Priest)";
      }
      arr.push(desc);
    });
    var fanatic = Roles.findOne({userId: Meteor.userId(), role: "fanatic"});
    if (fanatic && fanatic.secrets.investigated) {
      arr.push("You gained an extra life from the priest.");
    }
    return arr;
  },

  blockingActions: function() {
    var hasDeathrattle = false;
    var shouldBlock = false;
    var ackAvailable = !WakeAcks.findOne();
    if (Roles.findOne({userId: Meteor.userId()}).lives > 0) {
      // Player is still alive
      shouldBlock = true;
    } else if (NightKills.findOne({userId: Meteor.userId()})) {
      // Player was killed tonight
      var user = Roles.findOne({userId: Meteor.userId()});
      if (user) {
        hasDeathrattle = (user.role === "dob" || user.role === "bod") && !user.secrets.used;
      }
      shouldBlock = true;
    }
    return {hasDeathrattle: hasDeathrattle, shouldBlock: shouldBlock, ackAvailable: ackAvailable};
  },

  players: function() {
    return Players.find({alive: true, userId: {$ne: NO_KILL_ID}}, {sort: [["name", "asc"]]});
  }
});

Template.preDay.events({
  'click .button': function(event) {
    if (event.target.classList.contains("rattleWake")) {
      $(".rattleWakePlayers").toggle();
    } else if (event.target.classList.contains("ackWake")) {
      Meteor.call('preDayAck', GameId, standardCallback);
    }
  },

  'change .rattleWakePlayer': function(event) {
    var userId = event.target.value;
    Meteor.call('deathRattle', GameId, userId, standardCallback);
    $(".rattleWakePlayers").css("display", "none");
  }
});

Template.confirmWake.helpers({
  canAck: function() {
    return Roles.findOne({userId: Meteor.userId()}).lives > 0;
  }
});

Template.confirmWake.events({
  'click .bigButton': function() {
    Meteor.call('confirmWakeAck', GameId, bigButtonCallback);
  }
});

Template.end.helpers({
  winner: function() {
    return Games.findOne().winner === "town" ? "Village" : "Witch Coven";
  }
});






/**
 * Helpers
 */
subscribeToGame = function(gameId) {
  Meteor.subscribe("games", gameId);
  Meteor.subscribe("players", gameId);
  Meteor.subscribe("roles", gameId);
  Meteor.subscribe("allies", gameId);
  Meteor.subscribe("nightCurse", GameId);
  Meteor.subscribe("dayKills", gameId);
  Meteor.subscribe("dayAcks", gameId);
  Meteor.subscribe("nightKills", gameId);
  Meteor.subscribe("wakeAcks", gameId);
};

standardCallback = function(error) {
  if (error) {
    alert(error);
  }
};

disableCallback = function(error) {
  if (error) {
    alert(error);
  } else {
    $("input").prop('disabled', true);
  }
};

buttonCallback = function(error) {
  if (error) {
    alert(error);
  } else {
    $(".button").removeClass("button").addClass("disabledButton");
  }
};

bigButtonCallback = function(error) {
  if (error) {
    alert(error);
  } else {
    $(".bigButton").removeClass("bigButton").addClass("disabledBigButton");
  }
};

alignmentTitle = function(alignment) {
  switch (alignment) {
    case "town":
      return "Village Peasant";
    case "holy":
      return "Village Clergy";
    case "coven":
      return "Witch";
  }
};

alignmentDesc = function(alignment) {
  switch (alignment) {
    case "town":
      return "The Witches will try to kill you, frame you, and hide among you!";
    case "holy":
      return "You have a powerful, special holy character.";
    case "coven":
      return "You are a member of the Witch Coven. Each night, the Coven meets and may vote to kill a player.";
  }
};

roleTitle = function(role) {
  switch (role) {
    case "priest":
      return "Priest";
    case "acolyte":
      return "Acolyte";
    case "survivalist":
      return "Survivalist";
    case "gravedigger":
      return "Gravedigger";
    case "judge":
      return "Judge";
    case "apprentice":
      return "Apprentice";
    case "gambler":
      return "Gambler";
    case "oracle":
      return "Oracle";
    case "peepingTom":
      return "Peeping Tom";
    case "bod":
      return "Benevolent Old Dame";
    case "dob":
      return "Dirty Old Bastard";
    case "hunter":
      return "Hunter";
    case "fanatic":
      return "Fanatic";
  }
}

roleDesc = function(role) {
  switch (role) {
    case "priest":
      return "Each night you may check if a player is a member of the Witch Coven.";
    case "acolyte":
      return "At the start of the game you learn who has the Priest character.";
    case "survivalist":
      return "You start the game with an extra life.";
    case "gravedigger":
      return "At the start of each night you learn the cards of all players who died that day.";
    case "judge":
      return "At the end of any a if the players do not select a lynch target you may privately " +
          "select one yourself. This lynch ignores extra lives.";
    case "apprentice":
      return "At the start of the game you may select Judge or Gravedigger. You will learn who " +
          "has that character and take over their duties if they die.";
    case "gambler":
      return "At the start of the game you may select odd or even nights. On those nights you " +
          "are protected from one kill.";
    case "oracle":
      return "If the Priest is killed at night you will be notified when their death is " +
          "announced in the morning.";
    case "peepingTom":
      return "At the start of the game you learn that a random player is a Village Peasant.";
    case "bod":
      return "When your death is announced you may give a player an extra life.";
    case "dob":
      return "When your death is announced you may kill a player.";
    case "hunter":
      return "The first time a player survives a kill you may kill a player the following night.";
    case "fanatic":
      return "If the Priest checks you or dies during the day, you will be notified and gain an " +
          "extra life";
  }
};

secretsDesc = function(secrets) {
  if (secrets.master) {
    return "You are apprenticed to " + secrets.master.name + ", the " + roleTitle(secrets.master.role) + ".";
  }
  if (secrets.odd != null) {
    var odd = secrets.odd;
    var turn = Games.findOne().turn;
    var isTurnOdd = turn == 0 || turn % 2 == 1;
    var desc = "You are protected from one kill on " + (odd ? "odd" : "even") + " nights.";
    return desc + " You " + (odd == isTurnOdd ? "will" : "will not") + " have protection tonight.";
  }
  if (secrets.graves && secrets.graves.length > 0) {
    var desc = secrets.graves[0].name + ": " + alignmentTitle(secrets.graves[0].alignment) + " " +
        roleTitle(secrets.graves[0].role);
    for (var i = 1; i < secrets.graves.length; i++) {
      desc += "<br/>" + secrets.graves[i].name + ": " +
          alignmentTitle(secrets.graves[i].alignment) + " " +
          roleTitle(secrets.graves[i].role);
    }
    return desc;
  }
  if (secrets.investigations && secrets.investigations.length > 0) {
    var investigations = secrets.investigations;
    var desc = investigations[0].name + (investigations[0].isWitch ? " is" : " is not") +
        " a member of the Witch Coven";
    for (var i = 1; i < investigations.length; i++) {
      desc += "<br/>" + investigations[i].name + (investigations[i].isWitch ? " is" : " is not") +
          " a member of the Witch Coven";
    }
    return desc;
  }
  if (secrets.tonightWeHunt) {
    return "You may kill a player tonight";
  }
  if (secrets.deadPriest) {
    return secrets.deadPriest.name + " was a member of the Village Clergy.";
  }
  if (secrets.priest) {
    return secrets.priest.name + " is the Priest.";
  }
  if (secrets.innocent) {
    return secrets.innocent.name + " is a Village Peasant.";
  }
}
