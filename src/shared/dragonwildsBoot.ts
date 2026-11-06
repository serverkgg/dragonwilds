import type { Bridge } from "@serverkgg/bridge";
import { execDetail } from "@serverkgg/bridge/utils";
import { GAME_PORT, LOG_FILE } from "./dragonwildsApp";
import {
	CONFIG_REFUSED_LINE,
	joinCodeOf,
	OWNER_MISSING_LINE,
	PLATFORM_POLICY_INVALID_LINE,
	SERVER_READY,
} from "./dragonwildsLog";

export const BOOT_MARKERS =
	"Log file open|up for play|cannot continue due to DedicatedServer|for this server is empty|PlatformPolicy|JoinCode";

export const LOG_OPEN_LINE = /Log file open, /;

const GREP_NO_MATCH = 1;

export enum BootVerdict {
	None = "none",
	Booting = "booting",
	Ready = "ready",
	OwnerMissing = "owner-missing",
	PlatformRefused = "platform-refused",
	Refused = "refused",
}

export const latestBootOf = (lines: readonly string[]): string[] => {
	const opened = lines.findLastIndex((line) => LOG_OPEN_LINE.test(line));

	return lines.slice(opened + 1).filter((line) => line.length > 0);
};

export const readBootLines = async (context: Bridge.Context): Promise<string[] | null> => {
	if (!(await context.files.exists(LOG_FILE))) {
		return null;
	}

	const found = await context.exec([
		"grep",
		"-a",
		"-E",
		BOOT_MARKERS,
		LOG_FILE,
	]);

	if (found.code === GREP_NO_MATCH) {
		return [];
	}

	if (found.code !== 0) {
		context.log.warn("could not read the server log", {
			detail: execDetail(found),
		});

		return null;
	}

	return latestBootOf(found.stdout.split("\n"));
};

export const bootVerdictOf = (lines: readonly string[] | null): BootVerdict => {
	if (lines === null) {
		return BootVerdict.None;
	}

	if (lines.some((line) => OWNER_MISSING_LINE.test(line))) {
		return BootVerdict.OwnerMissing;
	}

	if (lines.some((line) => PLATFORM_POLICY_INVALID_LINE.test(line))) {
		return BootVerdict.PlatformRefused;
	}

	if (lines.some((line) => CONFIG_REFUSED_LINE.test(line))) {
		return BootVerdict.Refused;
	}

	return lines.some((line) => SERVER_READY.test(line)) ? BootVerdict.Ready : BootVerdict.Booting;
};

export const readJoinCode = async (context: Bridge.Context): Promise<string | null> => {
	const lines = await readBootLines(context);

	return lines === null ? null : joinCodeOf(lines.join("\n"));
};

export const directAddressOf = (context: Bridge.Context): string | null => {
	const player = context.server.playerAddress;

	if (player !== null && player.length > 0) {
		return player;
	}

	const host = context.server.publicAddress;

	return host === null || host.length === 0 ? null : `${host}:${context.port(GAME_PORT)}`;
};
