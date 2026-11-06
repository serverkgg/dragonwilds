import { type Bridge, BridgeKind } from "@serverkgg/bridge";
import { maxPlayersOf, metrics, ROSTER_VERIFIED, readGameSession, roster, rosterSync } from "../shared";

export const QUERY_REFRESH_SECONDS = 15;

export const onlineOf = (count: number, verified: boolean = ROSTER_VERIFIED) => {
	return verified ? count : null;
};

export const query: Bridge.Query = {
	kind: BridgeKind.Query,
	refreshSeconds: QUERY_REFRESH_SECONDS,
	async sample(context) {
		const players = roster.all();
		const online = onlineOf(players.length);

		rosterSync.sync(context, players);
		metrics.recordPlayers(online);

		return {
			max: maxPlayersOf(await readGameSession(context)),
			online,
			tick: null,
		};
	},
};
