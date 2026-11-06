import { describe, expect, it } from "bun:test";
import { createMetricsSampler } from "./dragonwildsMetrics";

describe("the metrics sampler", () => {
	it("counts uptime from the ready line and forgets it on clear", () => {
		const sampler = createMetricsSampler();

		expect(sampler.snapshot(0).uptimeSeconds).toBeNull();

		sampler.markReady(1000);
		sampler.recordPlayers(2);

		expect(sampler.snapshot(61_000)).toEqual({
			players: 2,
			readyAt: 1000,
			uptimeSeconds: 60,
		});

		sampler.clear();

		expect(sampler.snapshot(61_000)).toEqual({
			players: null,
			readyAt: null,
			uptimeSeconds: null,
		});
	});
});
