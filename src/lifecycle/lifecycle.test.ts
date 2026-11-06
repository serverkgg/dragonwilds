import { describe, expect, it } from "bun:test";
import { BridgeSetupStepState, BridgeStopSignal } from "@serverkgg/bridge";
import { INSTALL_STAMP_FILE } from "@serverkgg/bridge/install";
import { BridgeEventName } from "@serverkgg/bridge/protocol";
import {
	BEACON_PORT,
	DEDICATED_SERVER_FILE,
	GAME_INI_FILE,
	GAME_PORT,
	LOG_FILE,
	metrics,
	readDragonwildsStamp,
	roster,
	START_WRAPPER,
} from "../shared";
import {
	ADMIN_PASSWORD_FIXTURE,
	CONFIG_FILES,
	memoryContext,
	OWNER_MISSING_LOG_FIXTURE,
	READY_LOG_FIXTURE,
} from "../testing";
import { lifecycle, STOP_TIMEOUT_SECONDS } from "./lifecycle";

const PORTS = {
	[BEACON_PORT]: 26_100,
	[GAME_PORT]: 26_000,
};

describe("starting dragonwilds", () => {
	it("runs the linux binary through the masking wrapper with both mirrored ports", async () => {
		const { context, portsRead } = memoryContext({
			files: CONFIG_FILES,
			ports: PORTS,
		});

		expect(await lifecycle.command(context)).toEqual([
			START_WRAPPER,
			"/home/container/RSDragonwilds/Binaries/Linux/RSDragonwildsServer-Linux-Shipping",
			"RSDragonwilds",
			"-Port=26000",
			"-BeaconPort=26100",
			"-log",
		]);
		expect(portsRead).toEqual([
			GAME_PORT,
			BEACON_PORT,
		]);
	});

	it("puts no password on the command line, and writes the admin password and player limit into the files", async () => {
		const { context, files } = memoryContext({
			files: CONFIG_FILES,
			ports: PORTS,
		});

		const argv = (await lifecycle.command(context)).join(" ");

		expect(argv).not.toContain(ADMIN_PASSWORD_FIXTURE);
		expect(argv.toLowerCase()).not.toContain("password");
		expect(files.get(DEDICATED_SERVER_FILE)).toContain(`AdminPassword=${ADMIN_PASSWORD_FIXTURE}`);
		expect(files.get(GAME_INI_FILE)).toContain("MaxPlayers=4");
	});

	it("writes the settings parked while the game ran into both files before it launches", async () => {
		const { activities, context, files } = memoryContext({
			files: {
				...CONFIG_FILES,
				[INSTALL_STAMP_FILE]: JSON.stringify({
					settingsBaseline: {
						secrets: {},
						values: {
							ServerName: "Old Name",
						},
					},
					settingsPending: {
						AdministratorList: "(0002ffeeddccbbaa0099887766554433,0002a1b3c4d5e6f708192a3b4c5d6e7f)",
						ServerName: "New Name",
					},
					settingsRetained: {
						MaxPlayers: 5,
					},
				}),
			},
			ports: PORTS,
		});

		await lifecycle.command(context);

		expect(files.get(DEDICATED_SERVER_FILE)).toContain("ServerName=New Name");
		expect(files.get(DEDICATED_SERVER_FILE)).toContain(
			"AdministratorList=(0002ffeeddccbbaa0099887766554433,0002a1b3c4d5e6f708192a3b4c5d6e7f)",
		);
		expect(files.get(GAME_INI_FILE)).toContain("MaxPlayers=5");
		expect((await readDragonwildsStamp(context)).settingsPending).toEqual({});
		expect(activities.at(0)?.name).toBe(BridgeEventName.SettingsApplied);
	});

	it("marks the metrics ready when the world comes up", async () => {
		metrics.clear();

		await lifecycle.onReady?.(memoryContext().context);

		expect(metrics.snapshot().readyAt).not.toBeNull();
	});

	it("reports the verify step at launch and again once the boot settles", async () => {
		const { context, files, setupReports } = memoryContext({
			files: {
				...CONFIG_FILES,
				[LOG_FILE]: OWNER_MISSING_LOG_FIXTURE,
			},
			ports: PORTS,
		});

		await lifecycle.command(context);

		files.set(LOG_FILE, READY_LOG_FIXTURE);

		await lifecycle.onReady?.(context);

		expect(setupReports.map((runtime) => runtime.steps.at(0)?.state)).toEqual([
			BridgeSetupStepState.Active,
			BridgeSetupStepState.Done,
		]);
	});
});

describe("stopping dragonwilds", () => {
	it("sends sigterm to the process group and waits inside the platform's deadline", () => {
		expect(lifecycle.stopSignal).toBe(BridgeStopSignal.Term);
		expect(STOP_TIMEOUT_SECONDS).toBeLessThanOrEqual(180);
		expect(lifecycle.stopTimeoutSeconds).toBe(STOP_TIMEOUT_SECONDS);
	});

	it("says the server is stopping and lets everyone leave before the signal", async () => {
		const { context, emits } = memoryContext();

		roster.clear();
		roster.join("0002a1b3c4d5e6f708192a3b4c5d6e7f", "Mohammed");

		await lifecycle.stop?.(context);

		expect(emits.map((entry) => entry.event)).toContain(BridgeEventName.ServerStopping);
		expect(roster.all()).toEqual([]);
	});
});
