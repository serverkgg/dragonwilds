import type { Bridge } from "@serverkgg/bridge";
import { generateToken } from "@serverkgg/bridge/utils";
import {
	ADMIN_PASSWORD_KEY,
	ADMIN_PASSWORD_LENGTH,
	CRASH_DUMPS_KEY,
	DEDICATED_SERVER_FILE,
	DEFAULT_NAME_DIGITS,
	DEFAULT_NAME_PREFIX,
	DIGITS,
	type DragonwildsSettingRecord,
	INI_FALSE,
	mergeDedicatedServer,
	OWNER_ID_KEY,
	PLATFORM_POLICY_KEY,
	PlatformPolicy,
	patchDragonwildsStamp,
	readDedicatedServer,
	readDragonwildsStamp,
	SAVE_ALL_SECTIONS_KEY,
	SECTIONS_TO_SAVE_SECTION,
	SERVER_NAME_KEY,
	textOf,
	WORLD_NAME_KEY,
	WORLD_PASSWORD_KEY,
} from "../shared";

export const SEEDED_WHEN_MISSING: DragonwildsSettingRecord = {
	[CRASH_DUMPS_KEY]: INI_FALSE,
	[OWNER_ID_KEY]: "",
	[PLATFORM_POLICY_KEY]: PlatformPolicy.Crossplay,
	[WORLD_PASSWORD_KEY]: "",
};

const SAVE_ALL_SECTIONS = "true";

export const defaultNamesOf = (suffix: string) => {
	return {
		[SERVER_NAME_KEY]: `${DEFAULT_NAME_PREFIX} ${suffix}`,
		[WORLD_NAME_KEY]: `${DEFAULT_NAME_PREFIX}${suffix}`,
	};
};

export const generateAdminPassword = () => {
	return generateToken(ADMIN_PASSWORD_LENGTH);
};

export const dedicatedServerSeed = (stored: Bridge.Values, suffix: string): DragonwildsSettingRecord => {
	const seed: DragonwildsSettingRecord = {};

	for (const [key, value] of Object.entries(SEEDED_WHEN_MISSING)) {
		if (stored[key] === undefined) {
			seed[key] = value;
		}
	}

	for (const [key, value] of Object.entries(defaultNamesOf(suffix))) {
		if (textOf(stored, key).trim().length === 0) {
			seed[key] = value;
		}
	}

	return seed;
};

const seedSectionsToSave = async (context: Bridge.Context) => {
	const sections = await context.codec.ini.read(DEDICATED_SERVER_FILE, {
		section: SECTIONS_TO_SAVE_SECTION,
	});

	if (sections[SAVE_ALL_SECTIONS_KEY] !== undefined) {
		return;
	}

	await mergeDedicatedServer(
		context,
		{
			[SAVE_ALL_SECTIONS_KEY]: SAVE_ALL_SECTIONS,
		},
		SECTIONS_TO_SAVE_SECTION,
	);
};

export const seedAdminPassword = async (context: Bridge.Context, stored: Bridge.Values) => {
	const stamp = await readDragonwildsStamp(context);

	if (
		textOf(stamp.settingsRetained, ADMIN_PASSWORD_KEY).length > 0
		|| textOf(stored, ADMIN_PASSWORD_KEY).trim().length > 0
	) {
		return;
	}

	context.log("generating an admin password, the customer reads it in the settings form");

	await patchDragonwildsStamp(context, {
		settingsRetained: {
			...stamp.settingsRetained,
			[ADMIN_PASSWORD_KEY]: generateAdminPassword(),
		},
	});
};

export const seedConfig = async (context: Bridge.Context) => {
	const stored = await readDedicatedServer(context);
	const seed = dedicatedServerSeed(stored, generateToken(DEFAULT_NAME_DIGITS, DIGITS));

	if (Object.keys(seed).length > 0) {
		await mergeDedicatedServer(context, seed);
	}

	await seedSectionsToSave(context);
	await seedAdminPassword(context, stored);
};
