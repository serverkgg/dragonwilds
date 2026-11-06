import { type Bridge, BridgeKind, BridgeUserError } from "@serverkgg/bridge";
import { BridgeEventName } from "@serverkgg/bridge/protocol";
import { applyConfig, readWorldName, WORLD_NAME_KEY, worldNameWriteOf, worldPathOf } from "../shared";

export const CREATE_ACTION = "create";

export const NEW_WORLD_NAME_ARGUMENT = "name";

export const NEW_WORLD_WAITING: Bridge.Text = {
	ar: "ماب بهذا الاسم بانتظار التشغيل القادم أصلًا. شغّل سيرفرك لينشئه دراقونوايلدز.",
	en: "A world with this name is already waiting for the next start. Start your server so Dragonwilds creates it.",
};

export const NEW_WORLD_TAKEN: Bridge.Text = {
	ar: "يوجد على سيرفرك ماب بهذا الاسم. فعّله من جدول المابات، أو اختر اسمًا آخر.",
	en: "Your server already has a world with this name. Activate it from the worlds table, or pick another name.",
};

export const worldActions: Bridge.Actions = {
	kind: BridgeKind.Actions,
	actions: {
		async [CREATE_ACTION](context, args) {
			const name = worldNameWriteOf(args[NEW_WORLD_NAME_ARGUMENT]);

			if (await context.files.exists(worldPathOf(name))) {
				throw new BridgeUserError(NEW_WORLD_TAKEN);
			}

			const previous = await readWorldName(context);

			if (previous === name) {
				throw new BridgeUserError(NEW_WORLD_WAITING);
			}

			await applyConfig(context, {
				[WORLD_NAME_KEY]: name,
			});

			context.log("named a new world so dragonwilds creates it at the next start", {
				previous,
				world: name,
			});
			context.activity.report({
				details: {
					previous,
					world: name,
				},
				name: BridgeEventName.WorldCreated,
				subject: name,
				text: {
					ar: `تم تجهيز ماب جديد باسم ${name}، وينشئه دراقونوايلدز في التشغيل القادم`,
					en: `Set up a new world named ${name}, Dragonwilds creates it at the next start`,
				},
			});
		},
	},
};
