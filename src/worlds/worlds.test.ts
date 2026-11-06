import { describe, expect, it } from "bun:test";
import { BridgeUserError } from "@serverkgg/bridge";
import { INSTALL_STAMP_FILE } from "@serverkgg/bridge/install";
import { BridgeEventName } from "@serverkgg/bridge/protocol";
import {
	DEDICATED_SERVER_FILE,
	readDragonwildsStamp,
	SAVE_GAMES_DIRECTORY,
	WORLD_NAME_INVALID,
	WORLD_UPLOAD_STAGING,
} from "../shared";
import { CONFIG_FILES, memoryContext, saveFixtureOf } from "../testing";
import {
	ACTIVATE_ACTION,
	ACTIVE_MARK,
	ACTIVE_WORLD_DELETE,
	ALREADY_ACTIVE,
	DELETE_ACTION,
	STOP_BEFORE_UPLOAD,
	UPLOAD_MISSING,
	WORLD_ALREADY_HERE,
	WORLD_MISSING,
	WORLD_RENAMED,
	worlds,
} from "./worlds";

const ASHEN = `${SAVE_GAMES_DIRECTORY}/Ashen.sav`;

const TORTUGA = `${SAVE_GAMES_DIRECTORY}/Tortuga.sav`;

const UPLOAD = `${WORLD_UPLOAD_STAGING}/0b6c1f3e/Isle.sav`;

const worldContext = (running = false, extra: Record<string, string> = {}) => {
	return memoryContext({
		files: {
			...CONFIG_FILES,
			[ASHEN]: "ashen world",
			[TORTUGA]: "tortuga world",
			...extra,
		},
		modified: {
			[ASHEN]: "2026-11-06T12:30:00.000Z",
			[TORTUGA]: "2026-11-05T12:30:00.000Z",
		},
		running,
	});
};

const rowOf = (id: string) => {
	return {
		id,
	};
};

const refusalOf = async (run: () => Promise<unknown>) => {
	try {
		await run();
	} catch (error) {
		return error instanceof BridgeUserError ? error.text : error;
	}

	return null;
};

describe("the worlds table", () => {
	it("lists every save newest first, marks the configured world, and gives each its own file to download", async () => {
		expect(await worlds.list(worldContext().context)).toEqual([
			{
				active: ACTIVE_MARK,
				id: "Ashen",
				modified: "2026-11-06 12:30 UTC",
				name: "Ashen",
				path: ASHEN,
				size: "11 B",
			},
			{
				active: "",
				id: "Tortuga",
				modified: "2026-11-05 12:30 UTC",
				name: "Tortuga",
				path: TORTUGA,
				size: "13 B",
			},
		]);
	});

	it("marks the world waiting for the next start as the active one", async () => {
		const { context } = worldContext(false, {
			[INSTALL_STAMP_FILE]: JSON.stringify({
				settingsPending: {
					DefaultWorldName: "Tortuga",
				},
			}),
		});

		expect(
			(await worlds.list(context)).map((row) => [
				row.id,
				row.active,
			]),
		).toEqual([
			[
				"Ashen",
				"",
			],
			[
				"Tortuga",
				ACTIVE_MARK,
			],
		]);
	});

	it("offers neither activate nor delete on the active row", async () => {
		const { context } = worldContext();
		const [active, other] = await worlds.list(context);

		expect(await worlds.unavailable?.(context, active ?? rowOf(""))).toEqual({
			[ACTIVATE_ACTION]: ALREADY_ACTIVE,
			[DELETE_ACTION]: ACTIVE_WORLD_DELETE,
		});
		expect(await worlds.unavailable?.(context, other ?? rowOf(""))).toEqual({});
	});
});

describe("activating a world", () => {
	it("writes the world name into the config at once while the server is stopped", async () => {
		const { activities, context, files } = worldContext();

		await worlds.actions?.[ACTIVATE_ACTION]?.(context, rowOf("Tortuga"), {});

		expect(files.get(DEDICATED_SERVER_FILE)).toContain("DefaultWorldName=Tortuga");
		expect(
			activities.map((activity) => [
				activity.name,
				activity.subject,
			]),
		).toEqual([
			[
				BridgeEventName.WorldActivated,
				"Tortuga",
			],
		]);
	});

	it("keeps the world name for the next start while the server runs, because the game rewrites its config", async () => {
		const { context, files } = worldContext(true);

		await worlds.actions?.[ACTIVATE_ACTION]?.(context, rowOf("Tortuga"), {});

		expect(files.get(DEDICATED_SERVER_FILE)).toContain("DefaultWorldName=Ashen");
		expect((await readDragonwildsStamp(context)).settingsPending).toEqual({
			DefaultWorldName: "Tortuga",
		});
	});

	it("refuses a save renamed by hand, because the game loads a world only from a file of its own name", async () => {
		const { context, files } = worldContext(false, {
			[TORTUGA]: saveFixtureOf("Ashen"),
		});

		expect(
			await refusalOf(() => worlds.actions?.[ACTIVATE_ACTION]?.(context, rowOf("Tortuga"), {}) ?? Promise.resolve()),
		).toEqual(WORLD_RENAMED);
		expect(files.get(DEDICATED_SERVER_FILE)).toContain("DefaultWorldName=Ashen");
	});

	it("refuses the active world and a world that has no file", async () => {
		const { context } = worldContext();

		expect(
			await refusalOf(() => worlds.actions?.[ACTIVATE_ACTION]?.(context, rowOf("Ashen"), {}) ?? Promise.resolve()),
		).toEqual(ALREADY_ACTIVE);
		expect(
			await refusalOf(() => worlds.actions?.[ACTIVATE_ACTION]?.(context, rowOf("../Logs/x"), {}) ?? Promise.resolve()),
		).toEqual(WORLD_MISSING);
	});
});

describe("deleting a world", () => {
	it("deletes the file of a world that isn't active, and the backup copy the game keeps beside it", async () => {
		const { activities, context, files } = worldContext(false, {
			[`${TORTUGA}.backup`]: "tortuga backup",
		});

		await worlds.actions?.[DELETE_ACTION]?.(context, rowOf("Tortuga"), {});

		expect(files.has(TORTUGA)).toBe(false);
		expect(files.has(`${TORTUGA}.backup`)).toBe(false);
		expect(files.has(ASHEN)).toBe(true);
		expect(activities.map((activity) => activity.name)).toEqual([
			BridgeEventName.WorldDeleted,
		]);
	});

	it("refuses the active world before touching any file", async () => {
		const { context, files } = worldContext();

		expect(
			await refusalOf(() => worlds.actions?.[DELETE_ACTION]?.(context, rowOf("Ashen"), {}) ?? Promise.resolve()),
		).toEqual(ACTIVE_WORLD_DELETE);
		expect(files.has(ASHEN)).toBe(true);
	});

	it("protects the delete, and nothing else", () => {
		expect(worlds.protectedActions).toEqual([
			DELETE_ACTION,
		]);
	});
});

describe("uploading a world", () => {
	it("moves the uploaded save into the saves folder under its own name and offers to activate it", async () => {
		const { activities, context, files } = worldContext(false, {
			[UPLOAD]: saveFixtureOf("Isle"),
		});

		const outcome = await worlds.add?.(context, UPLOAD);

		expect(files.get(`${SAVE_GAMES_DIRECTORY}/Isle.sav`)).toBe(saveFixtureOf("Isle"));
		expect(files.has(UPLOAD)).toBe(false);
		expect(outcome?.notice.en).toContain("activate it");
		expect(
			activities.map((activity) => [
				activity.name,
				activity.subject,
			]),
		).toEqual([
			[
				BridgeEventName.WorldImported,
				"Isle",
			],
		]);
	});

	it("refuses a save renamed before the upload, and leaves the saves folder alone", async () => {
		const renamed = `${WORLD_UPLOAD_STAGING}/0b6c1f3e/Renamed.sav`;
		const { context, files } = worldContext(false, {
			[renamed]: saveFixtureOf("Ashen"),
		});

		expect(await refusalOf(() => worlds.add?.(context, renamed) ?? Promise.resolve())).toEqual(WORLD_RENAMED);
		expect(files.has(`${SAVE_GAMES_DIRECTORY}/Renamed.sav`)).toBe(false);
	});

	it("takes a save whose header it can't read by its file name", async () => {
		const { context, files, logged } = worldContext(false, {
			[UPLOAD]: "isle world",
		});

		await worlds.add?.(context, UPLOAD);

		expect(files.has(`${SAVE_GAMES_DIRECTORY}/Isle.sav`)).toBe(true);
		expect(logged.some((entry) => entry.level === "warn")).toBe(true);
	});

	it("refuses while the server runs", async () => {
		const { context } = worldContext(true, {
			[UPLOAD]: "isle world",
		});

		expect(await refusalOf(() => worlds.add?.(context, UPLOAD) ?? Promise.resolve())).toEqual(STOP_BEFORE_UPLOAD);
	});

	it("refuses a name past the game's sixteen characters and a world already there", async () => {
		const long = `${WORLD_UPLOAD_STAGING}/0b6c1f3e/SeventeenLetters1.sav`;
		const twin = `${WORLD_UPLOAD_STAGING}/0b6c1f3e/Ashen.sav`;
		const { context, files } = worldContext(false, {
			[long]: "long",
			[twin]: "twin",
		});

		expect(await refusalOf(() => worlds.add?.(context, long) ?? Promise.resolve())).toEqual(WORLD_NAME_INVALID);
		expect(await refusalOf(() => worlds.add?.(context, twin) ?? Promise.resolve())).toEqual(WORLD_ALREADY_HERE);
		expect(files.get(ASHEN)).toBe("ashen world");
	});

	it("takes a save named with dots, apostrophes or letters of any script", async () => {
		const names = [
			"Ash.en",
			"O'Brien",
			"Café",
			"مابي",
		];
		const { context, files } = worldContext(
			false,
			Object.fromEntries(
				names.map((name) => [
					`${WORLD_UPLOAD_STAGING}/0b6c1f3e/${name}.sav`,
					saveFixtureOf(name),
				]),
			),
		);

		for (const name of names) {
			await worlds.add?.(context, `${WORLD_UPLOAD_STAGING}/0b6c1f3e/${name}.sav`);

			expect(files.has(`${SAVE_GAMES_DIRECTORY}/${name}.sav`)).toBe(true);
		}
	});

	it("refuses a file name outside the world name gate with the same text the forms show", async () => {
		const edged = `${WORLD_UPLOAD_STAGING}/0b6c1f3e/Ashen .sav`;
		const doubled = `${WORLD_UPLOAD_STAGING}/0b6c1f3e/Ash..en.sav`;
		const { context } = worldContext(false, {
			[doubled]: saveFixtureOf("Ash..en"),
			[edged]: saveFixtureOf("Ashen "),
		});

		for (const input of [
			edged,
			doubled,
		]) {
			expect(await refusalOf(() => worlds.add?.(context, input) ?? Promise.resolve())).toEqual(WORLD_NAME_INVALID);
		}
	});

	it("refuses a file outside the world staging folder or one that isn't a save", async () => {
		const { context } = worldContext(false, {
			".serverk-uploads/mod/x/Isle.sav": "elsewhere",
			[`${WORLD_UPLOAD_STAGING}/x/Isle.zip`]: "zip",
		});

		for (const input of [
			".serverk-uploads/mod/x/Isle.sav",
			`${WORLD_UPLOAD_STAGING}/x/Isle.zip`,
			`${WORLD_UPLOAD_STAGING}/x/Missing.sav`,
			"/etc/passwd",
			`${WORLD_UPLOAD_STAGING}/../${ASHEN}`,
		]) {
			expect(await refusalOf(() => worlds.add?.(context, input) ?? Promise.resolve())).toEqual(UPLOAD_MISSING);
		}
	});
});
