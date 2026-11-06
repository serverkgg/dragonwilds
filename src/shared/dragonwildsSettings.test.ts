import { describe, expect, it } from "bun:test";
import { BridgeUserError } from "@serverkgg/bridge";
import { PLAYER_ID_FIXTURE } from "../testing";
import {
	requireWorldName,
	settingValues,
	validateSettingsWrite,
	WORLD_NAME_INVALID,
	worldNameWriteOf,
} from "./dragonwildsSettings";

describe("checking a settings write", () => {
	it("trims the names and keeps every value the game accepts", () => {
		expect(
			validateSettingsWrite({
				AdminPassword: "Admin42",
				bAllowSendingCrashDumps: "true",
				DefaultWorldName: " Ashen ",
				MaxPlayers: "6",
				OwnerId: ` ${PLAYER_ID_FIXTURE} `,
				PlatformPolicy: "PlayStation",
				ServerName: " Black Flag ",
				WorldPassword: "",
			}),
		).toEqual({
			AdminPassword: "Admin42",
			bAllowSendingCrashDumps: true,
			DefaultWorldName: "Ashen",
			MaxPlayers: 6,
			OwnerId: PLAYER_ID_FIXTURE,
			PlatformPolicy: "PlayStation",
			ServerName: "Black Flag",
			WorldPassword: "",
		});
	});

	it("keeps an owner id exactly as typed, case included, and trims only the spaces", () => {
		const upper = PLAYER_ID_FIXTURE.toUpperCase();

		expect(
			validateSettingsWrite({
				OwnerId: ` ${upper} `,
			}).OwnerId,
		).toBe(upper);
	});

	it("gates the world name with the one pattern: 1 to 16 characters, no control character, no edge space, no path", () => {
		expect(worldNameWriteOf(" Ashen_Vale-2 ")).toBe("Ashen_Vale-2");
		expect(requireWorldName("ABCDEFGHIJKLMNOP")).toBe("ABCDEFGHIJKLMNOP");

		for (const name of [
			"Walk New",
			"Ash.en",
			"O'Brien",
			"Café",
			"مابي",
			"-Ashen",
			".",
		]) {
			expect(requireWorldName(name)).toBe(name);
		}

		for (const name of [
			"",
			"   ",
			"ABCDEFGHIJKLMNOPQ",
			"../Logs",
			"a/b",
			"a\\b",
			"a..b",
			"..",
			"Ash\u0007en",
			"Ash\u0085en",
		]) {
			expect(() => worldNameWriteOf(name)).toThrow(BridgeUserError);
		}

		expect(() => requireWorldName(" Ashen")).toThrow(BridgeUserError);
		expect(() => requireWorldName("Ashen ")).toThrow(BridgeUserError);
		expect(
			validateSettingsWrite({
				DefaultWorldName: "Café",
			}).DefaultWorldName,
		).toBe("Café");
		expect(() =>
			validateSettingsWrite({
				DefaultWorldName: "../Logs",
			}),
		).toThrow(BridgeUserError);
		expect(WORLD_NAME_INVALID.en).toContain("16");
	});

	it("refuses a key the game does not have, including the admin list and the server guid", () => {
		expect(() =>
			validateSettingsWrite({
				ServerGuid: "x",
			}),
		).toThrow(BridgeUserError);
		expect(() =>
			validateSettingsWrite({
				AdministratorList: "()",
			}),
		).toThrow(BridgeUserError);
	});

	it("refuses names that are empty or past the limit", () => {
		expect(() =>
			validateSettingsWrite({
				ServerName: " ",
			}),
		).toThrow(BridgeUserError);
		expect(() =>
			validateSettingsWrite({
				ServerName: "x".repeat(33),
			}),
		).toThrow(BridgeUserError);
		expect(() =>
			validateSettingsWrite({
				DefaultWorldName: "x".repeat(17),
			}),
		).toThrow(BridgeUserError);
	});

	it("refuses a password with a space or a control character, and an empty admin password", () => {
		expect(() =>
			validateSettingsWrite({
				WorldPassword: "two words",
			}),
		).toThrow(BridgeUserError);
		expect(() =>
			validateSettingsWrite({
				WorldPassword: "line\nbreak",
			}),
		).toThrow(BridgeUserError);
		expect(() =>
			validateSettingsWrite({
				AdminPassword: "",
			}),
		).toThrow(BridgeUserError);
	});

	it("keeps the player count inside 1 to 6 and the platforms inside the five the game knows", () => {
		expect(() =>
			validateSettingsWrite({
				MaxPlayers: 7,
			}),
		).toThrow(BridgeUserError);
		expect(() =>
			validateSettingsWrite({
				MaxPlayers: 0,
			}),
		).toThrow(BridgeUserError);
		expect(() =>
			validateSettingsWrite({
				PlatformPolicy: "Steam",
			}),
		).toThrow(BridgeUserError);
	});

	it("refuses an owner id that is not a player id", () => {
		expect(() =>
			validateSettingsWrite({
				OwnerId: "Mohammed",
			}),
		).toThrow(BridgeUserError);
	});
});

describe("showing the settings", () => {
	it("fills the form defaults for keys the file does not hold yet", () => {
		expect(settingValues({})).toEqual({
			AdminPassword: "",
			bAllowSendingCrashDumps: false,
			DefaultWorldName: "",
			MaxPlayers: 6,
			OwnerId: "",
			PlatformPolicy: "Crossplay",
			ServerName: "",
			WorldPassword: "",
		});
	});
});
