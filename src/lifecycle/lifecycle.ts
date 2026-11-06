import { type Bridge, BridgeKind, BridgeStopSignal } from "@serverkgg/bridge";
import { BridgeEventName } from "@serverkgg/bridge/protocol";
import { reportSettled, reportStarting } from "../setup";
import {
	applyRetainedSettings,
	BEACON_PORT,
	BEACON_PORT_FLAG,
	CONTAINER_HOME,
	GAME_PORT,
	LOG_ARGUMENT,
	metrics,
	PORT_FLAG,
	PROJECT_ARGUMENT,
	readDragonwildsStamp,
	replayPendingSettings,
	roster,
	rosterSync,
	SERVER_BINARY,
	SERVER_SETTLED,
	START_WRAPPER,
	watchServerLog,
} from "../shared";

export const STOP_TIMEOUT_SECONDS = 30;

export const startArgs = (context: Bridge.Context): string[] => {
	return [
		PROJECT_ARGUMENT,
		`${PORT_FLAG}${context.port(GAME_PORT)}`,
		`${BEACON_PORT_FLAG}${context.port(BEACON_PORT)}`,
		LOG_ARGUMENT,
	];
};

export const lifecycle: Bridge.Lifecycle = {
	kind: BridgeKind.Lifecycle,
	ready: SERVER_SETTLED,
	stopSignal: BridgeStopSignal.Term,
	stopTimeoutSeconds: STOP_TIMEOUT_SECONDS,
	async command(context) {
		watchServerLog(context);
		roster.clear();
		metrics.clear();

		await applyRetainedSettings(context, await replayPendingSettings(context, await readDragonwildsStamp(context)));
		await reportStarting(context);

		return [
			START_WRAPPER,
			`${CONTAINER_HOME}/${SERVER_BINARY}`,
			...startArgs(context),
		];
	},
	async onReady(context) {
		metrics.markReady();

		await reportSettled(context);
	},
	async stop(context) {
		context.emit(BridgeEventName.ServerStopping);

		roster.clear();
		rosterSync.sync(context, []);
		metrics.clear();
	},
};
