import { type Bridge, BridgeKind } from "@serverkgg/bridge";
import { formatUptime } from "@serverkgg/bridge/utils";
import { type DragonwildsPlayer, displayNameOf, formatUtc, roster } from "../shared";

export const PLAYERS_REFRESH_SECONDS = 15;

const MILLISECONDS_PER_SECOND = 1000;

export interface PlayerRow extends Bridge.Row {
	id: string;
	name: string;
	playerId: string;
	joined: string;
	played: Bridge.Text;
}

export const playerRowOf = (player: DragonwildsPlayer, at: number): PlayerRow => {
	return {
		id: player.playerId,
		joined: formatUtc(player.joinedAt),
		name: displayNameOf(player),
		played: formatUptime((at - player.joinedAt) / MILLISECONDS_PER_SECOND),
		playerId: player.playerId,
	};
};

export const players: Bridge.Collection = {
	kind: BridgeKind.Collection,
	refreshSeconds: PLAYERS_REFRESH_SECONDS,
	requiresRunning: true,
	async list() {
		const at = Date.now();

		return roster.all().map((player) => playerRowOf(player, at));
	},
};
