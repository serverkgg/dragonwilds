const MS_PER_SECOND = 1000;

export interface DragonwildsMetricsSnapshot {
	readyAt: number | null;
	players: number | null;
	uptimeSeconds: number | null;
}

export interface DragonwildsMetricsSampler {
	markReady(at?: number): void;
	recordPlayers(online: number | null): void;
	snapshot(at?: number): DragonwildsMetricsSnapshot;
	clear(): void;
}

export const createMetricsSampler = (): DragonwildsMetricsSampler => {
	let readyAt: number | null = null;
	let players: number | null = null;

	return {
		markReady(at = Date.now()) {
			readyAt = at;
		},

		recordPlayers(online) {
			players = online;
		},

		snapshot(at = Date.now()) {
			return {
				players,
				readyAt,
				uptimeSeconds: readyAt === null ? null : Math.max(0, Math.floor((at - readyAt) / MS_PER_SECOND)),
			};
		},

		clear() {
			readyAt = null;
			players = null;
		},
	};
};

export const metrics = createMetricsSampler();
