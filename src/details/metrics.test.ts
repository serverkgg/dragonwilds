import { describe, expect, it } from "bun:test";
import { INSTALL_STAMP_FILE } from "@serverkgg/bridge/install";
import { metrics as sampler } from "../shared";
import { CONFIG_FILES, memoryContext } from "../testing";
import { metrics } from "./metrics";

describe("the metrics card", () => {
	it("shows players against the limit, the loaded world, the build and the uptime while running", async () => {
		sampler.clear();
		sampler.markReady(Date.now() - 90_000);
		sampler.recordPlayers(2);

		const detail = await metrics.read(
			memoryContext({
				files: {
					...CONFIG_FILES,
					[INSTALL_STAMP_FILE]: JSON.stringify({
						buildId: "26161880",
						settingsPending: {
							DefaultWorldName: "Tortuga",
						},
						settingsRetained: {
							MaxPlayers: 4,
						},
					}),
				},
				running: true,
			}).context,
		);

		expect(
			Object.fromEntries(
				(detail?.stats ?? []).map((stat) => [
					stat.key,
					stat.value,
				]),
			),
		).toMatchObject({
			build: "26161880",
			players: "2/4",
			world: "Ashen",
		});
		expect(detail?.stats.find((stat) => stat.key === "uptime")?.value).not.toBe("—");
		expect(detail?.stale).toBe(false);

		sampler.clear();
	});

	it("goes stale with no players or uptime while stopped", async () => {
		sampler.clear();

		const detail = await metrics.read(memoryContext().context);

		expect(detail?.stale).toBe(true);
		expect(
			Object.fromEntries(
				(detail?.stats ?? []).map((stat) => [
					stat.key,
					stat.value,
				]),
			),
		).toEqual({
			build: "—",
			players: "—",
			uptime: "—",
			world: "—",
		});
	});
});
