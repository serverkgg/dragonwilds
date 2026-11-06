import { type Bridge, BridgeKind, BridgeSetupStepKind } from "@serverkgg/bridge";
import { GuideOpenTab } from "@serverkgg/bridge/guides";
import { OWNER_SECTION_ID, SERVER_SECTION_ID, SETTINGS_TAB_ID } from "../panel";
import { OWNER_ID_KEY, PLATFORM_POLICY_KEY, SERVER_NAME_KEY, WORLD_NAME_KEY, WORLD_PASSWORD_KEY } from "../shared";
import { CHECK_ACTION, reportVerify, VERIFY_STEP } from "./setupVerify";

export const OWNER_STEP = "owner";

export const NAME_STEP = "name";

export const CROSSPLAY_STEP = "crossplay";

export const INVITE_STEP = "invite";

const ownerStep: Bridge.SetupStep = {
	fields: [
		OWNER_ID_KEY,
	],
	help: {
		ar: "يطلب دراقونوايلدز معرّف اللاعب الخاص بمالك السيرفر ليفتح الماب. تجده في قائمة Settings داخل اللعبة، فانسخه كما هو.",
		en: "Dragonwilds needs the player ID of the server's owner to open the world. It's in the game's Settings menu, so copy it exactly as it is.",
	},
	id: OWNER_STEP,
	kind: BridgeSetupStepKind.Form,
	required: true,
	section: OWNER_SECTION_ID,
	tab: SETTINGS_TAB_ID,
	title: {
		ar: "اكتب معرّف اللاعب للمالك",
		en: "Set the owner's player ID",
	},
};

const verifyStep: Bridge.SetupStep = {
	help: {
		ar: "نتأكد من سجل آخر تشغيل أن دراقونوايلدز قبل معرّف المالك وفتح الماب.",
		en: "We check the last start's log to see that Dragonwilds took the owner's ID and opened the world.",
	},
	id: VERIFY_STEP,
	kind: BridgeSetupStepKind.Driver,
	required: true,
	requiresRunning: false,
	title: {
		ar: "تأكد أن سيرفرك فتح الماب",
		en: "Check your server opened the world",
	},
};

const nameStep: Bridge.SetupStep = {
	fields: [
		SERVER_NAME_KEY,
		WORLD_NAME_KEY,
		WORLD_PASSWORD_KEY,
	],
	help: {
		ar: "اسم يميّز سيرفرك، واسم الماب الذي يبحث عنه أصحابك، وكلمة مرور إذا أردته خاصًا. تُطبَّق في التشغيل القادم.",
		en: "A name that sets your server apart, the world name your friends search for, and a password if you want it private. They apply at the next start.",
	},
	id: NAME_STEP,
	kind: BridgeSetupStepKind.Form,
	required: false,
	section: SERVER_SECTION_ID,
	tab: SETTINGS_TAB_ID,
	title: {
		ar: "سمِّ سيرفرك ومابك",
		en: "Name your server and world",
	},
};

const crossplayStep: Bridge.SetupStep = {
	fields: [
		PLATFORM_POLICY_KEY,
	],
	help: {
		ar: "الكروس بلاي يسمح بدخول اللاعبين من الكمبيوتر و PlayStation و Xbox و Nintendo Switch 2 معًا، أو اختر منصة واحدة.",
		en: "Crossplay lets players on PC, PlayStation, Xbox and Nintendo Switch 2 join together, or pick one platform.",
	},
	id: CROSSPLAY_STEP,
	kind: BridgeSetupStepKind.Form,
	required: false,
	section: SERVER_SECTION_ID,
	tab: SETTINGS_TAB_ID,
	title: {
		ar: "اختر المنصات",
		en: "Pick the platforms",
	},
};

const inviteStep: Bridge.SetupStep = {
	help: {
		ar: "تجد اسم الماب وكود الانضمام والعنوان في بطاقة طرق الدخول في صفحة نظرة عامة، فأرسلها لأصحابك. يتغيّر كود الانضمام في كل تشغيل.",
		en: "The world name, the join code and the address are on the How to join card on the Overview, so send them to your friends. The join code changes at every start.",
	},
	id: INVITE_STEP,
	kind: BridgeSetupStepKind.Open,
	required: false,
	target: {
		tab: GuideOpenTab.Overview,
	},
	title: {
		ar: "ادعُ أصحابك",
		en: "Invite your friends",
	},
};

export const setup: Bridge.Setup = {
	kind: BridgeKind.Setup,
	steps: [
		ownerStep,
		verifyStep,
		nameStep,
		crossplayStep,
		inviteStep,
	],
	async submit(context, step, action) {
		if (step !== VERIFY_STEP || action !== CHECK_ACTION) {
			context.log.warn("a setup answer named no step or action of this game, so it got the verify state", {
				action,
				step,
			});
		}

		await reportVerify(context);
	},
};
