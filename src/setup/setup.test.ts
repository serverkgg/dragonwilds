import { describe, expect, it } from "bun:test";
import { LOG_FILE } from "../shared";
import { CONFIG_FILES, memoryContext, READY_LOG_FIXTURE } from "../testing";
import { setup } from "./setup";
import { CHECK_ACTION, VERIFY_STEP } from "./setupVerify";

describe("answering the verify step", () => {
	it("answers the check with the state on disk", async () => {
		const { context, setupReports } = memoryContext({
			files: {
				...CONFIG_FILES,
				[LOG_FILE]: READY_LOG_FIXTURE,
			},
		});

		await setup.submit?.(context, VERIFY_STEP, CHECK_ACTION, {});

		expect(setupReports.at(0)?.prompt).toBeNull();
	});

	it("answers an unknown step or action with a prompt, never a failed call", async () => {
		const { context, logged, setupReports } = memoryContext({
			files: CONFIG_FILES,
		});

		await setup.submit?.(context, "elsewhere", "retry", {});

		expect(setupReports.at(0)?.prompt).not.toBeNull();
		expect(logged.map((entry) => entry.level)).toEqual([
			"warn",
		]);
	});
});
