// Master local test force (false for production)
FORCE_ALL_TEST = false;

// Local testing switches (true for production)
MULTIPLE_GAMES = true && (!FORCE_ALL_TEST);
ONLY_REAL_PLAYERS = true && (!FORCE_ALL_TEST);
PERSIST_DB = true && (!FORCE_ALL_TEST);
SPEECH_ENABLED = true && (!FORCE_ALL_TEST);

NUM_FAKE_PLAYERS = 6;

// Day timeout
DAY_MINUTES = FORCE_ALL_TEST ? 1 : 8;
DURATION_MS = DAY_MINUTES * 60000;

// No lynch/kill/target player
NO_KILL_ID = "_noLynch";
NO_KILL_STRING = "Do nothing";

// For figuring out the next role to go to
NIGHT_ROLES = [
    "judge",
    "preNight",
    "gravedigger",
    "demons",
    "angels",
    "coven",
    "priest",
    "hunter",
    "preDay"
];

// For assigning roles at the beginning
ROLES = [
    "judge",
    "gravedigger",
    "apprentice",
    "survivalist",
    "dob",
    "gambler",
    "fanatic",
    "peepingTom",
    "oracle",
    "hunter",
    "bod",
];

ALL_ROLES = [
    "priest",
    "judge",
    "gravedigger",
    "apprentice",
    "survivalist",
    "dob",
    "gambler",
    "fanatic",
    "peepingTom",
    "oracle",
    "hunter",
    "bod",
];

// Role timeouts
TIMEOUT_SECONDS = 30;
TIMEOUT_MS = TIMEOUT_SECONDS * 1000;
GRACE_MS = 5000;