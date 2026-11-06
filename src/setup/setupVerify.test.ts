import { describe, expect, it } from "bun:test";
import { BridgeSetupPromptKind, BridgeSetupStepState } from "@serverkgg/bridge";
import { INSTALL_STAMP_FILE } from "@serverkgg/bridge/install";
import { BootVerdict, DEDICATED_SERVER_FILE, LOG_FILE, readDragonwildsStamp } from "../shared";
import {
	BOOTING_LOG_FIXTURE,
	CONFIG_FILES,
	CONFIG_REFUSED_LOG_FIXTURE,
	DEDICATED_SERVER_FIXTURE,
	memoryContext,
	OWNER_MISSING_LOG_FIXTURE,
	PLATFORM_REFUSED_LOG_FIXTURE,
	PLAYER_ID_FIXTURE,
	READY_LOG_FIXTURE,
} from "../testing";
import {
	OWNER_MISSING_MESSAGE,
	PLATFORM_REFUSED_MESSAGE,
	REFUSED_MESSAGE,
	RESTART_MESSAGE,
	reportSettled,
	reportStarting,
	reportVerify,
	STARTING_MESSAGE,
	STOPPED_MESSAGE,
	VERIFY_STEP,
	VerifyPhase,
	verifyPhaseOf,
	verifyRuntimeOf,
} from "./setupVerify";

const NO_OWNER = DEDICATED_SERVER_FIXTURE.replace(`OwnerId=${PLAYER_ID_FIXTURE}`, "OwnerId=");

const evidence = {
	boot: BootVerdict.None,
	ownerPending: false,
	ownerSet: true,
	running: false,
};

describe("deciding the verify step from the disk", () => {
	it("needs an owner before anything else", () => {
		expect(
			verifyPhaseOf({
				...evidence,
				boot: BootVerdict.Ready,
				ownerSet: false,
			}),
		).toBe(VerifyPhase.OwnerMissing);
	});

	it("is done once a boot opened the world with an owner set", () => {
		expect(
			verifyPhaseOf({
				...evidence,
				boot: BootVerdict.Ready,
				ownerPending: true,
			}),
		).toBe(VerifyPhase.Ready);
	});

	it("asks for a restart while the owner waits for the next start", () => {
		expect(
			verifyPhaseOf({
				...evidence,
				boot: BootVerdict.OwnerMissing,
				ownerPending: true,
				running: true,
			}),
		).toBe(VerifyPhase.Restart);
	});

	it("asks for a start while stopped, whether the server never started or the last boot refused", () => {
		for (const boot of [
			BootVerdict.None,
			BootVerdict.Booting,
			BootVerdict.OwnerMissing,
			BootVerdict.Refused,
		]) {
			expect(
				verifyPhaseOf({
					...evidence,
					boot,
				}),
			).toBe(VerifyPhase.Stopped);
		}
	});

	it("names the platforms when the last boot refused them, ahead of any other refusal", () => {
		expect(
			verifyPhaseOf({
				...evidence,
				boot: BootVerdict.PlatformRefused,
				running: true,
			}),
		).toBe(VerifyPhase.PlatformRefused);
		expect(
			verifyPhaseOf({
				...evidence,
				boot: BootVerdict.PlatformRefused,
			}),
		).toBe(VerifyPhase.Stopped);
	});

	it("names the refusal while running on a refused boot, and waits on a boot still loading", () => {
		expect(
			verifyPhaseOf({
				...evidence,
				boot: BootVerdict.Refused,
				running: true,
			}),
		).toBe(VerifyPhase.Refused);
		expect(
			verifyPhaseOf({
				...evidence,
				boot: BootVerdict.Booting,
				running: true,
			}),
		).toBe(VerifyPhase.Starting);
	});

	it("answers done with no prompt, a refusal as failed, and everything else as a prompt on the active step", () => {
		expect(verifyRuntimeOf(VerifyPhase.Ready)).toEqual({
			prompt: null,
			steps: [
				{
					id: VERIFY_STEP,
					state: BridgeSetupStepState.Done,
				},
			],
		});
		expect(verifyRuntimeOf(VerifyPhase.Refused).steps.at(0)?.state).toBe(BridgeSetupStepState.Failed);
		expect(verifyRuntimeOf(VerifyPhase.Refused).prompt).toMatchObject({
			kind: BridgeSetupPromptKind.Failed,
			message: REFUSED_MESSAGE,
		});
		expect(verifyRuntimeOf(VerifyPhase.Starting).prompt).toMatchObject({
			kind: BridgeSetupPromptKind.Wait,
			message: STARTING_MESSAGE,
		});

		for (const [phase, message] of [
			[
				VerifyPhase.OwnerMissing,
				OWNER_MISSING_MESSAGE,
			],
			[
				VerifyPhase.Restart,
				RESTART_MESSAGE,
			],
			[
				VerifyPhase.Stopped,
				STOPPED_MESSAGE,
			],
		] as const) {
			const runtime = verifyRuntimeOf(phase);

			expect(runtime.steps.at(0)?.state).toBe(BridgeSetupStepState.Active);
			expect(runtime.prompt).toMatchObject({
				kind: BridgeSetupPromptKind.Action,
				message,
			});
		}
	});

	it("names the owner step in every prompt that sends the player back to it", () => {
		for (const message of [
			OWNER_MISSING_MESSAGE,
			REFUSED_MESSAGE,
		]) {
			expect(message.ar).toContain("خطوة مالك السيرفر");
			expect(message.en).toContain("Server owner step");
		}
	});
});

describe("reporting the verify step", () => {
	it("reports done from a ready log and a set owner", async () => {
		const { context, setupReports } = memoryContext({
			files: {
				...CONFIG_FILES,
				[LOG_FILE]: READY_LOG_FIXTURE,
			},
		});

		expect(await reportVerify(context)).toBe(VerifyPhase.Ready);
		expect(setupReports.at(0)?.prompt).toBeNull();
	});

	it("reports the missing owner from a blank owner, and the start prompt once it is set while stopped", async () => {
		const { context, files } = memoryContext({
			files: {
				...CONFIG_FILES,
				[DEDICATED_SERVER_FILE]: NO_OWNER,
				[LOG_FILE]: OWNER_MISSING_LOG_FIXTURE,
			},
		});

		expect(await reportVerify(context)).toBe(VerifyPhase.OwnerMissing);

		files.set(DEDICATED_SERVER_FILE, DEDICATED_SERVER_FIXTURE);

		expect(await reportVerify(context)).toBe(VerifyPhase.Stopped);
	});

	it("reports the restart for an owner recorded while the refused boot runs", async () => {
		const { context } = memoryContext({
			files: {
				...CONFIG_FILES,
				[DEDICATED_SERVER_FILE]: NO_OWNER,
				[INSTALL_STAMP_FILE]: JSON.stringify({
					settingsPending: {
						OwnerId: PLAYER_ID_FIXTURE,
					},
				}),
				[LOG_FILE]: OWNER_MISSING_LOG_FIXTURE,
			},
			running: true,
		});

		expect(await reportVerify(context)).toBe(VerifyPhase.Restart);
	});

	it("reports starting at launch unless the last boot already proved the owner", async () => {
		const refused = memoryContext({
			files: {
				...CONFIG_FILES,
				[LOG_FILE]: CONFIG_REFUSED_LOG_FIXTURE,
			},
		});
		const proven = memoryContext({
			files: {
				...CONFIG_FILES,
				[LOG_FILE]: READY_LOG_FIXTURE,
			},
		});

		expect(await reportStarting(refused.context)).toBe(VerifyPhase.Starting);
		expect(await reportStarting(proven.context)).toBe(VerifyPhase.Ready);
		expect(proven.setupReports.at(0)?.steps.at(0)?.state).toBe(BridgeSetupStepState.Done);
	});

	it("waits for the log to settle after ready, then reports what it says", async () => {
		const { context, files } = memoryContext({
			files: {
				...CONFIG_FILES,
				[LOG_FILE]: BOOTING_LOG_FIXTURE,
			},
			running: true,
		});

		const settled = reportSettled(context, 5, 5);

		files.set(LOG_FILE, READY_LOG_FIXTURE);

		expect(await settled).toBe(VerifyPhase.Ready);
	});

	it("reports a refused config while the refused boot runs, naming the crossplay step when the platforms were refused", async () => {
		const refused = memoryContext({
			files: {
				...CONFIG_FILES,
				[LOG_FILE]: CONFIG_REFUSED_LOG_FIXTURE,
			},
			running: true,
		});
		const platform = memoryContext({
			files: {
				...CONFIG_FILES,
				[LOG_FILE]: PLATFORM_REFUSED_LOG_FIXTURE,
			},
			running: true,
		});

		expect(await reportSettled(refused.context, 1, 0)).toBe(VerifyPhase.Refused);
		expect(await reportSettled(platform.context, 1, 0)).toBe(VerifyPhase.PlatformRefused);
		expect(platform.setupReports.at(0)?.prompt).toMatchObject({
			kind: BridgeSetupPromptKind.Failed,
			message: PLATFORM_REFUSED_MESSAGE,
		});
		expect(PLATFORM_REFUSED_MESSAGE.ar).toContain("خطوة اختر المنصات");
		expect(PLATFORM_REFUSED_MESSAGE.en).toContain("Pick the platforms step");
	});

	it("remembers a proven owner, then stays quiet at a start, a stall or an owner change instead of reopening setup", async () => {
		const { context, files, setupReports } = memoryContext({
			files: {
				...CONFIG_FILES,
				[LOG_FILE]: READY_LOG_FIXTURE,
			},
			running: true,
		});

		expect(await reportSettled(context, 1, 0)).toBe(VerifyPhase.Ready);
		expect((await readDragonwildsStamp(context)).ownerVerified).toBe(true);

		files.set(LOG_FILE, BOOTING_LOG_FIXTURE);

		expect(await reportStarting(context)).toBe(VerifyPhase.Starting);
		expect(await reportVerify(context, true)).toBe(VerifyPhase.Starting);
		expect(setupReports).toHaveLength(1);

		expect(await reportVerify(context)).toBe(VerifyPhase.Starting);
		expect(setupReports).toHaveLength(2);
	});

	it("still reports a refusal and a missing owner after the owner was proven", async () => {
		const { context, files, setupReports } = memoryContext({
			files: {
				...CONFIG_FILES,
				[INSTALL_STAMP_FILE]: JSON.stringify({
					ownerVerified: true,
				}),
				[LOG_FILE]: CONFIG_REFUSED_LOG_FIXTURE,
			},
			running: true,
		});

		expect(await reportSettled(context, 1, 0)).toBe(VerifyPhase.Refused);

		files.set(DEDICATED_SERVER_FILE, NO_OWNER);

		expect(await reportVerify(context, true)).toBe(VerifyPhase.OwnerMissing);
		expect(setupReports).toHaveLength(2);
	});
});
