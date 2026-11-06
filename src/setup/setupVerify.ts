import { type Bridge, BridgeSetupPromptKind, BridgeSetupStepState } from "@serverkgg/bridge";
import {
	BootVerdict,
	bootVerdictOf,
	OWNER_ID_KEY,
	patchDragonwildsStamp,
	readBootLines,
	readDragonwildsStamp,
	storedConfig,
	textOf,
} from "../shared";

export const VERIFY_STEP = "verify";

export const CHECK_ACTION = "check";

export const SETTLE_ATTEMPTS = 10;

export const SETTLE_DELAY_MS = 500;

export enum VerifyPhase {
	Ready = "ready",
	OwnerMissing = "owner-missing",
	PlatformRefused = "platform-refused",
	Refused = "refused",
	Restart = "restart",
	Starting = "starting",
	Stopped = "stopped",
}

export interface VerifyEvidence {
	ownerSet: boolean;
	ownerPending: boolean;
	running: boolean;
	boot: BootVerdict;
}

const QUIET_ONCE_VERIFIED: readonly VerifyPhase[] = [
	VerifyPhase.Restart,
	VerifyPhase.Starting,
	VerifyPhase.Stopped,
];

const CHECK: Bridge.SetupAction = {
	id: CHECK_ACTION,
	label: {
		ar: "تحقق مرة ثانية",
		en: "Check again",
	},
};

export const OWNER_MISSING_MESSAGE: Bridge.Text = {
	ar: "لا يوجد معرّف لاعب للمالك بعد، ولا يفتح دراقونوايلدز الماب دونه. اكتبه في خطوة مالك السيرفر، ثم نفّذ ريستارت لسيرفرك.",
	en: "There's no owner's player ID yet, and Dragonwilds opens no world without one. Type it in the Server owner step, then restart your server.",
};

export const REFUSED_MESSAGE: Bridge.Text = {
	ar: "رفض دراقونوايلدز ملف إعدادات السيرفر في آخر تشغيل. تأكد من معرّف اللاعب في خطوة مالك السيرفر ومن خانة المنصات في تبويب الإعدادات، ثم نفّذ ريستارت لسيرفرك.",
	en: "Dragonwilds refused the server's settings file at the last start. Check the player ID in the Server owner step and the Platforms field in the Settings tab, then restart your server.",
};

export const PLATFORM_REFUSED_MESSAGE: Bridge.Text = {
	ar: "رفض دراقونوايلدز قيمة المنصات في ملف إعدادات السيرفر في آخر تشغيل. اختر المنصات في خطوة اختر المنصات أو في خانة المنصات في تبويب الإعدادات، ثم نفّذ ريستارت لسيرفرك.",
	en: "Dragonwilds refused the platforms value in the server's settings file at the last start. Choose them in the Pick the platforms step or the Platforms field in the Settings tab, then restart your server.",
};

export const RESTART_MESSAGE: Bridge.Text = {
	ar: "يُطبَّق معرّف اللاعب للمالك بعد الريستارت. نفّذ ريستارت لسيرفرك، وتكتمل هذه الخطوة وحدها عندما يفتح الماب.",
	en: "The owner's player ID applies after a restart. Restart your server, and this step finishes by itself once it opens the world.",
};

export const STARTING_MESSAGE: Bridge.Text = {
	ar: "جاري تشغيل سيرفرك. تكتمل هذه الخطوة وحدها عندما يفتح الماب، عطه لحظة.",
	en: "Your server is starting. This step finishes by itself once it opens the world.",
};

export const STOPPED_MESSAGE: Bridge.Text = {
	ar: "سيرفرك متوقف. شغّله، وتكتمل هذه الخطوة وحدها عندما يفتح الماب.",
	en: "Your server is stopped. Start it, and this step finishes by itself once it opens the world.",
};

export const verifyPhaseOf = (evidence: VerifyEvidence): VerifyPhase => {
	if (!evidence.ownerSet) {
		return VerifyPhase.OwnerMissing;
	}

	if (evidence.boot === BootVerdict.Ready) {
		return VerifyPhase.Ready;
	}

	if (evidence.ownerPending) {
		return VerifyPhase.Restart;
	}

	if (!evidence.running) {
		return VerifyPhase.Stopped;
	}

	if (evidence.boot === BootVerdict.PlatformRefused) {
		return VerifyPhase.PlatformRefused;
	}

	return evidence.boot === BootVerdict.OwnerMissing || evidence.boot === BootVerdict.Refused
		? VerifyPhase.Refused
		: VerifyPhase.Starting;
};

const stepsOf = (state: BridgeSetupStepState): Bridge.SetupStepStatus[] => {
	return [
		{
			id: VERIFY_STEP,
			state,
		},
	];
};

const askedOf = (message: Bridge.Text): Bridge.SetupRuntime => {
	return {
		prompt: {
			actions: [
				CHECK,
			],
			kind: BridgeSetupPromptKind.Action,
			message,
		},
		steps: stepsOf(BridgeSetupStepState.Active),
	};
};

export const verifyRuntimeOf = (phase: VerifyPhase): Bridge.SetupRuntime => {
	switch (phase) {
		case VerifyPhase.Ready: {
			return {
				prompt: null,
				steps: stepsOf(BridgeSetupStepState.Done),
			};
		}

		case VerifyPhase.OwnerMissing: {
			return askedOf(OWNER_MISSING_MESSAGE);
		}

		case VerifyPhase.Refused: {
			return {
				prompt: {
					actions: [
						CHECK,
					],
					kind: BridgeSetupPromptKind.Failed,
					message: REFUSED_MESSAGE,
				},
				steps: stepsOf(BridgeSetupStepState.Failed),
			};
		}

		case VerifyPhase.PlatformRefused: {
			return {
				prompt: {
					actions: [
						CHECK,
					],
					kind: BridgeSetupPromptKind.Failed,
					message: PLATFORM_REFUSED_MESSAGE,
				},
				steps: stepsOf(BridgeSetupStepState.Failed),
			};
		}

		case VerifyPhase.Restart: {
			return askedOf(RESTART_MESSAGE);
		}

		case VerifyPhase.Starting: {
			return {
				prompt: {
					kind: BridgeSetupPromptKind.Wait,
					message: STARTING_MESSAGE,
				},
				steps: stepsOf(BridgeSetupStepState.Active),
			};
		}

		case VerifyPhase.Stopped: {
			return askedOf(STOPPED_MESSAGE);
		}
	}
};

export const readVerifyEvidence = async (context: Bridge.Context): Promise<VerifyEvidence> => {
	const stamp = await readDragonwildsStamp(context);
	const stored = await storedConfig(context);

	return {
		boot: bootVerdictOf(await readBootLines(context)),
		ownerPending: Object.hasOwn(stamp.settingsPending, OWNER_ID_KEY),
		ownerSet: textOf(stored, OWNER_ID_KEY).trim().length > 0,
		running: context.server.running,
	};
};

const reportPhase = async (context: Bridge.Context, phase: VerifyPhase, automatic: boolean) => {
	const stamp = await readDragonwildsStamp(context);

	if (phase === VerifyPhase.Ready && !stamp.ownerVerified) {
		await patchDragonwildsStamp(context, {
			ownerVerified: true,
		});
	}

	if (automatic && stamp.ownerVerified && QUIET_ONCE_VERIFIED.includes(phase)) {
		return phase;
	}

	context.setup.report(verifyRuntimeOf(phase));

	return phase;
};

export const reportVerify = async (context: Bridge.Context, automatic = false): Promise<VerifyPhase> => {
	return await reportPhase(context, verifyPhaseOf(await readVerifyEvidence(context)), automatic);
};

export const reportStarting = async (context: Bridge.Context): Promise<VerifyPhase> => {
	const settled = verifyPhaseOf(await readVerifyEvidence(context));
	const phase = settled === VerifyPhase.Ready || settled === VerifyPhase.OwnerMissing ? settled : VerifyPhase.Starting;

	return await reportPhase(context, phase, true);
};

const settledBootOf = async (context: Bridge.Context, attempts: number, delayMs: number) => {
	let boot = bootVerdictOf(await readBootLines(context));

	for (let attempt = 1; attempt < attempts && boot === BootVerdict.Booting; attempt++) {
		await Bun.sleep(delayMs);

		boot = bootVerdictOf(await readBootLines(context));
	}

	return boot;
};

export const reportSettled = async (
	context: Bridge.Context,
	attempts: number = SETTLE_ATTEMPTS,
	delayMs: number = SETTLE_DELAY_MS,
): Promise<VerifyPhase> => {
	await settledBootOf(context, attempts, delayMs);

	return await reportVerify(context, true);
};
