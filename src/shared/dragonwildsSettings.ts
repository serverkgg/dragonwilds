import { type Bridge, BridgeUserError } from "@serverkgg/bridge";
import { changedSettingKeys } from "@serverkgg/bridge/utils";
import {
	MAX_PLAYERS_MAX,
	MAX_PLAYERS_MIN,
	PASSWORD_MAX,
	PLAYER_ID_PATTERN,
	SERVER_NAME_MAX,
	WORLD_NAME_MAX,
	WORLD_NAME_PATTERN,
} from "./dragonwildsApp";
import {
	ADMIN_PASSWORD_KEY,
	booleanOf,
	CRASH_DUMPS_KEY,
	MAX_PLAYERS_KEY,
	maxPlayersOf,
	OWNER_ID_KEY,
	PLATFORM_POLICIES,
	PLATFORM_POLICY_KEY,
	platformPolicyOf,
	SERVER_NAME_KEY,
	textOf,
	WORLD_NAME_KEY,
	WORLD_PASSWORD_KEY,
} from "./dragonwildsConfig";
import type { DragonwildsSettingRecord } from "./dragonwildsStamp";

export const SETTING_KEYS: readonly string[] = [
	OWNER_ID_KEY,
	SERVER_NAME_KEY,
	WORLD_NAME_KEY,
	WORLD_PASSWORD_KEY,
	ADMIN_PASSWORD_KEY,
	PLATFORM_POLICY_KEY,
	MAX_PLAYERS_KEY,
	CRASH_DUMPS_KEY,
];

const FIRST_PRINTABLE_CODE = 32;

const DELETE_CODE = 127;

const WHITESPACE = /\s/;

export const hasControlCharacter = (text: string) => {
	return [
		...text,
	].some((character) => {
		const code = character.charCodeAt(0);

		return code < FIRST_PRINTABLE_CODE || code === DELETE_CODE;
	});
};

export const playerIdOf = (raw: string) => {
	return raw.trim();
};

export const isPlayerId = (raw: string) => {
	return PLAYER_ID_PATTERN.test(raw.trim());
};

const UNKNOWN_SETTING: Bridge.Text = {
	ar: "لا يوجد في دراقونوايلدز إعداد بهذا الاسم.",
	en: "Dragonwilds has no setting by that name.",
};

const CONTROL_CHARACTER: Bridge.Text = {
	ar: "يحتوي النص على رموز لا يقبلها دراقونوايلدز، احذفها وجرب مرة ثانية.",
	en: "The text has characters Dragonwilds can't take. Remove them and try again.",
};

const SERVER_NAME_INVALID: Bridge.Text = {
	ar: `اسم السيرفر مطلوب، ولا يتجاوز ${SERVER_NAME_MAX} حرفًا.`,
	en: `The server name is required and can't be longer than ${SERVER_NAME_MAX} characters.`,
};

export const WORLD_NAME_INVALID: Bridge.Text = {
	ar: `اسم الماب، وهو أيضًا اسم ملفه دون ‎.sav، من 1 إلى ${WORLD_NAME_MAX} حرفًا، دون مسافة في أوله أو آخره، ودون / أو \\ أو نقطتين متتاليتين.`,
	en: `A world name, which is also its file's name without .sav, is 1 to ${WORLD_NAME_MAX} characters, with no space at its start or end, and no /, \\ or two dots in a row.`,
};

const PASSWORD_INVALID: Bridge.Text = {
	ar: `كلمة المرور لا تتجاوز ${PASSWORD_MAX} حرفًا، ولا تحتوي على مسافات.`,
	en: `The password can't be longer than ${PASSWORD_MAX} characters or contain spaces.`,
};

const ADMIN_PASSWORD_REQUIRED: Bridge.Text = {
	ar: "كلمة مرور الأدمن مطلوبة، اكتب كلمة مرور وجرب مرة ثانية.",
	en: "The admin password is required. Type one and try again.",
};

const MAX_PLAYERS_OUT_OF_RANGE: Bridge.Text = {
	ar: `عدد اللاعبين من ${MAX_PLAYERS_MIN} إلى ${MAX_PLAYERS_MAX}.`,
	en: `Max players is ${MAX_PLAYERS_MIN} to ${MAX_PLAYERS_MAX}.`,
};

const UNKNOWN_PLATFORM_POLICY: Bridge.Text = {
	ar: "اختر المنصات من القائمة.",
	en: "Pick the platforms from the list.",
};

export const PLAYER_ID_INVALID: Bridge.Text = {
	ar: "معرّف اللاعب 32 حرفًا من الأرقام والأحرف من a إلى f. انسخه من اللعبة كما هو.",
	en: "A player ID is 32 characters of digits and the letters a to f. Copy it from the game as it is.",
};

export const settingValues = (stored: Bridge.Values): Bridge.Values => {
	return {
		[ADMIN_PASSWORD_KEY]: textOf(stored, ADMIN_PASSWORD_KEY),
		[CRASH_DUMPS_KEY]: booleanOf(stored[CRASH_DUMPS_KEY], false),
		[MAX_PLAYERS_KEY]: maxPlayersOf(stored),
		[OWNER_ID_KEY]: textOf(stored, OWNER_ID_KEY),
		[PLATFORM_POLICY_KEY]: platformPolicyOf(stored[PLATFORM_POLICY_KEY]),
		[SERVER_NAME_KEY]: textOf(stored, SERVER_NAME_KEY),
		[WORLD_NAME_KEY]: textOf(stored, WORLD_NAME_KEY),
		[WORLD_PASSWORD_KEY]: textOf(stored, WORLD_PASSWORD_KEY),
	};
};

export const changedSettingValues = <T extends Bridge.Value>(
	before: Bridge.Values,
	written: Record<string, T>,
): Record<string, T> => {
	const changed = changedSettingKeys(before, written);

	return Object.fromEntries(Object.entries(written).filter(([key]) => changed.includes(key)));
};

const plainTextOf = (value: Bridge.Value | undefined) => {
	const text = typeof value === "string" ? value : String(value ?? "");

	if (hasControlCharacter(text)) {
		throw new BridgeUserError(CONTROL_CHARACTER);
	}

	return text;
};

export const requireWorldName = (name: string) => {
	if (name.length > WORLD_NAME_MAX || !WORLD_NAME_PATTERN.test(name)) {
		throw new BridgeUserError(WORLD_NAME_INVALID);
	}

	return name;
};

export const worldNameWriteOf = (value: Bridge.Value | undefined) => {
	return requireWorldName((typeof value === "string" ? value : String(value ?? "")).trim());
};

const nameOf = (value: Bridge.Value | undefined, max: number, invalid: Bridge.Text) => {
	const name = plainTextOf(value).trim();

	if (name.length === 0 || name.length > max) {
		throw new BridgeUserError(invalid);
	}

	return name;
};

const passwordOf = (value: Bridge.Value | undefined) => {
	const password = plainTextOf(value);

	if (password.length > PASSWORD_MAX || WHITESPACE.test(password)) {
		throw new BridgeUserError(PASSWORD_INVALID);
	}

	return password;
};

const adminPasswordOf = (value: Bridge.Value | undefined) => {
	const password = passwordOf(value);

	if (password.length === 0) {
		throw new BridgeUserError(ADMIN_PASSWORD_REQUIRED);
	}

	return password;
};

const maxPlayersWriteOf = (value: Bridge.Value | undefined) => {
	const count = typeof value === "number" ? value : Number(String(value ?? "").trim());

	if (!Number.isInteger(count) || count < MAX_PLAYERS_MIN || count > MAX_PLAYERS_MAX) {
		throw new BridgeUserError(MAX_PLAYERS_OUT_OF_RANGE);
	}

	return count;
};

const platformPolicyWriteOf = (value: Bridge.Value | undefined) => {
	const policy = typeof value === "string" ? value : "";

	if (!PLATFORM_POLICIES.includes(policy)) {
		throw new BridgeUserError(UNKNOWN_PLATFORM_POLICY);
	}

	return policy;
};

export const requirePlayerId = (value: Bridge.Value | undefined) => {
	const raw = typeof value === "string" ? value : "";

	if (!isPlayerId(raw)) {
		throw new BridgeUserError(PLAYER_ID_INVALID);
	}

	return playerIdOf(raw);
};

const crashDumpsOf = (value: Bridge.Value | undefined) => {
	return booleanOf(value ?? null, false);
};

export const validateSettingsWrite = (values: Bridge.Values): DragonwildsSettingRecord => {
	const checked: DragonwildsSettingRecord = {};

	for (const [key, value] of Object.entries(values)) {
		if (!SETTING_KEYS.includes(key)) {
			throw new BridgeUserError(UNKNOWN_SETTING);
		}

		if (key === SERVER_NAME_KEY) {
			checked[key] = nameOf(value, SERVER_NAME_MAX, SERVER_NAME_INVALID);
		} else if (key === WORLD_NAME_KEY) {
			checked[key] = worldNameWriteOf(value);
		} else if (key === WORLD_PASSWORD_KEY) {
			checked[key] = passwordOf(value);
		} else if (key === ADMIN_PASSWORD_KEY) {
			checked[key] = adminPasswordOf(value);
		} else if (key === PLATFORM_POLICY_KEY) {
			checked[key] = platformPolicyWriteOf(value);
		} else if (key === MAX_PLAYERS_KEY) {
			checked[key] = maxPlayersWriteOf(value);
		} else if (key === CRASH_DUMPS_KEY) {
			checked[key] = crashDumpsOf(value);
		} else {
			checked[key] = requirePlayerId(value);
		}
	}

	return checked;
};
