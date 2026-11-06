export const STEAM_APP_ID = "4019830";

export const GAME_LABEL = "RuneScape: Dragonwilds";

export const CONTAINER_HOME = "/home/container";

export const START_WRAPPER = "/opt/serverk/dragonwilds-start";

export const PROJECT_DIRECTORY = "RSDragonwilds";

export const PROJECT_ARGUMENT = PROJECT_DIRECTORY;

export const LOG_ARGUMENT = "-log";

export const PORT_FLAG = "-Port=";

export const BEACON_PORT_FLAG = "-BeaconPort=";

export const GAME_PORT = "game";

export const BEACON_PORT = "beacon";

export const BINARY_DIRECTORY = `${PROJECT_DIRECTORY}/Binaries/Linux`;

export const SERVER_BINARY = `${BINARY_DIRECTORY}/RSDragonwildsServer-Linux-Shipping`;

export const LAUNCHER_SCRIPT = "RSDragonwildsServer.sh";

export const CRASHPAD_HANDLER = `${PROJECT_DIRECTORY}/Plugins/Developer/Sentry/Binaries/Linux/crashpad_handler`;

export const EXECUTABLE_FILES: readonly string[] = [
	SERVER_BINARY,
	LAUNCHER_SCRIPT,
	CRASHPAD_HANDLER,
];

export const PAKS_DIRECTORY = `${PROJECT_DIRECTORY}/Content/Paks`;

export const GAME_ROOTS = [
	SERVER_BINARY,
	`${PAKS_DIRECTORY}/global.utoc`,
	`${PAKS_DIRECTORY}/global.ucas`,
	`${PAKS_DIRECTORY}/RSDragonwilds-LinuxServer.pak`,
	`${PAKS_DIRECTORY}/RSDragonwilds-LinuxServer.utoc`,
	`${PAKS_DIRECTORY}/RSDragonwilds-LinuxServer.ucas`,
];

export const SAVED_DIRECTORY = `${PROJECT_DIRECTORY}/Saved`;

export const CONFIG_DIRECTORY = `${SAVED_DIRECTORY}/Config/LinuxServer`;

export const DEDICATED_SERVER_FILE = `${CONFIG_DIRECTORY}/DedicatedServer.ini`;

export const GAME_INI_FILE = `${CONFIG_DIRECTORY}/Game.ini`;

export const SAVE_GAMES_DIRECTORY = `${SAVED_DIRECTORY}/SaveGames`;

export const LOGS_DIRECTORY = `${SAVED_DIRECTORY}/Logs`;

export const LOG_FILE = `${LOGS_DIRECTORY}/RSDragonwilds.log`;

export const MODS_DIRECTORY = `${PAKS_DIRECTORY}/~mods`;

export const ENSURED_DIRECTORIES: readonly string[] = [
	CONFIG_DIRECTORY,
	SAVE_GAMES_DIRECTORY,
	LOGS_DIRECTORY,
	MODS_DIRECTORY,
];

export const WORLD_EXTENSION = ".sav";

export const WORLD_UPLOAD_EXTENSION = "sav";

export const WORLD_UPLOAD_STAGING = ".serverk-uploads/world";

export const MOD_UPLOAD_EXTENSIONS: string[] = [
	"zip",
	"pak",
];

export const MOD_UPLOAD_STAGING = ".serverk-uploads/mod";

export const SERVER_NAME_MAX = 32;

export const WORLD_NAME_MAX = 16;

const WORLD_NAME_EDGE = "[^ \\x00-\\x1f\\x7f-\\x9f/\\\\]";

const WORLD_NAME_INNER = "[^\\x00-\\x1f\\x7f-\\x9f/\\\\]";

export const WORLD_NAME_PATTERN = new RegExp(
	`^(?!.*\\.\\.)${WORLD_NAME_EDGE}(?:${WORLD_NAME_INNER}{0,${WORLD_NAME_MAX - 2}}${WORLD_NAME_EDGE})?$`,
);

export const PASSWORD_MAX = 64;

export const ADMIN_PASSWORD_LENGTH = 12;

export const MAX_PLAYERS_MIN = 1;

export const MAX_PLAYERS_MAX = 6;

export const MAX_PLAYERS_DEFAULT = 6;

export const PLAYER_ID_PATTERN = /^[0-9A-Fa-f]{32}$/;

export const DEFAULT_NAME_PREFIX = "Serverk";

export const DEFAULT_NAME_DIGITS = 6;

export const DIGITS = "0123456789";
