import { type Bridge, BridgeKind } from "@serverkgg/bridge";

export const SETTLE_SECONDS = 10;

export const backup: Bridge.Backup = {
	kind: BridgeKind.Backup,
	settleSeconds: SETTLE_SECONDS,
};
