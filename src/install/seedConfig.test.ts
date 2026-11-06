import { describe, expect, it } from "bun:test";
import { INSTALL_STAMP_FILE } from "@serverkgg/bridge/install";
import { DEDICATED_SERVER_FILE, GAME_INI_FILE, readConfig, readDragonwildsStamp } from "../shared";
import { ADMIN_PASSWORD_FIXTURE, CONFIG_FILES, DEDICATED_SERVER_FIXTURE, memoryContext } from "../testing";
import { dedicatedServerSeed, seedConfig } from "./seedConfig";

describe("seeding the config at install", () => {
	it("writes a fresh config with an owner slot, unique names and an open world", async () => {
		const { context, files } = memoryContext();

		await seedConfig(context);

		const config = await readConfig(context);

		expect(config.OwnerId).toBe("");
		expect(String(config.ServerName)).toMatch(/^Serverk \d{6}$/);
		expect(String(config.DefaultWorldName)).toMatch(/^Serverk\d{6}$/);
		expect(String(config.DefaultWorldName).length).toBeLessThanOrEqual(16);
		expect(config.WorldPassword).toBe("");
		expect(config.PlatformPolicy).toBe("Crossplay");
		expect(config.bAllowSendingCrashDumps).toBe("False");
		expect(files.get(DEDICATED_SERVER_FILE)).toContain("[SectionsToSave]\nbCanSaveAllSections=true");
		expect(files.get(DEDICATED_SERVER_FILE)).not.toContain("ServerGuid");
		expect(files.has(GAME_INI_FILE)).toBe(false);
	});

	it("keeps a generated admin password in the stamp, because the game strips it from its file at every start", async () => {
		const { context, files } = memoryContext();

		await seedConfig(context);

		const password = (await readDragonwildsStamp(context)).settingsRetained.AdminPassword;

		expect(String(password)).toHaveLength(12);
		expect(files.get(DEDICATED_SERVER_FILE)).not.toContain("AdminPassword");

		await seedConfig(context);

		expect((await readDragonwildsStamp(context)).settingsRetained.AdminPassword).toBe(password);
	});

	it("leaves every key the server or the customer already wrote, the server guid and the admin password included", async () => {
		const { context, files } = memoryContext({
			files: CONFIG_FILES,
		});

		await seedConfig(context);

		expect(files.get(DEDICATED_SERVER_FILE)).toBe(CONFIG_FILES[DEDICATED_SERVER_FILE]);
		expect((await readDragonwildsStamp(context)).settingsRetained.AdminPassword).toBe(ADMIN_PASSWORD_FIXTURE);
	});

	it("generates no admin password while the file holds one typed by hand", async () => {
		const { context } = memoryContext({
			files: {
				[DEDICATED_SERVER_FILE]: DEDICATED_SERVER_FIXTURE.replace(
					"WorldPassword=",
					"WorldPassword=\nAdminPassword=HandTyped9",
				),
			},
		});

		await seedConfig(context);

		expect(await context.files.exists(INSTALL_STAMP_FILE)).toBe(false);
	});

	it("fills only what is missing or blank, keeping an empty world password as the customer left it", () => {
		expect(
			dedicatedServerSeed(
				{
					DefaultWorldName: "Ashen",
					OwnerId: "",
					ServerName: " ",
					WorldPassword: "",
				},
				"123456",
			),
		).toEqual({
			bAllowSendingCrashDumps: "False",
			PlatformPolicy: "Crossplay",
			ServerName: "Serverk 123456",
		});
	});
});
