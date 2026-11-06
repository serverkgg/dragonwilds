import { describe, expect, it } from "bun:test";
import { INSTALL_STAMP_FILE } from "@serverkgg/bridge/install";
import { RESTART_MESSAGE } from "../setup";
import { DEDICATED_SERVER_FILE, GAME_INI_FILE, readDragonwildsStamp } from "../shared";
import { CONFIG_FILES, memoryContext, SECOND_PLAYER_ID_FIXTURE } from "../testing";
import { settings } from "./settings";

describe("the settings form", () => {
	it("reads both files into one form", async () => {
		const { context } = memoryContext({
			files: CONFIG_FILES,
		});

		expect(await settings.read(context)).toEqual({
			AdminPassword: "OldAdmin42",
			bAllowSendingCrashDumps: false,
			DefaultWorldName: "Ashen",
			MaxPlayers: 4,
			OwnerId: "0002a1b3c4d5e6f708192a3b4c5d6e7f",
			PlatformPolicy: "Crossplay",
			ServerName: "Old Name",
			WorldPassword: "",
		});
	});

	it("writes straight into both files while the server is stopped", async () => {
		const { context, files } = memoryContext({
			files: CONFIG_FILES,
		});

		await settings.write?.(context, {
			MaxPlayers: 6,
			PlatformPolicy: "PC",
			ServerName: "Black Flag",
		});

		expect(files.get(DEDICATED_SERVER_FILE)).toContain("ServerName=Black Flag");
		expect(files.get(DEDICATED_SERVER_FILE)).toContain("PlatformPolicy=PC");
		expect(files.get(GAME_INI_FILE)).toContain("MaxPlayers=6");
		expect((await readDragonwildsStamp(context)).settingsPending).toEqual({});
	});

	it("parks only the changed values while the server runs and leaves the files to the game", async () => {
		const { context, files } = memoryContext({
			files: CONFIG_FILES,
			running: true,
		});

		await settings.write?.(context, {
			MaxPlayers: 4,
			ServerName: "Black Flag",
			WorldPassword: "",
		});

		expect(files.get(DEDICATED_SERVER_FILE)).toBe(CONFIG_FILES[DEDICATED_SERVER_FILE]);
		expect(files.get(GAME_INI_FILE)).toBe(CONFIG_FILES[GAME_INI_FILE]);
		expect((await readDragonwildsStamp(context)).settingsPending).toEqual({
			ServerName: "Black Flag",
		});
	});

	it("shows a parked value in place of the file's", async () => {
		const { context } = memoryContext({
			files: {
				...CONFIG_FILES,
				[INSTALL_STAMP_FILE]: JSON.stringify({
					settingsPending: {
						MaxPlayers: 2,
						WorldPassword: "door",
					},
				}),
			},
			running: true,
		});

		expect(await settings.read(context)).toMatchObject({
			MaxPlayers: 2,
			WorldPassword: "door",
		});
	});

	it("writes nothing when nothing changed", async () => {
		const { context, files } = memoryContext({
			files: CONFIG_FILES,
		});

		await settings.write?.(context, {
			MaxPlayers: 4,
			ServerName: "Old Name",
		});

		expect(files.get(DEDICATED_SERVER_FILE)).toBe(CONFIG_FILES[DEDICATED_SERVER_FILE]);
		expect(files.get(INSTALL_STAMP_FILE)).toBe(CONFIG_FILES[INSTALL_STAMP_FILE]);
	});

	it("repairs a value the game refused, even when the form shows the fallback", async () => {
		const { context, files } = memoryContext({
			files: {
				...CONFIG_FILES,
				[DEDICATED_SERVER_FILE]:
					CONFIG_FILES[DEDICATED_SERVER_FILE]?.replace("PlatformPolicy=Crossplay", "PlatformPolicy=Bogus") ?? "",
			},
		});

		expect((await settings.read(context)).PlatformPolicy).toBe("Crossplay");

		await settings.write?.(context, {
			PlatformPolicy: "Crossplay",
		});

		expect(files.get(DEDICATED_SERVER_FILE)).toContain("PlatformPolicy=Crossplay");
	});

	it("keeps a new admin password in the stamp while the server runs, because the game strips it from its file", async () => {
		const { context, files } = memoryContext({
			files: CONFIG_FILES,
			running: true,
		});

		await settings.write?.(context, {
			AdminPassword: "NewAdmin8",
		});

		expect((await settings.read(context)).AdminPassword).toBe("NewAdmin8");
		expect(files.get(DEDICATED_SERVER_FILE)).toBe(CONFIG_FILES[DEDICATED_SERVER_FILE]);
		expect((await readDragonwildsStamp(context)).settingsPending).toEqual({});
	});

	it("reports the verify step when the owner changes, and stays quiet for any other setting", async () => {
		const { context, setupReports } = memoryContext({
			files: CONFIG_FILES,
			running: true,
		});

		await settings.write?.(context, {
			ServerName: "Black Flag",
		});

		expect(setupReports).toEqual([]);

		await settings.write?.(context, {
			OwnerId: SECOND_PLAYER_ID_FIXTURE,
		});

		expect(setupReports.at(0)?.prompt?.message).toEqual(RESTART_MESSAGE);
	});
});
