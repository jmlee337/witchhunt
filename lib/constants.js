// Master local test force (false for production)
FORCE_ALL_TEST = true;

// Local testing switches (true for production)
PERSIST_DB = true && (!FORCE_ALL_TEST);
SPEECH_ENABLED = true && (!FORCE_ALL_TEST);

// Day timeout
DAY_MINUTES = 8;
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
    "hunter"
];

// For assigning roles at the beginning
ROLES = [
    "survivalist",
    "gravedigger",
    "judge",
    "apprentice",
    "gambler",
    "oracle",
    "peepingTom",
    "bod",
    "dob",
    "hunter"
];

// Role timeouts
TIMEOUT_SECONDS = 30;
TIMEOUT_MS = TIMEOUT_SECONDS * 1000;
GRACE_MS = 5000;