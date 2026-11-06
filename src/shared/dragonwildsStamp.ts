import type { Bridge } from "@serverkgg/bridge";
import { readStamp, writeStamp } from "@serverkgg/bridge/install";

export type DragonwildsSettingValue = string | number | boolean;

export type DragonwildsSettingRecord = Record<string, DragonwildsSettingValue>;

export interface DragonwildsBaseline {
	values: DragonwildsSettingRecord;
	secrets: Record<string, boolean>;
}

export interface DragonwildsStamp {
	buildId: string | null;
	settingsPending: DragonwildsSettingRecord;
	settingsBaseline: DragonwildsBaseline;
	settingsRetained: DragonwildsSettingRecord;
	ownerVerified: boolean;
}

const objectOf = (value: unknown): Record<string, unknown> => {
	return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
};

const nullableString = (value: unknown) => {
	return typeof value === "string" && value.length > 0 ? value : null;
};

export const settingRecordOf = (value: unknown): DragonwildsSettingRecord => {
	const record: DragonwildsSettingRecord = {};

	for (const [key, entry] of Object.entries(objectOf(value))) {
		if (
			typeof entry === "string"
			|| typeof entry === "boolean"
			|| (typeof entry === "number" && Number.isFinite(entry))
		) {
			record[key] = entry;
		}
	}

	return record;
};

export const secretFlagsOf = (value: unknown): Record<string, boolean> => {
	const flags: Record<string, boolean> = {};

	for (const [key, entry] of Object.entries(objectOf(value))) {
		if (typeof entry === "boolean") {
			flags[key] = entry;
		}
	}

	return flags;
};

export const normalizeStamp = (raw: unknown): DragonwildsStamp => {
	const stamp = objectOf(raw);
	const baseline = objectOf(stamp.settingsBaseline);

	return {
		buildId: nullableString(stamp.buildId),
		ownerVerified: stamp.ownerVerified === true,
		settingsBaseline: {
			secrets: secretFlagsOf(baseline.secrets),
			values: settingRecordOf(baseline.values),
		},
		settingsPending: settingRecordOf(stamp.settingsPending),
		settingsRetained: settingRecordOf(stamp.settingsRetained),
	};
};

export const readDragonwildsStamp = async (context: Bridge.Context): Promise<DragonwildsStamp> => {
	return normalizeStamp(await readStamp(context));
};

export const patchDragonwildsStamp = async (
	context: Bridge.Context,
	patch: Partial<DragonwildsStamp>,
): Promise<DragonwildsStamp> => {
	const stamp = normalizeStamp({
		...(await readDragonwildsStamp(context)),
		...patch,
	});

	await writeStamp(context, stamp);

	return stamp;
};
