Meteor.startup(function() {
  if (!PERSIST_DB) {
    Games.remove({});
    Players.remove({});
    NightPlayers.remove({});
    Roles.remove({});
    Votes.remove({});
    DayKills.remove({});
    DayAcks.remove({});
    NightShields.remove({});
    NightKills.remove({});
    WakeAcks.remove({});
  }
});