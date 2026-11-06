import { describe, expect, it } from "bun:test";
import { BridgeUserError } from "@serverkgg/bridge";
import { BridgeEventName } from "@serverkgg/bridge/protocol";
import { DEDICATED_SERVER_FILE, readDragonwildsStamp, SAVE_GAMES_DIRECTORY, WORLD_NAME_INVALID } from "../shared";
import { CONFIG_FILES, memoryContext } from "../testing";
import { CREATE_ACTION, NEW_WORLD_TAKEN, NEW_WORLD_WAITING, worldActions } from "./worldActions";

const create = async (context: Parameters<NonNullable<(typeof worldActions.actions)[string]>>[0], name: string) => {
	await worldActions.actions[CREATE_ACTION]?.(context, {
		name,
	});
};

const refusalOf = async (run: () => Promise<unknown>) => {
	try {
		await run();
	} catch (error) {
		return error instanceof BridgeUserError ? error.text : error;
	}

	return null;
};

describe("creating a new world", () => {
	it("names the new world in the config at once while stopped, so the next start creates it", async () => {
		const { activities, context, files } = memoryContext({
			files: {
				...CONFIG_FILES,
				[`${SAVE_GAMES_DIRECTORY}/Ashen.sav`]: "ashen",
			},
		});

		await create(context, "  Ember Vale ");

		expect(files.get(DEDICATED_SERVER_FILE)).toContain("DefaultWorldName=Ember Vale");
		expect(files.get(`${SAVE_GAMES_DIRECTORY}/Ashen.sav`)).toBe("ashen");
		expect(
			activities.map((activity) => [
				activity.name,
				activity.subject,
			]),
		).toEqual([
			[
				BridgeEventName.WorldCreated,
				"Ember Vale",
			],
		]);
	});

	it("keeps the name for the next start while the server runs", async () => {
		const { context, files } = memoryContext({
			files: CONFIG_FILES,
			running: true,
		});

		await create(context, "Ember");

		expect(files.get(DEDICATED_SERVER_FILE)).toContain("DefaultWorldName=Ashen");
		expect((await readDragonwildsStamp(context)).settingsPending).toEqual({
			DefaultWorldName: "Ember",
		});
	});

	it("refuses a name a save already has, and the name already waiting", async () => {
		const { context } = memoryContext({
			files: {
				...CONFIG_FILES,
				[`${SAVE_GAMES_DIRECTORY}/Tortuga.sav`]: "tortuga",
			},
		});

		expect(await refusalOf(() => create(context, "Tortuga"))).toEqual(NEW_WORLD_TAKEN);
		expect(await refusalOf(() => create(context, "Ashen"))).toEqual(NEW_WORLD_WAITING);
	});

	it("takes a name with letters of any script, dots and apostrophes", async () => {
		const { context, files } = memoryContext({
			files: CONFIG_FILES,
		});

		await create(context, "O'Brien مابي");

		expect(files.get(DEDICATED_SERVER_FILE)).toContain("DefaultWorldName=O'Brien مابي");
	});

	it("refuses a name outside the one world name gate, with its text", async () => {
		const { context } = memoryContext({
			files: CONFIG_FILES,
		});

		for (const name of [
			"",
			"ABCDEFGHIJKLMNOPQ",
			"../Logs",
			"a/b",
			"a..b",
		]) {
			expect(await refusalOf(() => create(context, name))).toEqual(WORLD_NAME_INVALID);
		}
	});
});
