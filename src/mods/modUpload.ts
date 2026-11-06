import { type Bridge, BridgeUserError } from "@serverkgg/bridge";
import { BridgeEventName } from "@serverkgg/bridge/protocol";
import { relativeUploadPath } from "@serverkgg/bridge/utils";
import { MOD_UPLOAD_STAGING, MODS_DIRECTORY } from "../shared";
import {
	baseNameOf,
	DISABLED_SUFFIX,
	MOD_FILE_EXTENSIONS,
	PAK_EXTENSION,
	PAK_SIBLING_EXTENSIONS,
	pakStemOf,
	parentOf,
} from "./modFiles";

export const ZIP_EXTENSION = ".zip";

export const EXTRACT_FOLDER = "extracted";

export const NO_MATCHING_FILES = /contained no matching files/;

const SUMMARY_LIMIT = 8;

const PAIR = 2;

const FEW_LIMIT = 10;

export const MOD_UPLOAD_MISSING: Bridge.Text = {
	ar: "تعذّر العثور على الملف الذي رفعته. ارفعه مرة ثانية.",
	en: "We couldn't find the file you uploaded. Upload it again.",
};

export const NO_PAK: Bridge.Text = {
	ar: "لا يوجد ملف ‎.pak داخل الملف الذي رفعته. ارفع ملف zip للمود كما نزّلته، أو ملف ‎.pak الخاص به.",
	en: "There's no .pak file in what you uploaded. Upload the mod's zip as you downloaded it, or its .pak file.",
};

export const UNREADABLE_ZIP: Bridge.Text = {
	ar: "تعذّر فتح ملف zip الذي رفعته. نزّله مرة ثانية من صفحة المود، ثم ارفعه.",
	en: "We couldn't open the zip you uploaded. Download it again from the mod's page, then upload it.",
};

export const MOD_ALREADY_HERE: Bridge.Text = {
	ar: "يوجد على سيرفرك مود بالاسم نفسه، فلا نستبدله. أزل المود الموجود أولًا، ثم ارفع إصداره الجديد.",
	en: "Your server already has a mod with the same name, and we don't replace it. Remove that mod first, then upload its new version.",
};

export const DUPLICATE_PAK: Bridge.Text = {
	ar: "يحتوي الملف على أكثر من مود بالاسم نفسه. ارفع كل مود في ملف zip مستقل.",
	en: "The upload holds more than one mod with the same name. Upload each mod in its own zip.",
};

export interface StagedMod {
	name: string;
	files: string[];
}

const uploadedModOf = async (context: Bridge.Context, input: string) => {
	const source = relativeUploadPath(input);
	const lower = source?.toLowerCase() ?? "";

	if (
		source === null
		|| !source.startsWith(`${MOD_UPLOAD_STAGING}/`)
		|| !(lower.endsWith(ZIP_EXTENSION) || lower.endsWith(PAK_EXTENSION))
		|| !(await context.files.exists(source))
	) {
		throw new BridgeUserError(MOD_UPLOAD_MISSING);
	}

	return source;
};

export const stagedModsOf = (paths: readonly string[]): StagedMod[] => {
	const mods: StagedMod[] = [];

	for (const path of paths) {
		const name = baseNameOf(path);
		const stem = name.toLowerCase().endsWith(PAK_EXTENSION) ? pakStemOf(name) : null;

		if (stem === null) {
			continue;
		}

		const directory = parentOf(path);
		const siblings = PAK_SIBLING_EXTENSIONS.map((extension) => `${stem}${extension}`.toLowerCase());

		mods.push({
			files: [
				path,
				...paths.filter((other) => parentOf(other) === directory && siblings.includes(baseNameOf(other).toLowerCase())),
			],
			name: stem,
		});
	}

	return mods;
};

const extractedOf = async (context: Bridge.Context, source: string, scratch: string) => {
	try {
		return await context.files.extract(source, scratch, {
			extensions: MOD_FILE_EXTENSIONS,
			tree: true,
		});
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);

		context.log.warn("an uploaded mod zip could not be extracted", {
			error: message,
		});

		throw new BridgeUserError(NO_MATCHING_FILES.test(message) ? NO_PAK : UNREADABLE_ZIP, {
			cause: error,
		});
	}
};

const targetOf = (path: string) => {
	return `${MODS_DIRECTORY}/${baseNameOf(path)}`;
};

const requirePlaceable = async (context: Bridge.Context, mods: readonly StagedMod[]) => {
	const targets = mods.flatMap((mod) => mod.files.map((path) => targetOf(path).toLowerCase()));

	if (new Set(targets).size !== targets.length) {
		throw new BridgeUserError(DUPLICATE_PAK);
	}

	for (const mod of mods) {
		for (const path of mod.files) {
			const target = targetOf(path);

			if ((await context.files.exists(target)) || (await context.files.exists(`${target}${DISABLED_SUFFIX}`))) {
				throw new BridgeUserError(MOD_ALREADY_HERE);
			}
		}
	}
};

export const modCountOf = (count: number): Bridge.Text => {
	if (count === PAIR) {
		return {
			ar: "مودين",
			en: "2 mods",
		};
	}

	return {
		ar: count <= FEW_LIMIT ? `${count} مودات` : `${count} مودًا`,
		en: `${count} mods`,
	};
};

export const installedActivity = (names: readonly string[]): Bridge.Activity => {
	const shown = names.slice(0, SUMMARY_LIMIT);

	return {
		details: {
			count: names.length,
			mods: names.join(", "),
		},
		name: BridgeEventName.ModInstalled,
		subject: names.join(", "),
		text:
			names.length === 1
				? {
						ar: `تم تثبيت مود ${names[0]}`,
						en: `Installed mod ${names[0]}`,
					}
				: {
						ar: `تم تثبيت المودات ${shown.join("، ")} (${names.length})`,
						en: `Installed mods ${shown.join(", ")} (${names.length})`,
					},
	};
};

export const addModUpload = async (context: Bridge.Context, input: string): Promise<Bridge.AddOutcome> => {
	const source = await uploadedModOf(context, input);
	const scratch = `${parentOf(source)}/${EXTRACT_FOLDER}`;

	try {
		const paths = source.toLowerCase().endsWith(ZIP_EXTENSION)
			? await extractedOf(context, source, scratch)
			: [
					source,
				];
		const mods = stagedModsOf(paths);

		if (mods.length === 0) {
			throw new BridgeUserError(NO_PAK);
		}

		await requirePlaceable(context, mods);
		await context.files.ensure(MODS_DIRECTORY);

		for (const mod of mods) {
			for (const path of mod.files) {
				await context.files.move(path, targetOf(path));
			}
		}

		const names = mods.map((mod) => mod.name);

		context.log("installed an uploaded mod", {
			mods: names.join(", "),
		});
		context.activity.report(installedActivity(names));

		return {
			notice:
				names.length === 1
					? {
							ar: `تم تثبيت مود ${names[0]}، نفّذ ريستارت لسيرفرك ليشتغل`,
							en: `Installed mod ${names[0]}, restart your server to run it`,
						}
					: {
							ar: `تم تثبيت ${modCountOf(names.length).ar}، نفّذ ريستارت لسيرفرك لتشتغل`,
							en: `Installed ${modCountOf(names.length).en}, restart your server to run them`,
						},
		};
	} finally {
		await context.files.remove(scratch);
		await context.files.remove(source);
	}
};
