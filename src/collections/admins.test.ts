import { describe, expect, it } from "bun:test";
import { BridgeUserError } from "@serverkgg/bridge";
import { BridgeEventName } from "@serverkgg/bridge/protocol";
import { DEDICATED_SERVER_FILE, readDragonwildsStamp, roster } from "../shared";
import { CONFIG_FILES, memoryContext, PLAYER_ID_FIXTURE, SECOND_PLAYER_ID_FIXTURE } from "../testing";
import { admins, REMOVE_ACTION } from "./admins";

const removeAction = admins.actions?.[REMOVE_ACTION];

describe("the admins table", () => {
	it("lists the admins in the config with the name of anyone online", async () => {
		roster.clear();
		roster.join(SECOND_PLAYER_ID_FIXTURE, "Sara");

		const { context } = memoryContext({
			files: CONFIG_FILES,
		});

		expect(await admins.list(context)).toEqual([
			{
				id: SECOND_PLAYER_ID_FIXTURE,
				player: "Sara",
				playerId: SECOND_PLAYER_ID_FIXTURE,
			},
		]);

		roster.clear();
	});

	it("adds an admin into the file while the server is stopped", async () => {
		const { activities, context, files } = memoryContext({
			files: CONFIG_FILES,
		});

		await admins.add?.(context, ` ${PLAYER_ID_FIXTURE} `);

		expect(files.get(DEDICATED_SERVER_FILE)).toContain(
			`AdministratorList=(${SECOND_PLAYER_ID_FIXTURE},${PLAYER_ID_FIXTURE})`,
		);
		expect(activities.map((entry) => entry.name)).toEqual([
			BridgeEventName.AccessGranted,
		]);
	});

	it("parks the new list for the next start while the server runs, and the table shows it", async () => {
		const { context, files } = memoryContext({
			files: CONFIG_FILES,
			running: true,
		});

		await admins.add?.(context, PLAYER_ID_FIXTURE);

		expect(files.get(DEDICATED_SERVER_FILE)).toBe(CONFIG_FILES[DEDICATED_SERVER_FILE]);
		expect((await readDragonwildsStamp(context)).settingsPending).toEqual({
			AdministratorList: `(${SECOND_PLAYER_ID_FIXTURE},${PLAYER_ID_FIXTURE})`,
		});
		expect((await admins.list(context)).map((row) => row.id)).toEqual([
			SECOND_PLAYER_ID_FIXTURE,
			PLAYER_ID_FIXTURE,
		]);
	});

	it("removes an admin and reports it", async () => {
		const { activities, context, files } = memoryContext({
			files: CONFIG_FILES,
		});

		await removeAction?.(
			context,
			{
				id: SECOND_PLAYER_ID_FIXTURE,
			},
			{},
		);

		expect(files.get(DEDICATED_SERVER_FILE)).toContain("AdministratorList=()");
		expect(activities.map((entry) => entry.name)).toEqual([
			BridgeEventName.AccessRevoked,
		]);
	});

	it("refuses an id that is not a player id, one already on the list, and one not on it", async () => {
		const { context } = memoryContext({
			files: CONFIG_FILES,
		});

		await expect(admins.add?.(context, "Mohammed")).rejects.toThrow(BridgeUserError);
		await expect(admins.add?.(context, SECOND_PLAYER_ID_FIXTURE)).rejects.toThrow(BridgeUserError);
		await expect(
			removeAction?.(
				context,
				{
					id: PLAYER_ID_FIXTURE,
				},
				{},
			),
		).rejects.toThrow(BridgeUserError);
	});

	it("works while the server is stopped", () => {
		expect(admins.requiresRunning).toBeUndefined();
	});
});
