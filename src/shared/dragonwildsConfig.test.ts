import { describe, expect, it } from "bun:test";
import { CONFIG_FILES, GAME_INI_FIXTURE, memoryContext } from "../testing";
import { DEDICATED_SERVER_FILE, GAME_INI_FILE } from "./dragonwildsApp";
import {
	booleanOf,
	iniTextOf,
	MAX_PLAYERS_KEY,
	maxPlayersOf,
	PlatformPolicy,
	platformPolicyOf,
	readConfig,
	SERVER_NAME_KEY,
	writeConfig,
} from "./dragonwildsConfig";

describe("the two config files", () => {
	it("reads the server settings and the player limit as one set of values", async () => {
		const { context } = memoryContext({
			files: {
				...CONFIG_FILES,
				[GAME_INI_FILE]: GAME_INI_FIXTURE,
			},
		});

		expect(await readConfig(context)).toMatchObject({
			[MAX_PLAYERS_KEY]: "4",
			[SERVER_NAME_KEY]: "Old Name",
			ServerGuid: "7C2F9E0B4A1D4E8F9A3B5C6D7E8F9012",
		});
	});

	it("writes the player limit into Game.ini and everything else into DedicatedServer.ini", async () => {
		const { context, files } = memoryContext({
			files: CONFIG_FILES,
		});

		await writeConfig(context, {
			[MAX_PLAYERS_KEY]: 6,
			[SERVER_NAME_KEY]: "Black Flag",
			bAllowSendingCrashDumps: true,
		});

		expect(files.get(GAME_INI_FILE)).toContain("MaxPlayers=6");
		expect(files.get(GAME_INI_FILE)).not.toContain("ServerName");
		expect(files.get(DEDICATED_SERVER_FILE)).toContain("ServerName=Black Flag");
		expect(files.get(DEDICATED_SERVER_FILE)).toContain("bAllowSendingCrashDumps=True");
		expect(files.get(DEDICATED_SERVER_FILE)).not.toContain("MaxPlayers");
		expect(files.get(DEDICATED_SERVER_FILE)).toContain("ServerGuid=7C2F9E0B4A1D4E8F9A3B5C6D7E8F9012");
		expect(files.get(DEDICATED_SERVER_FILE)).toContain("[SectionsToSave]");
	});

	it("writes booleans the way Unreal writes them", () => {
		expect(iniTextOf(true)).toBe("True");
		expect(iniTextOf(false)).toBe("False");
		expect(iniTextOf(4)).toBe("4");
	});

	it("reads a boolean in any case and falls back on anything else", () => {
		expect(booleanOf("True", false)).toBe(true);
		expect(booleanOf("false", true)).toBe(false);
		expect(booleanOf("maybe", true)).toBe(true);
	});

	it("falls back to six players and to crossplay on a missing or unknown value", () => {
		expect(maxPlayersOf({})).toBe(6);
		expect(
			maxPlayersOf({
				[MAX_PLAYERS_KEY]: "0",
			}),
		).toBe(6);
		expect(platformPolicyOf("Xbox")).toBe(PlatformPolicy.Xbox);
		expect(platformPolicyOf("Steam")).toBe(PlatformPolicy.Crossplay);
	});
});
