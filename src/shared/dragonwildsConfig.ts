import type { Bridge } from "@serverkgg/bridge";
import { CONFIG_DIRECTORY, DEDICATED_SERVER_FILE, GAME_INI_FILE, MAX_PLAYERS_DEFAULT } from "./dragonwildsApp";
import type { DragonwildsSettingRecord, DragonwildsSettingValue } from "./dragonwildsStamp";

export const DEDICATED_SERVER_SECTION = "/Script/Dominion.DedicatedServerSettings";

export const SECTIONS_TO_SAVE_SECTION = "SectionsToSave";

export const GAME_SESSION_SECTION = "/Script/Engine.GameSession";

export const OWNER_ID_KEY = "OwnerId";

export const SERVER_NAME_KEY = "ServerName";

export const WORLD_NAME_KEY = "DefaultWorldName";

export const ADMIN_PASSWORD_KEY = "AdminPassword";

export const WORLD_PASSWORD_KEY = "WorldPassword";

export const ADMINISTRATORS_KEY = "AdministratorList";

export const PLATFORM_POLICY_KEY = "PlatformPolicy";

export const CRASH_DUMPS_KEY = "bAllowSendingCrashDumps";

export const SAVE_ALL_SECTIONS_KEY = "bCanSaveAllSections";

export const MAX_PLAYERS_KEY = "MaxPlayers";

export const GAME_INI_KEYS: readonly string[] = [
	MAX_PLAYERS_KEY,
];

export const RETAINED_KEYS: readonly string[] = [
	ADMIN_PASSWORD_KEY,
	MAX_PLAYERS_KEY,
];

export enum PlatformPolicy {
	Crossplay = "Crossplay",
	Pc = "PC",
	PlayStation = "PlayStation",
	Xbox = "Xbox",
	Nintendo = "Nintendo",
}

export const PLATFORM_POLICIES: readonly string[] = Object.values(PlatformPolicy);

export const INI_TRUE = "True";

export const INI_FALSE = "False";

const TRUE_TEXT = "true";

const FALSE_TEXT = "false";

const DEDICATED_SERVER_OPTIONS = {
	section: DEDICATED_SERVER_SECTION,
};

const GAME_SESSION_OPTIONS = {
	section: GAME_SESSION_SECTION,
};

export const readDedicatedServer = async (context: Bridge.Context): Promise<Bridge.Values> => {
	return await context.codec.ini.read(DEDICATED_SERVER_FILE, DEDICATED_SERVER_OPTIONS);
};

export const readGameSession = async (context: Bridge.Context): Promise<Bridge.Values> => {
	return await context.codec.ini.read(GAME_INI_FILE, GAME_SESSION_OPTIONS);
};

export const readConfig = async (context: Bridge.Context): Promise<Bridge.Values> => {
	const session = await readGameSession(context);

	return {
		...(await readDedicatedServer(context)),
		...(session[MAX_PLAYERS_KEY] === undefined
			? {}
			: {
					[MAX_PLAYERS_KEY]: session[MAX_PLAYERS_KEY],
				}),
	};
};

export const iniTextOf = (value: DragonwildsSettingValue): string => {
	if (typeof value === "boolean") {
		return value ? INI_TRUE : INI_FALSE;
	}

	return String(value);
};

const iniValuesOf = (values: DragonwildsSettingRecord): Bridge.Values => {
	return Object.fromEntries(
		Object.entries(values).map(([key, value]) => [
			key,
			iniTextOf(value),
		]),
	);
};

export const splitConfig = (values: DragonwildsSettingRecord) => {
	const game: DragonwildsSettingRecord = {};
	const server: DragonwildsSettingRecord = {};

	for (const [key, value] of Object.entries(values)) {
		if (GAME_INI_KEYS.includes(key)) {
			game[key] = value;
		} else {
			server[key] = value;
		}
	}

	return {
		game,
		server,
	};
};

export const mergeDedicatedServer = async (
	context: Bridge.Context,
	values: DragonwildsSettingRecord,
	section: string = DEDICATED_SERVER_SECTION,
) => {
	await context.files.ensure(CONFIG_DIRECTORY);
	await context.codec.ini.merge(DEDICATED_SERVER_FILE, iniValuesOf(values), {
		section,
	});
};

export const mergeGameSession = async (context: Bridge.Context, values: DragonwildsSettingRecord) => {
	await context.files.ensure(CONFIG_DIRECTORY);
	await context.codec.ini.merge(GAME_INI_FILE, iniValuesOf(values), GAME_SESSION_OPTIONS);
};

export const writeConfig = async (context: Bridge.Context, values: DragonwildsSettingRecord) => {
	const { game, server } = splitConfig(values);

	if (Object.keys(server).length > 0) {
		await mergeDedicatedServer(context, server);
	}

	if (Object.keys(game).length > 0) {
		await mergeGameSession(context, game);
	}
};

export const textOf = (values: Bridge.Values, key: string) => {
	const value = values[key];

	return typeof value === "string" ? value : value === undefined || value === null ? "" : String(value);
};

export const booleanOf = (value: Bridge.Value | undefined, fallback: boolean) => {
	if (typeof value === "boolean") {
		return value;
	}

	const text = String(value ?? "")
		.trim()
		.toLowerCase();

	if (text === TRUE_TEXT) {
		return true;
	}

	if (text === FALSE_TEXT) {
		return false;
	}

	return fallback;
};

export const maxPlayersOf = (values: Bridge.Values) => {
	const value = Number(String(values[MAX_PLAYERS_KEY] ?? "").trim());

	return Number.isInteger(value) && value > 0 ? value : MAX_PLAYERS_DEFAULT;
};

export const platformPolicyOf = (value: Bridge.Value | undefined) => {
	const text = typeof value === "string" ? value.trim() : "";

	return PLATFORM_POLICIES.includes(text) ? text : PlatformPolicy.Crossplay;
};
