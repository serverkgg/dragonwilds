export const SERVER_READY = /LogWorld: Bringing World \/Game\/Maps\/(?!Server\/)\S+ up for play/;

export const CONFIG_REFUSED_LINE = /Dedicated Server cannot continue due to DedicatedServer\.ini configuration/;

export const OWNER_MISSING_LINE = /The \[OwnerId\] for this server is empty/;

export const PLATFORM_POLICY_INVALID_LINE = /The \[PlatformPolicy\] value \[[^\]]*\] is invalid/;

export const SERVER_SETTLED = new RegExp(`${SERVER_READY.source}|${CONFIG_REFUSED_LINE.source}`);

export const CRASH_LINE = /Fatal error|=== Critical error/;

export const OUT_OF_MEMORY_LINE = /Ran out of memory allocating/;

export const PORT_BIND_FAILED = /Could not create socket for bind address|InitBindSockets failed/;

export const JOIN_CODE_LINE = /Setting \["JoinCode"\] written with key\[\w+\] value\[(?<code>[^\]\s]+)\]/;

export const ROSTER_VERIFIED = false;

export const PROVISIONAL_LOGIN_LINE =
	/LogNet: Login request: (?<url>.*?) user[Ii]d: (?:[A-Za-z]+:)?(?:[0-9A-Fa-f]{32}\|)?(?<playerId>[0-9A-Fa-f]{32})/;

export const PROVISIONAL_LEAVE_LINE =
	/LogNet: UNetConnection::Close.*?UniqueId: (?:[A-Za-z]+:)?(?:[0-9A-Fa-f]{32}\|)?(?<playerId>[0-9A-Fa-f]{32})/;

const LOGIN_NAME = /[?&]Name=(?<player>[^?&]{1,64})/;

export interface DragonwildsLogin {
	playerId: string;
	player: string;
}

export interface DragonwildsLeave {
	playerId: string;
}

export const parseLogin = (line: string): DragonwildsLogin | null => {
	const groups = PROVISIONAL_LOGIN_LINE.exec(line)?.groups;

	if (groups?.playerId === undefined) {
		return null;
	}

	return {
		player: LOGIN_NAME.exec(groups.url ?? "")?.groups?.player?.trim() ?? "",
		playerId: groups.playerId,
	};
};

export const parseLeave = (line: string): DragonwildsLeave | null => {
	const playerId = PROVISIONAL_LEAVE_LINE.exec(line)?.groups?.playerId;

	if (playerId === undefined) {
		return null;
	}

	return {
		playerId,
	};
};

export const joinCodeOf = (text: string): string | null => {
	let code: string | null = null;

	for (const line of text.split("\n")) {
		const found = JOIN_CODE_LINE.exec(line)?.groups?.code;

		if (found !== undefined) {
			code = found;
		}
	}

	return code;
};
