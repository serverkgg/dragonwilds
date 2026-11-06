import { describe, expect, it } from "bun:test";
import { BridgeUserError } from "@serverkgg/bridge";
import { BridgeEventName } from "@serverkgg/bridge/protocol";
import { MODS_DIRECTORY } from "../shared";
import { memoryContext } from "../testing";
import {
	ALREADY_OFF,
	ALREADY_ON,
	DISABLE_ACTION,
	ENABLE_ACTION,
	MOD_FILE_CONFLICT,
	MOD_MISSING,
	MOD_OFF,
	MOD_ON,
	mods,
	REMOVE_MOD_ACTION,
} from "./mods";

const ASHEN = {
	[`${MODS_DIRECTORY}/Ashen_P.pak`]: "pak",
	[`${MODS_DIRECTORY}/Ashen_P.ucas`]: "ucas",
	[`${MODS_DIRECTORY}/Ashen_P.utoc`]: "utoc",
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

describe("the mods table", () => {
	it("lists each mod with its size and whether it runs", async () => {
		expect(
			await mods.list(
				memoryContext({
					files: ASHEN,
				}).context,
			),
		).toEqual([
			{
				enabled: MOD_ON,
				id: "Ashen_P.pak",
				name: "Ashen_P",
				size: "11 B",
			},
		]);
	});

	it("turns a mod off by renaming its three files, and back on", async () => {
		const { activities, context, files } = memoryContext({
			files: ASHEN,
		});

		await mods.actions?.[DISABLE_ACTION]?.(context, rowOf("Ashen_P.pak"), {});

		expect(
			[
				...files.keys(),
			].sort(),
		).toEqual([
			`${MODS_DIRECTORY}/Ashen_P.pak.disabled`,
			`${MODS_DIRECTORY}/Ashen_P.ucas.disabled`,
			`${MODS_DIRECTORY}/Ashen_P.utoc.disabled`,
		]);
		expect((await mods.list(context)).at(0)?.enabled).toEqual(MOD_OFF);

		await mods.actions?.[ENABLE_ACTION]?.(context, rowOf("Ashen_P.pak.disabled"), {});

		expect(
			[
				...files.keys(),
			].sort(),
		).toEqual(Object.keys(ASHEN).sort());
		expect(activities.map((activity) => activity.name)).toEqual([
			BridgeEventName.ModDisabled,
			BridgeEventName.ModEnabled,
		]);
	});

	it("removes a mod's files and leaves the others", async () => {
		const { activities, context, files } = memoryContext({
			files: {
				...ASHEN,
				[`${MODS_DIRECTORY}/Bloom_P.pak`]: "bloom",
			},
		});

		await mods.actions?.[REMOVE_MOD_ACTION]?.(context, rowOf("Ashen_P.pak"), {});

		expect(
			[
				...files.keys(),
			].sort(),
		).toEqual([
			`${MODS_DIRECTORY}/Bloom_P.pak`,
		]);
		expect(activities.map((activity) => activity.name)).toEqual([
			BridgeEventName.ModRemoved,
		]);
	});

	it("refuses a mod it can't find, a toggle to the state it's in, and a rename onto a file already there", async () => {
		const { context, files } = memoryContext({
			files: {
				...ASHEN,
				[`${MODS_DIRECTORY}/Ashen_P.utoc.disabled`]: "stray",
			},
		});

		expect(
			await refusalOf(() => mods.actions?.[REMOVE_MOD_ACTION]?.(context, rowOf("../Saved"), {}) ?? Promise.resolve()),
		).toEqual(MOD_MISSING);
		expect(
			await refusalOf(() => mods.actions?.[ENABLE_ACTION]?.(context, rowOf("Ashen_P.pak"), {}) ?? Promise.resolve()),
		).toEqual(ALREADY_ON);
		expect(
			await refusalOf(() => mods.actions?.[DISABLE_ACTION]?.(context, rowOf("Ashen_P.pak"), {}) ?? Promise.resolve()),
		).toEqual(MOD_FILE_CONFLICT);
		expect(files.has(`${MODS_DIRECTORY}/Ashen_P.pak`)).toBe(true);
	});

	it("offers only the toggle a mod can take", async () => {
		const { context } = memoryContext();

		expect(await mods.unavailable?.(context, rowOf("Ashen_P.pak"))).toEqual({
			[ENABLE_ACTION]: ALREADY_ON,
		});
		expect(await mods.unavailable?.(context, rowOf("Ashen_P.pak.disabled"))).toEqual({
			[DISABLE_ACTION]: ALREADY_OFF,
		});
	});

	it("protects no mod action, because each one comes back by upload or toggle", () => {
		expect(mods.protectedActions).toBeUndefined();
	});
});
