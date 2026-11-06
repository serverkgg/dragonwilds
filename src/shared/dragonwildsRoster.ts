import type { Bridge } from "@serverkgg/bridge";
import { createRosterSync } from "@serverkgg/bridge/presence";

export interface DragonwildsPlayer {
	playerId: string;
	name: string | null;
	joinedAt: number;
}

export interface DragonwildsRoster {
	join(playerId: string, name: string | null, at?: number): void;
	leave(playerId: string): void;
	clear(): void;
	all(): DragonwildsPlayer[];
}

export const displayNameOf = (player: DragonwildsPlayer) => {
	return player.name === null || player.name.length === 0 ? player.playerId : player.name;
};

export const createRoster = (): DragonwildsRoster => {
	const players = new Map<string, DragonwildsPlayer>();

	return {
		join(playerId, name, at = Date.now()) {
			const known = players.get(playerId);

			players.set(playerId, {
				joinedAt: known?.joinedAt ?? at,
				name: name === null || name.length === 0 ? (known?.name ?? null) : name,
				playerId,
			});
		},

		leave(playerId) {
			players.delete(playerId);
		},

		clear() {
			players.clear();
		},

		all() {
			return [
				...players.values(),
			];
		},
	};
};

export const presenceOf = (player: DragonwildsPlayer): Bridge.Values => {
	return {
		player: displayNameOf(player),
		playerId: player.playerId,
	};
};

export const roster = createRoster();

export const rosterSync = createRosterSync<DragonwildsPlayer>({
	id: (player) => player.playerId,
	presenceOf,
});
