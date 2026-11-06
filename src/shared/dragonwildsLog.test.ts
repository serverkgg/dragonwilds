import { describe, expect, it } from "bun:test";
import {
	BIND_FAILED_FIXTURE,
	BIND_FIXTURE,
	CONFIG_REFUSED_FIXTURE,
	CRASH_FIXTURE,
	JOIN_CODE_FIXTURE,
	LEAVE_FIXTURE,
	LOGIN_FIXTURE,
	OWNER_MISSING_FIXTURE,
	PLATFORM_POLICY_INVALID_FIXTURE,
	PLAYER_ID_FIXTURE,
	READY_FIXTURE,
	STARTUP_MAP_FIXTURE,
} from "../testing";
import {
	CONFIG_REFUSED_LINE,
	CRASH_LINE,
	JOIN_CODE_LINE,
	joinCodeOf,
	OWNER_MISSING_LINE,
	PLATFORM_POLICY_INVALID_LINE,
	PORT_BIND_FAILED,
	parseLeave,
	parseLogin,
	ROSTER_VERIFIED,
	SERVER_READY,
	SERVER_SETTLED,
} from "./dragonwildsLog";

describe("reading the server log", () => {
	it("calls the server ready when the world map comes up, never the startup map", () => {
		expect(SERVER_READY.test(READY_FIXTURE)).toBe(true);
		expect(SERVER_READY.test(STARTUP_MAP_FIXTURE)).toBe(false);
		expect(SERVER_READY.test(LOGIN_FIXTURE)).toBe(false);
	});

	it("settles the boot on the world map or on the game refusing its config, so a missing owner never loops", () => {
		expect(SERVER_SETTLED.test(READY_FIXTURE)).toBe(true);
		expect(SERVER_SETTLED.test(CONFIG_REFUSED_FIXTURE)).toBe(true);
		expect(SERVER_SETTLED.test(STARTUP_MAP_FIXTURE)).toBe(false);
	});

	it("names which config value the game refused", () => {
		expect(CONFIG_REFUSED_LINE.test(CONFIG_REFUSED_FIXTURE)).toBe(true);
		expect(OWNER_MISSING_LINE.test(OWNER_MISSING_FIXTURE)).toBe(true);
		expect(PLATFORM_POLICY_INVALID_LINE.test(PLATFORM_POLICY_INVALID_FIXTURE)).toBe(true);
		expect(OWNER_MISSING_LINE.test(PLATFORM_POLICY_INVALID_FIXTURE)).toBe(false);
	});

	it("knows a crash and a port that could not be bound, and not a socket that was", () => {
		expect(CRASH_LINE.test(CRASH_FIXTURE)).toBe(true);
		expect(PORT_BIND_FAILED.test(BIND_FAILED_FIXTURE)).toBe(true);
		expect(PORT_BIND_FAILED.test(BIND_FIXTURE)).toBe(false);
		expect(PORT_BIND_FAILED.test(READY_FIXTURE)).toBe(false);
	});

	it("takes the player id in lower case and the name from a login line", () => {
		expect(parseLogin(LOGIN_FIXTURE)).toEqual({
			player: "Mohammed",
			playerId: PLAYER_ID_FIXTURE,
		});
	});

	it("takes the product user id from an epic account and product user pair", () => {
		expect(
			parseLogin(
				`LogNet: Login request: ?Name=Sara userId: EOS:ffffffffffffffffffffffffffffffff|${PLAYER_ID_FIXTURE} platform: EOS`,
			),
		).toEqual({
			player: "Sara",
			playerId: PLAYER_ID_FIXTURE,
		});
	});

	it("keeps a login with no name, keyed by its id", () => {
		expect(parseLogin(`LogNet: Login request: /Game/Maps/World userId: ${PLAYER_ID_FIXTURE}`)?.player).toBe("");
		expect(parseLogin("LogNet: Login request: ?Name=Sara userId: UNKNOWN")).toBeNull();
	});

	it("takes the player id from a closed connection", () => {
		expect(parseLeave(LEAVE_FIXTURE)).toEqual({
			playerId: PLAYER_ID_FIXTURE,
		});
		expect(parseLeave(LOGIN_FIXTURE)).toBeNull();
	});

	it("keeps an id exactly as the log prints it, case included", () => {
		const upper = PLAYER_ID_FIXTURE.toUpperCase();

		expect(parseLogin(`LogNet: Login request: ?Name=Sara userId: EOS:${upper} platform: EOS`)?.playerId).toBe(upper);
		expect(parseLeave(LEAVE_FIXTURE.replace(PLAYER_ID_FIXTURE, upper))?.playerId).toBe(upper);
	});

	it("marks the roster lines unverified until a join proves them", () => {
		expect(ROSTER_VERIFIED).toBe(false);
	});

	it("takes the newest join code from the session setting the server logs at every start", () => {
		expect(JOIN_CODE_LINE.exec(JOIN_CODE_FIXTURE)?.groups?.code).toBe("1234-AB5C");
		expect(
			joinCodeOf(
				`${JOIN_CODE_FIXTURE}\n[2026.11.06-11.39.36:202][120]LogNetSessionSettings: Setting ["JoinCode"] written with key[xz] value[9876-ZY1X]\n`,
			),
		).toBe("9876-ZY1X");
		expect(joinCodeOf(READY_FIXTURE)).toBeNull();
		expect(joinCodeOf('LogNetSessionSettings: Setting ["JoinCode"] [hidden]')).toBeNull();
	});
});
