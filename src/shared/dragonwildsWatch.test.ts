import { describe, expect, it } from "bun:test";
import { LEAVE_FIXTURE, LOGIN_FIXTURE, memoryContext, PLAYER_ID_FIXTURE } from "../testing";
import { roster } from "./dragonwildsRoster";
import { watchServerLog } from "./dragonwildsWatch";

describe("following the server log", () => {
	it("adds a player on their login line and drops them when the connection closes, following once", () => {
		const { context, feed, follows } = memoryContext();

		roster.clear();
		watchServerLog(context);
		watchServerLog(context);

		expect(follows).toHaveLength(2);

		feed(LOGIN_FIXTURE);

		expect(
			roster.all().map((player) => [
				player.playerId,
				player.name,
			]),
		).toEqual([
			[
				PLAYER_ID_FIXTURE,
				"Mohammed",
			],
		]);

		feed(LEAVE_FIXTURE);

		expect(roster.all()).toEqual([]);
	});
});
