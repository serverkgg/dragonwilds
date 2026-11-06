import { describe, expect, it } from "bun:test";
import { parseLeave, parseLogin, roster } from "../shared";
import { LEAVE_FIXTURE, LOGIN_FIXTURE, memoryContext, PLAYER_ID_FIXTURE } from "../testing";
import { playerRowOf, players } from "./players";

const JOINED_AT = Date.UTC(2026, 10, 6, 12, 20);

describe("the players table", () => {
	it("shows a player from the login line, keyed by the player id, until the connection closes", async () => {
		roster.clear();

		const login = parseLogin(LOGIN_FIXTURE);
		const left = parseLeave(LEAVE_FIXTURE);
		const { context } = memoryContext();

		roster.join(login?.playerId ?? "", login?.player ?? null, JOINED_AT);

		expect(await players.list(context)).toEqual([
			expect.objectContaining({
				id: PLAYER_ID_FIXTURE,
				joined: "2026-11-06 12:20 UTC",
				name: "Mohammed",
				playerId: PLAYER_ID_FIXTURE,
			}),
		]);

		roster.leave(left?.playerId ?? "");

		expect(await players.list(context)).toEqual([]);
	});

	it("says how long the player has been on in both languages", () => {
		expect(
			playerRowOf(
				{
					joinedAt: JOINED_AT,
					name: null,
					playerId: PLAYER_ID_FIXTURE,
				},
				JOINED_AT + 75 * 60 * 1000,
			),
		).toEqual({
			id: PLAYER_ID_FIXTURE,
			joined: "2026-11-06 12:20 UTC",
			name: PLAYER_ID_FIXTURE,
			played: {
				ar: "ساعة و15 دقيقة",
				en: "1h 15m",
			},
			playerId: PLAYER_ID_FIXTURE,
		});
	});

	it("is read only while the game runs and offers no action, because kicks and bans happen in the game", () => {
		expect(players.requiresRunning).toBe(true);
		expect(players.actions).toBeUndefined();
	});
});
