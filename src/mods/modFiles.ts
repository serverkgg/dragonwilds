import type { Bridge } from "@serverkgg/bridge";
import { MODS_DIRECTORY } from "../shared";

export const PAK_EXTENSION = ".pak";

export const PAK_SIBLING_EXTENSIONS: readonly string[] = [
	".utoc",
	".ucas",
];

export const MOD_FILE_EXTENSIONS: string[] = [
	"pak",
	"utoc",
	"ucas",
];

export const DISABLED_SUFFIX = ".disabled";

const MOD_GLOB = `${MODS_DIRECTORY}/**`;

export interface DragonwildsMod {
	id: string;
	name: string;
	enabled: boolean;
	files: Bridge.FileEntry[];
	sizeBytes: number;
}

export const parentOf = (path: string) => {
	return path.split("/").slice(0, -1).join("/");
};

export const baseNameOf = (path: string) => {
	return path.split("/").at(-1) ?? "";
};

export const pakStemOf = (name: string) => {
	const lower = name.toLowerCase();

	if (lower.endsWith(PAK_EXTENSION)) {
		return name.slice(0, -PAK_EXTENSION.length);
	}

	if (lower.endsWith(`${PAK_EXTENSION}${DISABLED_SUFFIX}`)) {
		return name.slice(0, -(PAK_EXTENSION.length + DISABLED_SUFFIX.length));
	}

	return null;
};

export const siblingNamesOf = (stem: string, enabled: boolean) => {
	const suffix = enabled ? "" : DISABLED_SUFFIX;

	return [
		PAK_EXTENSION,
		...PAK_SIBLING_EXTENSIONS,
	].map((extension) => `${stem}${extension}${suffix}`.toLowerCase());
};

export const modsOf = (entries: readonly Bridge.FileEntry[]): DragonwildsMod[] => {
	const files = entries.filter((entry) => !entry.directory);
	const mods: DragonwildsMod[] = [];

	for (const entry of files) {
		const stem = pakStemOf(entry.name);

		if (stem === null) {
			continue;
		}

		const enabled = entry.name.toLowerCase().endsWith(PAK_EXTENSION);
		const directory = parentOf(entry.path);
		const names = siblingNamesOf(stem, enabled);
		const trio = files.filter((file) => parentOf(file.path) === directory && names.includes(file.name.toLowerCase()));

		mods.push({
			enabled,
			files: trio,
			id: entry.path.slice(MODS_DIRECTORY.length + 1),
			name: stem,
			sizeBytes: trio.reduce((total, file) => total + file.sizeBytes, 0),
		});
	}

	return mods.sort((left, right) => left.name.localeCompare(right.name));
};

export const listMods = async (context: Bridge.Context): Promise<DragonwildsMod[]> => {
	if (!(await context.files.exists(MODS_DIRECTORY))) {
		return [];
	}

	return modsOf(await context.files.list(MOD_GLOB));
};

export const disabledPathOf = (path: string) => {
	return `${path}${DISABLED_SUFFIX}`;
};

export const enabledPathOf = (path: string) => {
	return path.endsWith(DISABLED_SUFFIX) ? path.slice(0, -DISABLED_SUFFIX.length) : path;
};
