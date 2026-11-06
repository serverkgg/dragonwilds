import { describe, expect, it } from "bun:test";
import { INSTALL_STAMP_FILE } from "@serverkgg/bridge/install";
import { BridgeEventName } from "@serverkgg/bridge/protocol";
import { ADMIN_PASSWORD_FIXTURE, CONFIG_FILES, DEDICATED_SERVER_FIXTURE, memoryContext } from "../testing";
import { DEDICATED_SERVER_FILE, GAME_INI_FILE } from "./dragonwildsApp";
import { readConfig } from "./dragonwildsConfig";
import {
	applyConfig,
	applyRetainedSettings,
	recordPendingSettings,
	replayPendingSettings,
	storedConfig,
} from "./dragonwildsPending";
import { readDragonwildsStamp } from "./dragonwildsStamp";

describe("settings saved while the game runs", () => {
	it("keeps the value the file held before the first parked write", async () => {
		const { context } = memoryContext({
			files: CONFIG_FILES,
		});

		await recordPendingSettings(
			context,
			{
				ServerName: "New",
			},
			await readConfig(context),
		);
		await recordPendingSettings(
			context,
			{
				ServerName: "Newer",
			},
			{
				ServerName: "New",
			},
		);

		const stamp = await readDragonwildsStamp(context);

		expect(stamp.settingsPending).toEqual({
			ServerName: "Newer",
		});
		expect(stamp.settingsBaseline.values).toEqual({
			ServerName: "Old Name",
		});
	});

	it("never stores the old value of a password, only whether it changed", async () => {
		const { context, files } = memoryContext({
			files: {
				[DEDICATED_SERVER_FILE]: DEDICATED_SERVER_FIXTURE.replace("WorldPassword=", "WorldPassword=OldDoor7"),
			},
		});

		await recordPendingSettings(
			context,
			{
				WorldPassword: "NewDoor8",
			},
			await readConfig(context),
		);

		expect((await readDragonwildsStamp(context)).settingsBaseline).toEqual({
			secrets: {
				WorldPassword: true,
			},
			values: {},
		});
		expect(files.get(INSTALL_STAMP_FILE)).not.toContain("OldDoor7");
	});

	it("writes the parked values at the next start and reports only what changed", async () => {
		const { activities, context, files } = memoryContext({
			files: {
				...CONFIG_FILES,
				[INSTALL_STAMP_FILE]: JSON.stringify({
					settingsBaseline: {
						secrets: {
							WorldPassword: true,
						},
						values: {
							PlatformPolicy: "Crossplay",
							ServerName: "Old Name",
						},
					},
					settingsPending: {
						PlatformPolicy: "Crossplay",
						ServerName: "New Name",
						WorldPassword: "door",
					},
				}),
			},
		});

		const cleared = await replayPendingSettings(context, await readDragonwildsStamp(context));

		expect(files.get(DEDICATED_SERVER_FILE)).toContain("ServerName=New Name");
		expect(files.get(DEDICATED_SERVER_FILE)).toContain("WorldPassword=door");
		expect(cleared.settingsPending).toEqual({});
		expect(activities.map((entry) => entry.name)).toEqual([
			BridgeEventName.SettingsApplied,
		]);
		expect(activities.at(0)?.details?.keys).toBe("ServerName, WorldPassword");
	});

	it("does nothing when nothing is parked", async () => {
		const { activities, context, files } = memoryContext({
			files: CONFIG_FILES,
		});

		await replayPendingSettings(context, await readDragonwildsStamp(context));

		expect(files.get(DEDICATED_SERVER_FILE)).toBe(CONFIG_FILES[DEDICATED_SERVER_FILE]);
		expect(activities).toEqual([]);
	});
});

describe("the values the game strips from its own files", () => {
	it("writes the admin password and the player limit back before every start", async () => {
		const { context, files } = memoryContext({
			files: CONFIG_FILES,
		});

		await applyRetainedSettings(context, await readDragonwildsStamp(context));

		expect(files.get(DEDICATED_SERVER_FILE)).toContain(`AdminPassword=${ADMIN_PASSWORD_FIXTURE}`);
		expect(files.get(GAME_INI_FILE)).toContain("MaxPlayers=4");
	});

	it("takes an admin password or a player limit typed into the files by hand", async () => {
		const { context, files } = memoryContext({
			files: {
				...CONFIG_FILES,
				[DEDICATED_SERVER_FILE]: DEDICATED_SERVER_FIXTURE.replace(
					"WorldPassword=",
					"WorldPassword=\nAdminPassword=HandTyped9",
				),
				[GAME_INI_FILE]: "[/Script/Engine.GameSession]\nMaxPlayers=2\n",
			},
		});

		expect(await storedConfig(context)).toMatchObject({
			AdminPassword: "HandTyped9",
			MaxPlayers: 2,
		});

		const stamp = await applyRetainedSettings(context, await readDragonwildsStamp(context));

		expect(stamp.settingsRetained).toEqual({
			AdminPassword: "HandTyped9",
			MaxPlayers: 2,
		});
		expect(files.get(GAME_INI_FILE)).toContain("MaxPlayers=2");
	});

	it("writes nothing when the stamp holds no stripped value", async () => {
		const { context, files } = memoryContext({
			files: {
				[DEDICATED_SERVER_FILE]: DEDICATED_SERVER_FIXTURE,
			},
		});

		await applyRetainedSettings(context, await readDragonwildsStamp(context));

		expect(files.get(DEDICATED_SERVER_FILE)).toBe(DEDICATED_SERVER_FIXTURE);
		expect(files.has(GAME_INI_FILE)).toBe(false);
	});
});

describe("applying a config change", () => {
	it("writes the file at once while the server is stopped and clears the parked value", async () => {
		const { context, files } = memoryContext({
			files: {
				...CONFIG_FILES,
				[INSTALL_STAMP_FILE]: JSON.stringify({
					settingsPending: {
						ServerName: "Parked",
					},
				}),
			},
		});

		await applyConfig(context, {
			ServerName: "Now",
		});

		expect(files.get(DEDICATED_SERVER_FILE)).toContain("ServerName=Now");
		expect((await readDragonwildsStamp(context)).settingsPending).toEqual({});
	});

	it("leaves the file to the game while it runs and parks the change", async () => {
		const { context, files } = memoryContext({
			files: CONFIG_FILES,
			running: true,
		});

		await applyConfig(context, {
			ServerName: "Later",
		});

		expect(files.get(DEDICATED_SERVER_FILE)).toBe(CONFIG_FILES[DEDICATED_SERVER_FILE]);
		expect((await readDragonwildsStamp(context)).settingsPending).toEqual({
			ServerName: "Later",
		});
	});

	it("keeps a stripped value in the stamp, writing the files only while the server is stopped", async () => {
		const running = memoryContext({
			files: CONFIG_FILES,
			running: true,
		});

		await applyConfig(running.context, {
			AdminPassword: "NewAdmin8",
			MaxPlayers: 6,
		});

		expect((await readDragonwildsStamp(running.context)).settingsRetained).toEqual({
			AdminPassword: "NewAdmin8",
			MaxPlayers: 6,
		});
		expect((await readDragonwildsStamp(running.context)).settingsPending).toEqual({});
		expect(running.files.get(DEDICATED_SERVER_FILE)).not.toContain("AdminPassword");

		const stopped = memoryContext({
			files: CONFIG_FILES,
		});

		await applyConfig(stopped.context, {
			AdminPassword: "NewAdmin8",
		});

		expect(stopped.files.get(DEDICATED_SERVER_FILE)).toContain("AdminPassword=NewAdmin8");
	});
});
