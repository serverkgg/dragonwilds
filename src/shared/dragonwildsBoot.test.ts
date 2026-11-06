import { describe, expect, it } from "bun:test";
import {
	BOOTING_LOG_FIXTURE,
	CONFIG_REFUSED_LOG_FIXTURE,
	JOIN_CODE_FIXTURE,
	memoryContext,
	OWNER_MISSING_LOG_FIXTURE,
	PLATFORM_REFUSED_LOG_FIXTURE,
	READY_LOG_FIXTURE,
} from "../testing";
import { BEACON_PORT, GAME_PORT, LOG_FILE } from "./dragonwildsApp";
import {
	BootVerdict,
	bootVerdictOf,
	directAddressOf,
	latestBootOf,
	readBootLines,
	readJoinCode,
} from "./dragonwildsBoot";

const contextWithLog = (log: string) => {
	return memoryContext({
		files: {
			[LOG_FILE]: log,
		},
	}).context;
};

describe("reading the latest boot from the log file", () => {
	it("keeps only the lines after the last time the log was opened", () => {
		expect(
			latestBootOf([
				"Log file open, 11/06/26 11:00:00",
				"old line",
				"﻿Log file open, 11/06/26 12:05:41",
				"new line",
				"",
			]),
		).toEqual([
			"new line",
		]);
	});

	it("reads nothing when the server never wrote a log", async () => {
		expect(await readBootLines(memoryContext().context)).toBeNull();
		expect(bootVerdictOf(null)).toBe(BootVerdict.None);
	});

	it("calls a boot ready once the world map is up for play", async () => {
		expect(bootVerdictOf(await readBootLines(contextWithLog(READY_LOG_FIXTURE)))).toBe(BootVerdict.Ready);
	});

	it("calls a boot still booting while only the startup map is up", async () => {
		expect(bootVerdictOf(await readBootLines(contextWithLog(BOOTING_LOG_FIXTURE)))).toBe(BootVerdict.Booting);
	});

	it("tells a missing owner and refused platforms apart from any other refused config", async () => {
		expect(bootVerdictOf(await readBootLines(contextWithLog(OWNER_MISSING_LOG_FIXTURE)))).toBe(
			BootVerdict.OwnerMissing,
		);
		expect(bootVerdictOf(await readBootLines(contextWithLog(PLATFORM_REFUSED_LOG_FIXTURE)))).toBe(
			BootVerdict.PlatformRefused,
		);
		expect(bootVerdictOf(await readBootLines(contextWithLog(CONFIG_REFUSED_LOG_FIXTURE)))).toBe(BootVerdict.Refused);
	});

	it("takes the last join code of the latest boot, and ignores a code from an older boot", async () => {
		expect(await readJoinCode(contextWithLog(READY_LOG_FIXTURE))).toBe("9876-ZY5X");
		expect(await readJoinCode(contextWithLog(`${JOIN_CODE_FIXTURE}\n${BOOTING_LOG_FIXTURE}`))).toBeNull();
		expect(await readJoinCode(memoryContext().context)).toBeNull();
	});

	it("never takes the masked console line for a code", async () => {
		expect(
			await readJoinCode(
				contextWithLog('[2026.11.06-11.35.31:977][120]LogNetSessionSettings: Setting ["JoinCode"] [hidden]\n'),
			),
		).toBeNull();
	});

	it("reads nothing when grep fails on the log", async () => {
		const { context, logged } = memoryContext({
			exec: () => {
				return {
					code: 2,
					stderr: "boom",
					stdout: "",
				};
			},
			files: {
				[LOG_FILE]: READY_LOG_FIXTURE,
			},
		});

		expect(await readBootLines(context)).toBeNull();
		expect(logged.map((entry) => entry.level)).toEqual([
			"warn",
		]);
	});
});

describe("the direct address", () => {
	it("prefers the platform's player address, which already carries the port", () => {
		const { context } = memoryContext({
			playerAddress: "riyadh-01.serverk.gg:26000",
			ports: {
				[BEACON_PORT]: 26_100,
				[GAME_PORT]: 26_000,
			},
		});

		expect(directAddressOf(context)).toBe("riyadh-01.serverk.gg:26000");
	});

	it("adds the game port to the public address, and knows none without one", () => {
		const { context } = memoryContext({
			ports: {
				[GAME_PORT]: 26_000,
			},
			publicAddress: "203.0.113.7",
		});

		expect(directAddressOf(context)).toBe("203.0.113.7:26000");
		expect(directAddressOf(memoryContext().context)).toBeNull();
	});
});
