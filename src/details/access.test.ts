import { describe, expect, it } from "bun:test";
import { BridgeKind } from "@serverkgg/bridge";
import { INSTALL_STAMP_FILE } from "@serverkgg/bridge/install";
import { DEDICATED_SERVER_FILE, LOG_FILE } from "../shared";
import {
	ADMIN_PASSWORD_FIXTURE,
	CONFIG_FILES,
	DEDICATED_SERVER_FIXTURE,
	memoryContext,
	READY_LOG_FIXTURE,
} from "../testing";
import { ACCESS_REFRESH_SECONDS, access, JOIN_CODE_WAITING, PLATFORM_LABELS, WORLD_NAME_PENDING } from "./access";

const statsOf = async (options: Parameters<typeof memoryContext>[0]) => {
	const detail = await access.read(memoryContext(options).context);

	return Object.fromEntries(
		(detail?.stats ?? []).map((stat) => [
			stat.key,
			stat.value,
		]),
	);
};

describe("the access card", () => {
	it("shows the world name, the latest join code, the direct address and the platforms while running", async () => {
		const { context } = memoryContext({
			files: {
				...CONFIG_FILES,
				[LOG_FILE]: READY_LOG_FIXTURE,
			},
			playerAddress: "riyadh-01.serverk.gg:26000",
			running: true,
		});
		const detail = await access.read(context);

		expect(
			Object.fromEntries(
				(detail?.stats ?? []).map((stat) => [
					stat.key,
					stat.value,
				]),
			),
		).toEqual({
			address: "riyadh-01.serverk.gg:26000",
			joinCode: "9876-ZY5X",
			platforms: PLATFORM_LABELS.Crossplay,
			worldName: "Ashen",
		});
		expect(detail?.badges).toEqual([]);
		expect(access.kind).toBe(BridgeKind.Detail);
		expect(access.refreshSeconds).toBe(ACCESS_REFRESH_SECONDS);
	});

	it("hides the old code while stopped, because the next start brings a new one", async () => {
		const detail = await access.read(
			memoryContext({
				files: {
					...CONFIG_FILES,
					[LOG_FILE]: READY_LOG_FIXTURE,
				},
			}).context,
		);

		expect(detail?.stats.find((stat) => stat.key === "joinCode")?.value).toBe("");
		expect(detail?.badges).toEqual([
			JOIN_CODE_WAITING,
		]);
	});

	it("marks a world name waiting for the next start", async () => {
		const detail = await access.read(
			memoryContext({
				files: {
					...CONFIG_FILES,
					[INSTALL_STAMP_FILE]: JSON.stringify({
						settingsPending: {
							DefaultWorldName: "Tortuga",
						},
					}),
					[LOG_FILE]: READY_LOG_FIXTURE,
				},
				running: true,
			}).context,
		);

		expect(detail?.stats.find((stat) => stat.key === "worldName")?.value).toBe("Tortuga");
		expect(detail?.badges).toEqual([
			WORLD_NAME_PENDING,
		]);
	});

	it("shows the world password only when one is set, and never the admin password", async () => {
		expect(
			await statsOf({
				files: CONFIG_FILES,
			}),
		).not.toHaveProperty("worldPassword");

		const stats = await statsOf({
			files: {
				...CONFIG_FILES,
				[DEDICATED_SERVER_FILE]: DEDICATED_SERVER_FIXTURE.replace("WorldPassword=", "WorldPassword=Sails"),
			},
		});

		expect(stats.worldPassword).toBe("Sails");
		expect(Object.values(stats)).not.toContain(ADMIN_PASSWORD_FIXTURE);
	});
});
