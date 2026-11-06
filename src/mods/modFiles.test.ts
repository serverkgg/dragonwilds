import { describe, expect, it } from "bun:test";
import { MODS_DIRECTORY } from "../shared";
import { memoryContext } from "../testing";
import { disabledPathOf, enabledPathOf, listMods, pakStemOf } from "./modFiles";

describe("the mods folder", () => {
	it("lists one mod per pak with its utoc and ucas, on or off by the pak's name", async () => {
		const { context } = memoryContext({
			files: {
				[`${MODS_DIRECTORY}/Ashen_P.pak`]: "pak",
				[`${MODS_DIRECTORY}/Ashen_P.ucas`]: "ucas file",
				[`${MODS_DIRECTORY}/Ashen_P.utoc`]: "utoc",
				[`${MODS_DIRECTORY}/Bloom_P.pak.disabled`]: "bloom",
				[`${MODS_DIRECTORY}/Bloom_P.utoc.disabled`]: "bloom utoc",
				[`${MODS_DIRECTORY}/notes.txt`]: "not a mod",
				[`${MODS_DIRECTORY}/sub/Crow_P.pak`]: "crow",
			},
		});

		expect(
			(await listMods(context)).map((mod) => [
				mod.id,
				mod.name,
				mod.enabled,
				mod.files.map((file) => file.name).sort(),
				mod.sizeBytes,
			]),
		).toEqual([
			[
				"Ashen_P.pak",
				"Ashen_P",
				true,
				[
					"Ashen_P.pak",
					"Ashen_P.ucas",
					"Ashen_P.utoc",
				],
				16,
			],
			[
				"Bloom_P.pak.disabled",
				"Bloom_P",
				false,
				[
					"Bloom_P.pak.disabled",
					"Bloom_P.utoc.disabled",
				],
				15,
			],
			[
				"sub/Crow_P.pak",
				"Crow_P",
				true,
				[
					"Crow_P.pak",
				],
				4,
			],
		]);
	});

	it("lists nothing before the mods folder exists", async () => {
		expect(await listMods(memoryContext().context)).toEqual([]);
	});

	it("names a pak by its stem and flips the disabled suffix both ways", () => {
		expect(pakStemOf("Ashen_P.pak")).toBe("Ashen_P");
		expect(pakStemOf("Ashen_P.PAK")).toBe("Ashen_P");
		expect(pakStemOf("Ashen_P.pak.disabled")).toBe("Ashen_P");
		expect(pakStemOf("Ashen_P.utoc")).toBeNull();
		expect(disabledPathOf("a/Ashen_P.pak")).toBe("a/Ashen_P.pak.disabled");
		expect(enabledPathOf("a/Ashen_P.pak.disabled")).toBe("a/Ashen_P.pak");
		expect(enabledPathOf("a/Ashen_P.pak")).toBe("a/Ashen_P.pak");
	});
});
