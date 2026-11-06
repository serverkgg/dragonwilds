import { type Bridge, BridgeKind, BridgeUserError } from "@serverkgg/bridge";
import { BridgeEventName } from "@serverkgg/bridge/protocol";
import { formatByteSize } from "@serverkgg/bridge/utils";
import { DISABLED_SUFFIX, type DragonwildsMod, disabledPathOf, enabledPathOf, listMods } from "./modFiles";
import { addModUpload } from "./modUpload";

export const DISABLE_ACTION = "disable";

export const ENABLE_ACTION = "enable";

export const REMOVE_MOD_ACTION = "remove";

export const MOD_ON: Bridge.Text = {
	ar: "مفعّل",
	en: "On",
};

export const MOD_OFF: Bridge.Text = {
	ar: "موقوف",
	en: "Off",
};

export const MOD_MISSING: Bridge.Text = {
	ar: "تعذّر العثور على هذا المود في سيرفرك. حدّث القائمة.",
	en: "We couldn't find this mod on your server. Refresh the list.",
};

export const ALREADY_OFF: Bridge.Text = {
	ar: "هذا المود موقوف أصلًا.",
	en: "This mod is already off.",
};

export const ALREADY_ON: Bridge.Text = {
	ar: "هذا المود مفعّل أصلًا.",
	en: "This mod is already on.",
};

export const MOD_FILE_CONFLICT: Bridge.Text = {
	ar: "يوجد ملف بالاسم نفسه في مجلد المودات. أزل أحد الملفين من تبويب الملفات، ثم جرب مرة ثانية.",
	en: "A file with the same name is already in the mods folder. Remove one of the two from the Files tab, then try again.",
};

export interface ModRow extends Bridge.Row {
	id: string;
	name: string;
	size: string;
	enabled: Bridge.Text;
}

export const modRowOf = (mod: DragonwildsMod): ModRow => {
	return {
		enabled: mod.enabled ? MOD_ON : MOD_OFF,
		id: mod.id,
		name: mod.name,
		size: formatByteSize(mod.sizeBytes),
	};
};

const modOfRow = async (context: Bridge.Context, row: Bridge.Row) => {
	const mod = (await listMods(context)).find((entry) => entry.id === row.id);

	if (mod === undefined) {
		throw new BridgeUserError(MOD_MISSING);
	}

	return mod;
};

const renameAll = async (context: Bridge.Context, mod: DragonwildsMod, targetOf: (path: string) => string) => {
	for (const file of mod.files) {
		if (await context.files.exists(targetOf(file.path))) {
			throw new BridgeUserError(MOD_FILE_CONFLICT);
		}
	}

	for (const file of mod.files) {
		await context.files.move(file.path, targetOf(file.path));
	}
};

const modActivity = (name: BridgeEventName, mod: DragonwildsMod, text: Bridge.Text): Bridge.Activity => {
	return {
		details: {
			files: mod.files.length,
			mod: mod.name,
		},
		name,
		subject: mod.name,
		text,
	};
};

export const mods: Bridge.Collection = {
	kind: BridgeKind.Collection,
	async list(context) {
		return (await listMods(context)).map(modRowOf);
	},
	async add(context, input) {
		return await addModUpload(context, input);
	},
	actions: {
		async [DISABLE_ACTION](context, row) {
			const mod = await modOfRow(context, row);

			if (!mod.enabled) {
				throw new BridgeUserError(ALREADY_OFF);
			}

			await renameAll(context, mod, disabledPathOf);

			context.log("disabled a mod", {
				mod: mod.name,
			});
			context.activity.report(
				modActivity(BridgeEventName.ModDisabled, mod, {
					ar: `تم إيقاف مود ${mod.name}، ويُطبَّق في التشغيل القادم`,
					en: `Disabled mod ${mod.name}, takes effect at the next start`,
				}),
			);
		},
		async [ENABLE_ACTION](context, row) {
			const mod = await modOfRow(context, row);

			if (mod.enabled) {
				throw new BridgeUserError(ALREADY_ON);
			}

			await renameAll(context, mod, enabledPathOf);

			context.log("enabled a mod", {
				mod: mod.name,
			});
			context.activity.report(
				modActivity(BridgeEventName.ModEnabled, mod, {
					ar: `تم تفعيل مود ${mod.name}، ويُطبَّق في التشغيل القادم`,
					en: `Enabled mod ${mod.name}, takes effect at the next start`,
				}),
			);
		},
		async [REMOVE_MOD_ACTION](context, row) {
			const mod = await modOfRow(context, row);

			for (const file of mod.files) {
				await context.files.remove(file.path);
			}

			context.log("removed a mod", {
				mod: mod.name,
			});
			context.activity.report(
				modActivity(BridgeEventName.ModRemoved, mod, {
					ar: `تمت إزالة مود ${mod.name}`,
					en: `Removed mod ${mod.name}`,
				}),
			);
		},
	},
	async unavailable(_context, row): Promise<Bridge.Unavailable> {
		return row.id.endsWith(DISABLED_SUFFIX)
			? {
					[DISABLE_ACTION]: ALREADY_OFF,
				}
			: {
					[ENABLE_ACTION]: ALREADY_ON,
				};
	},
};
