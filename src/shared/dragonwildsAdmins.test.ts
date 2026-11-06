import { describe, expect, it } from "bun:test";
import { PLAYER_ID_FIXTURE, SECOND_PLAYER_ID_FIXTURE } from "../testing";
import { parseAdministrators, serializeAdministrators } from "./dragonwildsAdmins";

describe("the admin list in the config", () => {
	it("reads the tuple the game writes", () => {
		expect(parseAdministrators(`(${PLAYER_ID_FIXTURE},${SECOND_PLAYER_ID_FIXTURE})`)).toEqual([
			PLAYER_ID_FIXTURE,
			SECOND_PLAYER_ID_FIXTURE,
		]);
	});

	it("reads a hand edit tolerantly: spaces, quotes, no parentheses and repeats", () => {
		expect(parseAdministrators(` "${PLAYER_ID_FIXTURE}" , ${SECOND_PLAYER_ID_FIXTURE},${PLAYER_ID_FIXTURE}`)).toEqual([
			PLAYER_ID_FIXTURE,
			SECOND_PLAYER_ID_FIXTURE,
		]);
	});

	it("keeps each id exactly as written, so two ids differing in case stay two", () => {
		const upper = PLAYER_ID_FIXTURE.toUpperCase();

		expect(parseAdministrators(`(${upper},${PLAYER_ID_FIXTURE})`)).toEqual([
			upper,
			PLAYER_ID_FIXTURE,
		]);
	});

	it("reads an empty list as no admins", () => {
		expect(parseAdministrators("()")).toEqual([]);
		expect(parseAdministrators("")).toEqual([]);
	});

	it("writes the tuple back in the same shape", () => {
		expect(
			serializeAdministrators([
				PLAYER_ID_FIXTURE,
				SECOND_PLAYER_ID_FIXTURE,
			]),
		).toBe(`(${PLAYER_ID_FIXTURE},${SECOND_PLAYER_ID_FIXTURE})`);
		expect(serializeAdministrators([])).toBe("()");
	});
});
