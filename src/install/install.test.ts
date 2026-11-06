import { describe, expect, it } from "bun:test";
import { INSTALL_STAMP_FILE } from "@serverkgg/bridge/install";
import { BridgeEventName } from "@serverkgg/bridge/protocol";
import { CRASHPAD_HANDLER, LAUNCHER_SCRIPT, readDragonwildsStamp, SERVER_BINARY } from "../shared";
import { EMPTY_STAMP, memoryContext } from "../testing";
import { install, markExecutable, recordBuild } from "./install";

describe("stamping the steam build", () => {
	it("records the first build without calling it an update", async () => {
		const { activities, context, emits } = memoryContext();

		await recordBuild(context, EMPTY_STAMP, "26161880");

		expect((await readDragonwildsStamp(context)).buildId).toBe("26161880");
		expect(activities).toEqual([]);
		expect(emits).toEqual([]);
	});

	it("reports a build change as an update", async () => {
		const { activities, context, emits } = memoryContext();

		await recordBuild(
			context,
			{
				...EMPTY_STAMP,
				buildId: "26161880",
			},
			"26200000",
		);

		expect(emits.map((entry) => entry.event)).toEqual([
			BridgeEventName.ServerUpdated,
		]);
		expect(activities.map((entry) => entry.name)).toEqual([
			BridgeEventName.ServerUpdated,
		]);
	});

	it("writes nothing when steam names no build, so the stamped build stands", async () => {
		const { context, files } = memoryContext();

		await recordBuild(
			context,
			{
				...EMPTY_STAMP,
				buildId: "26161880",
			},
			null,
		);

		expect(files.has(INSTALL_STAMP_FILE)).toBe(false);
	});

	it("describes the server by the steam build id, which update detection compares", async () => {
		const { context } = memoryContext({
			files: {
				[INSTALL_STAMP_FILE]: JSON.stringify({
					buildId: "26161880",
				}),
			},
		});

		expect(await install.describe?.(context)).toEqual({
			build: null,
			variant: null,
			version: "26161880",
		});
	});
});

describe("making the server files executable", () => {
	it("marks the binary, the launcher and the crash handler that steam delivered, and nothing missing", async () => {
		const { commands, context } = memoryContext({
			files: {
				[CRASHPAD_HANDLER]: "elf",
				[SERVER_BINARY]: "elf",
			},
		});

		await markExecutable(context);

		expect(commands).toEqual([
			[
				"chmod",
				"+x",
				SERVER_BINARY,
				CRASHPAD_HANDLER,
			],
		]);
		expect(commands.flat()).not.toContain(LAUNCHER_SCRIPT);
	});

	it("fails loudly when chmod fails", async () => {
		const { context } = memoryContext({
			exec: () => {
				return {
					code: 1,
					stderr: "Operation not permitted",
					stdout: "",
				};
			},
			files: {
				[SERVER_BINARY]: "elf",
			},
		});

		await expect(markExecutable(context)).rejects.toThrow("could not be made executable");
	});
});
