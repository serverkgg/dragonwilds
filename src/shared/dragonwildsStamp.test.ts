import { describe, expect, it } from "bun:test";
import { EMPTY_STAMP } from "../testing";
import { normalizeStamp } from "./dragonwildsStamp";

describe("the install stamp", () => {
	it("reads a missing stamp as empty", () => {
		expect(normalizeStamp(null)).toEqual(EMPTY_STAMP);
	});

	it("drops values a hand edit made unreadable", () => {
		expect(
			normalizeStamp({
				buildId: "",
				settingsBaseline: {
					secrets: {
						AdminPassword: "yes",
						WorldPassword: true,
					},
					values: {
						ServerName: "Old",
						Weird: [],
					},
				},
				settingsPending: {
					MaxPlayers: 6,
					ServerName: {},
				},
			}),
		).toEqual({
			buildId: null,
			ownerVerified: false,
			settingsBaseline: {
				secrets: {
					WorldPassword: true,
				},
				values: {
					ServerName: "Old",
				},
			},
			settingsPending: {
				MaxPlayers: 6,
			},
			settingsRetained: {},
		});
	});

	it("keeps the values the game strips from its own files", () => {
		expect(
			normalizeStamp({
				settingsRetained: {
					AdminPassword: "Admin42",
					MaxPlayers: 4,
					Weird: null,
				},
			}).settingsRetained,
		).toEqual({
			AdminPassword: "Admin42",
			MaxPlayers: 4,
		});
	});

	it("remembers a proven owner only when the stamp says so plainly", () => {
		expect(
			normalizeStamp({
				ownerVerified: true,
			}).ownerVerified,
		).toBe(true);
		expect(
			normalizeStamp({
				ownerVerified: "yes",
			}).ownerVerified,
		).toBe(false);
	});
});
