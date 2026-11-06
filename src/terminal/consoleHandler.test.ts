import { describe, expect, it } from "bun:test";
import { BridgeUserError } from "@serverkgg/bridge";
import { INSTALL_STAMP_FILE } from "@serverkgg/bridge/install";
import { BEACON_PORT, directAddressOf, GAME_INI_FILE, GAME_PORT, roster, SAVE_GAMES_DIRECTORY } from "../shared";
import { ADMIN_PASSWORD_FIXTURE, CONFIG_FILES, GAME_INI_FIXTURE, memoryContext, PLAYER_ID_FIXTURE } from "../testing";
import { consoleCommands, consoleHandler, rosterLines } from "./consoleHandler";
import { terminal } from "./terminal";

const replyOf = async (input: string, files: Record<string, string> = CONFIG_FILES) => {
	const { context } = memoryContext({
		files: {
			...files,
			[GAME_INI_FILE]: GAME_INI_FIXTURE,
			[INSTALL_STAMP_FILE]: JSON.stringify({
				buildId: "26161880",
				settingsRetained: {
					AdminPassword: ADMIN_PASSWORD_FIXTURE,
				},
			}),
			[`${SAVE_GAMES_DIRECTORY}/Ashen.sav`]: "world",
		},
		playerAddress: "riyadh-01.serverk.gg:26000",
		ports: {
			[BEACON_PORT]: 26_100,
			[GAME_PORT]: 26_000,
		},
	});

	return await consoleHandler(context, input);
};

describe("the dragonwilds console", () => {
	it("answers status from the driver, never from the game", async () => {
		const line = (await replyOf("status"))?.line ?? "";

		expect(line).toContain("build: 26161880");
		expect(line).toContain("players: unknown/4");
		expect(line).toContain("world: Ashen");
		expect(line).toContain("platforms: Crossplay");
		expect(line).toContain("owner: set");
	});

	it("says when the owner is missing", async () => {
		const line = (await replyOf("status", {}))?.line ?? "";

		expect(line).toContain("owner: missing");
	});

	it("prints the world name and the direct address, and never a code or a password", async () => {
		const line = (await replyOf("ACCESS"))?.line ?? "";

		expect(line.split("\n")).toEqual([
			"world name: Ashen",
			"direct address: riyadh-01.serverk.gg:26000",
		]);
		expect(line).not.toContain(ADMIN_PASSWORD_FIXTURE);
		expect(line.toLowerCase()).not.toContain("password");
		expect(line.toLowerCase()).not.toContain("code");
	});

	it("lists the roster with each player id", () => {
		expect(rosterLines([])).toEqual([
			"no players online",
		]);
		expect(
			rosterLines([
				{
					joinedAt: Date.UTC(2026, 10, 6, 12, 20),
					name: "Mohammed",
					playerId: PLAYER_ID_FIXTURE,
				},
			]),
		).toEqual([
			"player,playerId,joined",
			`Mohammed,${PLAYER_ID_FIXTURE},2026-11-06T12:20:00.000Z`,
		]);
	});

	it("answers players from the roster the log builds", async () => {
		roster.clear();
		roster.join(PLAYER_ID_FIXTURE, "Mohammed");

		expect((await replyOf("players"))?.line).toContain(`Mohammed,${PLAYER_ID_FIXTURE}`);

		roster.clear();
	});

	it("answers no worlds command, because the world tab lists them", async () => {
		await expect(replyOf("worlds")).rejects.toThrow(BridgeUserError);
	});

	it("adds the game port to the public address when the platform names no player address", () => {
		const { context } = memoryContext({
			ports: {
				[GAME_PORT]: 26_000,
			},
			publicAddress: "203.0.113.7",
		});

		expect(directAddressOf(context)).toBe("203.0.113.7:26000");
		expect(directAddressOf(memoryContext().context)).toBeNull();
	});

	it("refuses anything outside its table with a reason, never passing it to stdin", async () => {
		await expect(replyOf("kick Mohammed")).rejects.toThrow(BridgeUserError);
		await expect(replyOf("constructor")).rejects.toThrow(BridgeUserError);
		await expect(replyOf("__proto__")).rejects.toThrow(BridgeUserError);
		await expect(replyOf("   ")).rejects.toThrow(BridgeUserError);
	});

	it("documents every command it answers, and answers every command it documents", () => {
		expect((terminal.commands ?? []).map((command) => command.name).sort()).toEqual(
			Object.keys(consoleCommands).sort(),
		);
	});
});
