/**
 * _id: the id of this game
 * userId: the userId of this game's owner
 * view: what view clients should display
 *    "lobby"
 *    "setup"
 *    "preDay"
 *    "confirmWake"
 *    "day"
 *    "judge"
 *    "preNight" can loop around due to dob/bod
 *    "confirmSleep" make sure everyone confirms eyes closed
 *    "gravedigger"
 *    "demons" 
 *    "angels"
 *    "coven"
 *    "priest"
 *    "hunter"
 *    "end"
 * dayEndMs: timestamp for end of day
 * turn: the number of the day/night
 * winner: the winning faction if there is one
 *    "town"
 *    "coven"
 */
Games = new Mongo.Collection("games");

/**
 * userId: the userId of this player
 * gameId: the gameId of the game this player belongs to
 * name: the name of this player
 * alive: true if the player is alive
 * votes: the number of players voting to lynch this player (applicable only during day)
 * createdMs: the time when this player was created
 */
Players = new Mongo.Collection("players");

/**
 * userId: the userId of this player
 * gameId: the gameId of the game this player belongs to
 * name: the name of this player
 * votes: the number of players voting to target this player
 */
NightPlayers = new Mongo.Collection("nightPlayers");

/**
 * userId: the userId of this player
 * gameId: the gameId of the game this player belongs to
 * lives: the number of lives this player has remaining (can be more than one)
 * alignment: the team that this player belongs to
 *    "town"
 *    "holy" same team as town, but logically different for peepingTom/oracle
 *    "coven" TODO: last stand
 * role: the role of this player
 *    "priest"
 *    "acolyte"
 *    "survivalist"
 *    "gravedigger"
 *    "judge"
 *    "apprentice"
 *    "gambler"
 *    "oracle"
 *    "peepingTom"
 *    "bod"
 *    "dob"
 *    "hunter"
 * secrets: stuff for keeping track of the player's information and role status
 *    object with possible fields:
 *        used: true if the role has a one-off that's been used (dob/bod/hunter)
 *        master: the apprentice's master
 *            id: playerId
 *            name:
 *            role:
 *                "gravedigger"
 *                "judge"
 *        odd: true if the gambler has chosen protection for odd nights, false if even
 *        graves: array of gravedigger's player knowledge
 *            id: playerId
 *            name:
 *            alignment:
 *            role:
 *        killedToday: number of players killed today (for gravedigger)
 *        investigations: array of priest's player knowledge
 *            id: playerId
 *            name:
 *            isWitch: bool
 *        hasInvestigated: true if this player priest investigated tonight already
 *        tonightWeHunt: true if the hunter should have their night turn available
 *        holies: array of holy killed players
 *            id: playerId
 *            name:
 *        priest: for acolyte
 *            id: playerId
 *            name:
 *        innocent: for peepingTom
 *            id: playerId
 *            name:
 *        lastStand: true if the player is the last witch and should get another night kill
 */
Roles = new Mongo.Collection("roles");

/**
 * userId: the userId of this player
 * gameId: the gameId of the game this player belongs to
 * voteId: the userId of the player this player is voting for
 */
Votes = new Mongo.Collection("votes");

/**
 * userId: the userId of this player
 * gameId: the gameId of the game this player belongs to
 * name: the name of this player
 * died: true if this player died
 * cod: cause of death
 *    "lynch" normal town lynch
 *    "smite" judge smite
 *    "dob" dob
 *    "bod" bod not actually death but we handle here
 */
DayKills = new Mongo.Collection("dayKills");

/**
 * userId: the userId of this player
 * gameId: the gameId of the game this player belongs to
 */
DayAcks = new Mongo.Collection("dayAcks");

/**
 * userId: the userId of this player
 * gameId: the gameId of the game this player belongs to
 * shields: the number of protections the player has
 */
NightShields = new Mongo.Collection("nightShields");

/**
 * userId: the userId of this player
 * gameId: the gameId of the game this player belongs to
 */
NightCurse = new Mongo.Collection("nightCurse");

/**
 * userId: the userId of this player
 * gameId: the gameId of the game this player belongs to
 * name: the name of this player
 * died: true if this player died
 */
NightTargets = new Mongo.Collection("nightTargets");

/**
 * userId: the userId of this player
 * gameId: the gameId of the game this player belongs to
 * name: the name of this player
 * died: true if this player died
 * cod: cause of death if to be revealed
 *    "dob" dob
 *    "bod" bod not actually death but we handle here
 */
NightKills = new Mongo.Collection("nightKills");

/**
 * userId: the userId of this player
 * gameId: the gameId of the game this player belongs to
 */
WakeAcks = new Mongo.Collection("wakeAcks");

/**
 * gameId: the gameId of the game this timeout belongs to
 * view: the name of the view this timeout corresponds to
 * id: the id of the timeout
 */
Timeouts = new Mongo.Collection("timeouts");