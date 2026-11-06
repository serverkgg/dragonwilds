import type { Bridge } from "@serverkgg/bridge";
import { SAVE_GAMES_DIRECTORY, WORLD_EXTENSION } from "./dragonwildsApp";
import { readConfig, textOf, WORLD_NAME_KEY } from "./dragonwildsConfig";
import { storedConfig } from "./dragonwildsPending";

export interface DragonwildsWorld {
	name: string;
	path: string;
	sizeBytes: number;
	modifiedAt: string;
	active: boolean;
}

const WORLD_GLOB = `${SAVE_GAMES_DIRECTORY}/*${WORLD_EXTENSION}`;

export const WORLD_BACKUP_SUFFIX = ".backup";

export const SAVE_HEADER_BYTES = 4096;

export const WORLD_MAP_PREFIX = "L_";

const NUL = "\u0000";

const STRING_PADDING = 3;

export const worldNameOf = (file: string) => {
	return file.toLowerCase().endsWith(WORLD_EXTENSION) ? file.slice(0, -WORLD_EXTENSION.length) : file;
};

export const worldPathOf = (name: string) => {
	return `${SAVE_GAMES_DIRECTORY}/${name}${WORLD_EXTENSION}`;
};

export const readWorldName = async (context: Bridge.Context) => {
	return textOf(await storedConfig(context), WORLD_NAME_KEY);
};

export const readLoadedWorldName = async (context: Bridge.Context) => {
	return textOf(await readConfig(context), WORLD_NAME_KEY);
};

const lengthPrefixOf = (token: string) => {
	return token.length === 0 ? -1 : token.charCodeAt(token.length - 1);
};

const paddedBefore = (tokens: readonly string[], index: number) => {
	return tokens.slice(index - STRING_PADDING + 1, index).every((token) => token === "");
};

export const saveWorldNameOf = (header: string): string | null => {
	const tokens = header.split(NUL);

	for (let index = STRING_PADDING; index + STRING_PADDING + 1 < tokens.length; index++) {
		const name = tokens[index] ?? "";
		const map = tokens[index + STRING_PADDING + 1] ?? "";

		if (
			name.length > 0
			&& map.startsWith(WORLD_MAP_PREFIX)
			&& paddedBefore(tokens, index)
			&& paddedBefore(tokens, index + STRING_PADDING + 1)
			&& lengthPrefixOf(tokens[index - STRING_PADDING] ?? "") === name.length + 1
			&& lengthPrefixOf(tokens[index + 1] ?? "") === map.length + 1
		) {
			return name;
		}
	}

	return null;
};

export const readSaveWorldName = async (context: Bridge.Context, path: string): Promise<string | null> => {
	const head = await context.exec([
		"head",
		"-c",
		String(SAVE_HEADER_BYTES),
		path,
	]);

	return head.code === 0 ? saveWorldNameOf(head.stdout) : null;
};

const newestFirst = (left: Bridge.FileEntry, right: Bridge.FileEntry) => {
	return Date.parse(right.modifiedAt) - Date.parse(left.modifiedAt);
};

export const listWorlds = async (context: Bridge.Context, worldName: string): Promise<DragonwildsWorld[]> => {
	if (!(await context.files.exists(SAVE_GAMES_DIRECTORY))) {
		return [];
	}

	const saves = (await context.files.list(WORLD_GLOB)).filter((entry) => {
		return !entry.directory && entry.name.endsWith(WORLD_EXTENSION);
	});

	return saves.sort(newestFirst).map((entry) => {
		const name = worldNameOf(entry.name);

		return {
			active: name === worldName,
			modifiedAt: entry.modifiedAt,
			name,
			path: entry.path,
			sizeBytes: entry.sizeBytes,
		};
	});
};
