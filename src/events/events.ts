import { type Bridge, BridgeKind } from "@serverkgg/bridge";
import { BridgeEventName } from "@serverkgg/bridge/protocol";
import { CRASH_LINE, OUT_OF_MEMORY_LINE, PORT_BIND_FAILED, SERVER_READY } from "../shared";

const EVENTS_RAISED_BY_ROSTER_SYNC = [
	BridgeEventName.PlayerJoined,
	BridgeEventName.PlayerLeft,
];

const EVENTS_RAISED_AS_ACTIVITY = [
	BridgeEventName.GameInstalled,
	BridgeEventName.SettingsApplied,
	BridgeEventName.AccessGranted,
	BridgeEventName.AccessRevoked,
	BridgeEventName.WorldActivated,
	BridgeEventName.WorldCreated,
	BridgeEventName.WorldDeleted,
	BridgeEventName.WorldImported,
	BridgeEventName.ModInstalled,
	BridgeEventName.ModRemoved,
	BridgeEventName.ModEnabled,
	BridgeEventName.ModDisabled,
];

export const events: Bridge.Events = {
	kind: BridgeKind.Events,
	emits: [
		...EVENTS_RAISED_BY_ROSTER_SYNC,
		...EVENTS_RAISED_AS_ACTIVITY,
		BridgeEventName.ServerStopping,
		BridgeEventName.ServerUpdated,
	],
	patterns: [
		{
			emit: BridgeEventName.ServerStarted,
			match: SERVER_READY,
		},
		{
			emit: BridgeEventName.ServerCrashed,
			match: CRASH_LINE,
		},
		{
			emit: BridgeEventName.OutOfMemory,
			match: OUT_OF_MEMORY_LINE,
		},
		{
			emit: BridgeEventName.PortBindFailed,
			match: PORT_BIND_FAILED,
		},
	],
};
