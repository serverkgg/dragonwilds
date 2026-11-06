import { describe, expect, it } from "bun:test";
import { INSTALL_STAMP_FILE } from "@serverkgg/bridge/install";
import { CONFIG_FILES, memoryContext, saveFixtureOf } from "../testing";
import { SAVE_GAMES_DIRECTORY } from "./dragonwildsApp";
import {
	listWorlds,
	readLoadedWorldName,
	readSaveWorldName,
	readWorldName,
	saveWorldNameOf,
	worldNameOf,
	worldPathOf,
} from "./dragonwildsWorlds";

describe("the world files", () => {
	it("marks the save named after the configured world active, newest first, and ignores subfolders", async () => {
		const { context } = memoryContext({
			files: {
				[`${SAVE_GAMES_DIRECTORY}/Ashen.sav`]: "newest",
				[`${SAVE_GAMES_DIRECTORY}/Old.sav`]: "older",
				[`${SAVE_GAMES_DIRECTORY}/backup/Ashen.sav`]: "nested",
				[`${SAVE_GAMES_DIRECTORY}/notes.txt`]: "not a save",
			},
			modified: {
				[`${SAVE_GAMES_DIRECTORY}/Ashen.sav`]: "2026-11-06T12:30:00.000Z",
				[`${SAVE_GAMES_DIRECTORY}/Old.sav`]: "2026-11-05T12:30:00.000Z",
			},
		});

		expect(
			(await listWorlds(context, "Old")).map((world) => [
				world.name,
				world.active,
			]),
		).toEqual([
			[
				"Ashen",
				false,
			],
			[
				"Old",
				true,
			],
		]);
	});

	it("lists nothing before the first world exists", async () => {
		expect(await listWorlds(memoryContext().context, "Ashen")).toEqual([]);
	});

	it("names a world after its file without the extension, and places a name in the saves folder", () => {
		expect(worldNameOf("Ashen.sav")).toBe("Ashen");
		expect(worldNameOf("Ashen.SAV")).toBe("Ashen");
		expect(worldPathOf("Ashen")).toBe(`${SAVE_GAMES_DIRECTORY}/Ashen.sav`);
	});

	it("reads the configured world with a pending name over the file, and the loaded world from the file", async () => {
		const { context } = memoryContext({
			files: {
				...CONFIG_FILES,
				[INSTALL_STAMP_FILE]: JSON.stringify({
					settingsPending: {
						DefaultWorldName: "Tortuga",
					},
				}),
			},
		});

		expect(await readWorldName(context)).toBe("Tortuga");
		expect(await readLoadedWorldName(context)).toBe("Ashen");
	});

	it("reads the world name a save holds from its header", async () => {
		const { context } = memoryContext({
			files: {
				[`${SAVE_GAMES_DIRECTORY}/Ashen.sav`]: saveFixtureOf("Ashen"),
			},
		});

		expect(await readSaveWorldName(context, `${SAVE_GAMES_DIRECTORY}/Ashen.sav`)).toBe("Ashen");
		expect(await readSaveWorldName(context, `${SAVE_GAMES_DIRECTORY}/Missing.sav`)).toBeNull();
	});

	it("reads the world name from the header layout of a real save, and nothing from a file of another kind", () => {
		const real = [
			"SAVEp\u00f4\u0000\u0000INFO,\u0002\u0000\u0000",
			"\t\u0000\u0000\u00001dExjC\ufffd\ufffd\u007f\ufffd\ufffdj\ufffd",
			"\u000e\u0000\u0000\u0000Serverk523151\u0000\b\u0000\u0000\u0000L_World\u0000\u0000\u0000\u0000",
		].join("");

		expect(saveWorldNameOf(real)).toBe("Serverk523151");
		expect(saveWorldNameOf("not a save")).toBeNull();
		expect(saveWorldNameOf("")).toBeNull();
	});
});
