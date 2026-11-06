import { describe, expect, it } from "bun:test";
import { BridgeUserError } from "@serverkgg/bridge";
import { BridgeEventName } from "@serverkgg/bridge/protocol";
import { MOD_UPLOAD_STAGING, MODS_DIRECTORY } from "../shared";
import { memoryContext } from "../testing";
import {
	addModUpload,
	DUPLICATE_PAK,
	MOD_ALREADY_HERE,
	MOD_UPLOAD_MISSING,
	modCountOf,
	NO_PAK,
	stagedModsOf,
	UNREADABLE_ZIP,
} from "./modUpload";

const FOLDER = `${MOD_UPLOAD_STAGING}/5f1c`;

const ZIP = `${FOLDER}/Ashen.zip`;

const refusalOf = async (run: () => Promise<unknown>) => {
	try {
		await run();
	} catch (error) {
		return error instanceof BridgeUserError ? error.text : error;
	}

	return null;
};

describe("uploading a mod", () => {
	it("moves an uploaded pak into the mods folder under its own name", async () => {
		const pak = `${FOLDER}/Ashen_P.pak`;
		const { activities, context, files } = memoryContext({
			files: {
				[pak]: "pak",
			},
		});

		const outcome = await addModUpload(context, pak);

		expect(files.get(`${MODS_DIRECTORY}/Ashen_P.pak`)).toBe("pak");
		expect(files.has(pak)).toBe(false);
		expect(outcome.notice.en).toBe("Installed mod Ashen_P, restart your server to run it");
		expect(
			activities.map((activity) => [
				activity.name,
				activity.text.en,
			]),
		).toEqual([
			[
				BridgeEventName.ModInstalled,
				"Installed mod Ashen_P",
			],
		]);
	});

	it("finds every pak in a zip, nested or not, and moves each with its siblings flat into the mods folder", async () => {
		const { context, files } = memoryContext({
			archives: {
				[ZIP]: {
					"Ashen/~mods/Ashen_P.pak": "pak",
					"Ashen/~mods/Ashen_P.ucas": "ucas",
					"Ashen/~mods/Ashen_P.utoc": "utoc",
					"Bloom_P.pak": "bloom",
					"readme.txt": "read me",
				},
			},
			files: {
				[ZIP]: "zip",
			},
		});

		const outcome = await addModUpload(context, ZIP);

		expect(
			[
				...files.keys(),
			].sort(),
		).toEqual([
			`${MODS_DIRECTORY}/Ashen_P.pak`,
			`${MODS_DIRECTORY}/Ashen_P.ucas`,
			`${MODS_DIRECTORY}/Ashen_P.utoc`,
			`${MODS_DIRECTORY}/Bloom_P.pak`,
		]);
		expect(outcome.notice.ar).toContain("مودين");
	});

	it("refuses a zip with no pak, an unreadable zip, and a name already installed, before placing anything", async () => {
		const empty = `${FOLDER}/Empty.zip`;
		const broken = `${FOLDER}/Broken.zip`;
		const twin = `${FOLDER}/Twin.zip`;
		const { context, files } = memoryContext({
			archives: {
				[empty]: {
					"Ashen_P.utoc": "utoc",
				},
				[twin]: {
					"Ashen_P.pak": "new",
					"Crow_P.pak": "crow",
				},
			},
			files: {
				[broken]: "not a zip",
				[empty]: "zip",
				[`${MODS_DIRECTORY}/Ashen_P.pak.disabled`]: "old",
				[twin]: "zip",
			},
		});

		expect(await refusalOf(() => addModUpload(context, empty))).toEqual(NO_PAK);
		expect(await refusalOf(() => addModUpload(context, broken))).toEqual(UNREADABLE_ZIP);
		expect(await refusalOf(() => addModUpload(context, twin))).toEqual(MOD_ALREADY_HERE);
		expect(files.get(`${MODS_DIRECTORY}/Ashen_P.pak.disabled`)).toBe("old");
		expect(files.has(`${MODS_DIRECTORY}/Crow_P.pak`)).toBe(false);
	});

	it("refuses two paks of the same name in one zip", async () => {
		const { context } = memoryContext({
			archives: {
				[ZIP]: {
					"a/Ashen_P.pak": "one",
					"b/Ashen_P.pak": "two",
				},
			},
			files: {
				[ZIP]: "zip",
			},
		});

		expect(await refusalOf(() => addModUpload(context, ZIP))).toEqual(DUPLICATE_PAK);
	});

	it("refuses a file outside the mod staging folder or of another kind", async () => {
		const { context } = memoryContext({
			files: {
				".serverk-uploads/world/x/Ashen_P.pak": "pak",
				[`${FOLDER}/Ashen.sav`]: "save",
			},
		});

		for (const input of [
			".serverk-uploads/world/x/Ashen_P.pak",
			`${FOLDER}/Ashen.sav`,
			`${FOLDER}/Missing.pak`,
			`${MOD_UPLOAD_STAGING}/../RSDragonwilds/Ashen_P.pak`,
		]) {
			expect(await refusalOf(() => addModUpload(context, input))).toEqual(MOD_UPLOAD_MISSING);
		}
	});

	it("pairs each pak with the utoc and ucas of its own folder only", () => {
		expect(
			stagedModsOf([
				"x/a/Ashen_P.pak",
				"x/a/Ashen_P.utoc",
				"x/b/Ashen_P.ucas",
			]),
		).toEqual([
			{
				files: [
					"x/a/Ashen_P.pak",
					"x/a/Ashen_P.utoc",
				],
				name: "Ashen_P",
			},
		]);
	});

	it("counts mods the way arabic agrees", () => {
		expect(modCountOf(2).ar).toBe("مودين");
		expect(modCountOf(3).ar).toBe("3 مودات");
		expect(modCountOf(12).ar).toBe("12 مودًا");
	});
});
