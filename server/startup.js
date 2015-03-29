Meteor.startup(function() {
  if (!PERSIST_DB) {
    Games.remove({});
    Players.remove({});
    Roles.remove({});
    Votes.remove({});
    DayKills.remove({});
    DayAcks.remove({});
    NightShields.remove({});
    NightCurse.remove({});
    NightTargets.remove({});
    NightKills.remove({});
    WakeAcks.remove({});
    Timeouts.remove({});
  }
});