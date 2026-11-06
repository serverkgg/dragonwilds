import { describe, expect, it } from "bun:test";
import { createRoster, presenceOf } from "./dragonwildsRoster";

describe("the roster the log builds", () => {
	it("keeps the first join time and the known name when the same player logs in again", () => {
		const roster = createRoster();

		roster.join("a1", "Mohammed", 1000);
		roster.join("a1", "", 2000);

		expect(roster.all()).toEqual([
			{
				joinedAt: 1000,
				name: "Mohammed",
				playerId: "a1",
			},
		]);
	});

	it("drops a player on their leave line, and a leave for someone unknown changes nothing", () => {
		const roster = createRoster();

		roster.join("a1", "Mohammed");
		roster.leave("b2");
		roster.leave("a1");

		expect(roster.all()).toEqual([]);
	});

	it("sends the presence keys the manifest declares, the id standing in for a missing name", () => {
		expect(
			presenceOf({
				joinedAt: 0,
				name: null,
				playerId: "a1",
			}),
		).toEqual({
			player: "a1",
			playerId: "a1",
		});
	});
});
