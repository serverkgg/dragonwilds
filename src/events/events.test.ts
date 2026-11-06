import { describe, expect, it } from "bun:test";
import { BridgeEventName } from "@serverkgg/bridge/protocol";
import {
	BIND_FAILED_FIXTURE,
	CONFIG_REFUSED_FIXTURE,
	CRASH_FIXTURE,
	READY_FIXTURE,
	STARTUP_MAP_FIXTURE,
} from "../testing";
import { events } from "./events";

const emitted = (line: string) => {
	return events.patterns.filter((pattern) => pattern.match.test(line)).map((pattern) => pattern.emit);
};

describe("the events read from the log", () => {
	it("raises started, crashed and port bind failed from their lines and nothing else", () => {
		expect(emitted(READY_FIXTURE)).toEqual([
			BridgeEventName.ServerStarted,
		]);
		expect(emitted(CRASH_FIXTURE)).toEqual([
			BridgeEventName.ServerCrashed,
		]);
		expect(emitted(BIND_FAILED_FIXTURE)).toEqual([
			BridgeEventName.PortBindFailed,
		]);
		expect(emitted(STARTUP_MAP_FIXTURE)).toEqual([]);
		expect(emitted(CONFIG_REFUSED_FIXTURE)).toEqual([]);
		expect(emitted("LogInit: Build: ++dominion+hotfix-CL-254097")).toEqual([]);
	});

	it("lists every event the code raises", () => {
		expect(events.emits).toEqual(
			expect.arrayContaining([
				BridgeEventName.PlayerJoined,
				BridgeEventName.PlayerLeft,
				BridgeEventName.GameInstalled,
				BridgeEventName.SettingsApplied,
				BridgeEventName.AccessGranted,
				BridgeEventName.AccessRevoked,
				BridgeEventName.ServerStopping,
				BridgeEventName.ServerUpdated,
			]),
		);
	});
});
