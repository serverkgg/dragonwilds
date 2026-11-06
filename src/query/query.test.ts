import { describe, expect, it } from "bun:test";
import { BridgeEventName } from "@serverkgg/bridge/protocol";
import { GAME_INI_FILE, roster, rosterSync } from "../shared";
import { CONFIG_FILES, GAME_INI_FIXTURE, memoryContext, PLAYER_ID_FIXTURE } from "../testing";
import { onlineOf, query } from "./query";

describe("sampling the player count", () => {
	it("reports no player count while the roster lines are unverified, and still raises the join and the leave", async () => {
		roster.clear();
		rosterSync.clear();
		roster.join(PLAYER_ID_FIXTURE, "Mohammed");

		const { context, emits } = memoryContext({
			files: {
				...CONFIG_FILES,
				[GAME_INI_FILE]: GAME_INI_FIXTURE,
			},
		});

		expect(await query.sample(context)).toEqual({
			max: 4,
			online: null,
			tick: null,
		});
		expect(emits).toEqual([
			{
				event: BridgeEventName.PlayerJoined,
				payload: {
					player: "Mohammed",
					playerId: PLAYER_ID_FIXTURE,
				},
			},
		]);

		roster.clear();
		await query.sample(context);

		expect(emits.at(-1)?.event).toBe(BridgeEventName.PlayerLeft);
	});

	it("reports six as the limit while Game.ini has none", async () => {
		roster.clear();

		expect((await query.sample(memoryContext().context)).max).toBe(6);
	});

	it("counts the roster once a join has verified the lines, and never an unverified zero", () => {
		expect(onlineOf(2, true)).toBe(2);
		expect(onlineOf(0, true)).toBe(0);
		expect(onlineOf(0, false)).toBeNull();
		expect(onlineOf(3, false)).toBeNull();
	});
});
