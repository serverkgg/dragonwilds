import type { Bridge } from "@serverkgg/bridge";
import { BridgeEventName } from "@serverkgg/bridge/protocol";
import { sameSettingValue } from "@serverkgg/bridge/utils";
import {
	ADMIN_PASSWORD_KEY,
	MAX_PLAYERS_KEY,
	RETAINED_KEYS,
	readConfig,
	WORLD_PASSWORD_KEY,
	writeConfig,
} from "./dragonwildsConfig";
import {
	type DragonwildsBaseline,
	type DragonwildsSettingRecord,
	type DragonwildsSettingValue,
	type DragonwildsStamp,
	patchDragonwildsStamp,
	readDragonwildsStamp,
} from "./dragonwildsStamp";

export const SECRET_SETTING_KEYS: readonly string[] = [
	ADMIN_PASSWORD_KEY,
	WORLD_PASSWORD_KEY,
];

export const EMPTY_BASELINE: DragonwildsBaseline = {
	secrets: {},
	values: {},
};

const withoutKeys = <Value>(record: Record<string, Value>, keys: readonly string[]): Record<string, Value> => {
	return Object.fromEntries(Object.entries(record).filter(([key]) => !keys.includes(key)));
};

export const mergeBaseline = (
	stamp: DragonwildsStamp,
	values: DragonwildsSettingRecord,
	current: Bridge.Values,
): DragonwildsBaseline => {
	const baseline: DragonwildsBaseline = {
		secrets: {
			...stamp.settingsBaseline.secrets,
		},
		values: {
			...stamp.settingsBaseline.values,
		},
	};

	for (const [key, value] of Object.entries(values)) {
		const first = !Object.hasOwn(stamp.settingsPending, key);
		const before = current[key];

		if (SECRET_SETTING_KEYS.includes(key)) {
			baseline.secrets[key] = (first ? false : (baseline.secrets[key] ?? false)) || !sameSettingValue(before, value);

			continue;
		}

		if (first && (typeof before === "string" || typeof before === "number" || typeof before === "boolean")) {
			baseline.values[key] = before;
		}
	}

	return baseline;
};

export const recordPendingSettings = async (
	context: Bridge.Context,
	values: DragonwildsSettingRecord,
	current: Bridge.Values,
): Promise<DragonwildsStamp> => {
	const stamp = await readDragonwildsStamp(context);

	return await patchDragonwildsStamp(context, {
		settingsBaseline: mergeBaseline(stamp, values, current),
		settingsPending: {
			...stamp.settingsPending,
			...values,
		},
	});
};

export const forgetPendingSettings = async (
	context: Bridge.Context,
	keys: readonly string[],
): Promise<DragonwildsStamp> => {
	const stamp = await readDragonwildsStamp(context);

	return await patchDragonwildsStamp(context, {
		settingsBaseline: {
			secrets: withoutKeys(stamp.settingsBaseline.secrets, keys),
			values: withoutKeys(stamp.settingsBaseline.values, keys),
		},
		settingsPending: withoutKeys(stamp.settingsPending, keys),
	});
};

export const changedPendingKeys = (stamp: DragonwildsStamp): string[] => {
	return Object.entries(stamp.settingsPending)
		.filter(([key, value]) => {
			if (SECRET_SETTING_KEYS.includes(key)) {
				return stamp.settingsBaseline.secrets[key] === true;
			}

			return !sameSettingValue(stamp.settingsBaseline.values[key], value);
		})
		.map(([key]) => key)
		.sort();
};

export const settingsAppliedActivity = (keys: readonly string[]): Bridge.Activity => {
	return {
		details: {
			count: keys.length,
			keys: keys.join(", "),
		},
		name: BridgeEventName.SettingsApplied,
		text: {
			ar: `تم تطبيق الإعدادات التي كانت بانتظار التشغيل (${keys.length})`,
			en: `Applied the settings that were waiting for the next start (${keys.length})`,
		},
	};
};

export const replayPendingSettings = async (
	context: Bridge.Context,
	stamp: DragonwildsStamp,
): Promise<DragonwildsStamp> => {
	const keys = Object.keys(stamp.settingsPending);

	if (keys.length === 0) {
		return stamp;
	}

	await writeConfig(context, stamp.settingsPending);

	context.log("wrote the settings saved while the server was running", {
		keys: keys.length,
	});

	const cleared = await patchDragonwildsStamp(context, {
		settingsBaseline: EMPTY_BASELINE,
		settingsPending: {},
	});

	const changed = changedPendingKeys(stamp);

	if (changed.length > 0) {
		context.activity.report(settingsAppliedActivity(changed));
	}

	return cleared;
};

export const splitRetained = (values: DragonwildsSettingRecord) => {
	const retained: DragonwildsSettingRecord = {};
	const rest: DragonwildsSettingRecord = {};

	for (const [key, value] of Object.entries(values)) {
		if (RETAINED_KEYS.includes(key)) {
			retained[key] = value;
		} else {
			rest[key] = value;
		}
	}

	return {
		rest,
		retained,
	};
};

const retainedValueOf = (key: string, value: Bridge.Value | undefined): DragonwildsSettingValue | null => {
	const text = typeof value === "string" ? value.trim() : "";

	if (text.length === 0) {
		return null;
	}

	const count = Number(text);

	return key === MAX_PLAYERS_KEY && Number.isInteger(count) ? count : text;
};

export const adoptedRetained = (stamp: DragonwildsStamp, config: Bridge.Values): DragonwildsSettingRecord => {
	const adopted: DragonwildsSettingRecord = {};

	for (const key of RETAINED_KEYS) {
		const value = retainedValueOf(key, config[key]);

		if (value !== null && !sameSettingValue(stamp.settingsRetained[key], value)) {
			adopted[key] = value;
		}
	}

	return adopted;
};

export const applyRetainedSettings = async (
	context: Bridge.Context,
	stamp: DragonwildsStamp,
): Promise<DragonwildsStamp> => {
	const adopted = adoptedRetained(stamp, await readConfig(context));
	const current =
		Object.keys(adopted).length === 0
			? stamp
			: await patchDragonwildsStamp(context, {
					settingsRetained: {
						...stamp.settingsRetained,
						...adopted,
					},
				});

	if (Object.keys(current.settingsRetained).length > 0) {
		await writeConfig(context, current.settingsRetained);
	}

	return current;
};

export const storedConfig = async (context: Bridge.Context): Promise<Bridge.Values> => {
	const stamp = await readDragonwildsStamp(context);
	const config = await readConfig(context);

	return {
		...config,
		...stamp.settingsRetained,
		...adoptedRetained(stamp, config),
		...stamp.settingsPending,
	};
};

const applyFileConfig = async (context: Bridge.Context, updates: DragonwildsSettingRecord) => {
	const keys = Object.keys(updates);

	if (keys.length === 0) {
		return;
	}

	if (context.server.running) {
		await recordPendingSettings(context, updates, await storedConfig(context));

		context.log("kept the change for the next start, the server rewrites its config itself", {
			keys: keys.length,
		});

		return;
	}

	await writeConfig(context, updates);
	await forgetPendingSettings(context, keys);
};

export const applyConfig = async (context: Bridge.Context, updates: DragonwildsSettingRecord) => {
	const { rest, retained } = splitRetained(updates);

	if (Object.keys(retained).length > 0) {
		const stamp = await readDragonwildsStamp(context);

		await patchDragonwildsStamp(context, {
			settingsRetained: {
				...stamp.settingsRetained,
				...retained,
			},
		});

		if (!context.server.running) {
			await writeConfig(context, retained);
		}
	}

	await applyFileConfig(context, rest);
};
