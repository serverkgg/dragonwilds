import { type Bridge, BridgeKind, BridgeUserError } from "@serverkgg/bridge";
import { BridgeEventName } from "@serverkgg/bridge/protocol";
import { displayNameOf, readAdministrators, requirePlayerId, roster, writeAdministrators } from "../shared";

export const ADMINS_REFRESH_SECONDS = 60;

export const REMOVE_ACTION = "remove";

const ADMINS_LIST = "admins";

export interface AdminRow extends Bridge.Row {
	id: string;
	playerId: string;
	player: string;
}

const ALREADY_ADMIN: Bridge.Text = {
	ar: "هذا اللاعب أدمن أصلًا.",
	en: "That player is already an admin.",
};

const NOT_ADMIN: Bridge.Text = {
	ar: "هذا المعرّف ليس في قائمة الأدمن.",
	en: "That ID isn't on the admin list.",
};

export const playerNameOf = (playerId: string) => {
	const known = roster.all().find((player) => player.playerId === playerId);

	return known === undefined ? "" : displayNameOf(known);
};

export const adminRowOf = (playerId: string): AdminRow => {
	return {
		id: playerId,
		player: playerNameOf(playerId),
		playerId,
	};
};

export const grantedActivity = (playerId: string): Bridge.Activity => {
	return {
		details: {
			list: ADMINS_LIST,
			playerId,
		},
		name: BridgeEventName.AccessGranted,
		subject: playerId,
		text: {
			ar: `تمت إضافة ${playerId} إلى قائمة الأدمن، ويُطبَّق التغيير في التشغيل القادم`,
			en: `Added ${playerId} to the admin list, takes effect on the next start`,
		},
	};
};

export const revokedActivity = (playerId: string): Bridge.Activity => {
	return {
		details: {
			list: ADMINS_LIST,
			playerId,
		},
		name: BridgeEventName.AccessRevoked,
		subject: playerId,
		text: {
			ar: `تمت إزالة ${playerId} من قائمة الأدمن، ويُطبَّق التغيير في التشغيل القادم`,
			en: `Removed ${playerId} from the admin list, takes effect on the next start`,
		},
	};
};

export const admins: Bridge.Collection = {
	kind: BridgeKind.Collection,
	refreshSeconds: ADMINS_REFRESH_SECONDS,
	async list(context) {
		return (await readAdministrators(context)).map(adminRowOf);
	},
	async add(context, input) {
		const playerId = requirePlayerId(input);
		const current = await readAdministrators(context);

		if (current.includes(playerId)) {
			throw new BridgeUserError(ALREADY_ADMIN);
		}

		await writeAdministrators(context, [
			...current,
			playerId,
		]);

		context.log("added an admin", {
			playerId,
		});
		context.activity.report(grantedActivity(playerId));
	},
	actions: {
		async [REMOVE_ACTION](context, row) {
			const playerId = requirePlayerId(row.id);
			const current = await readAdministrators(context);

			if (!current.includes(playerId)) {
				throw new BridgeUserError(NOT_ADMIN);
			}

			await writeAdministrators(
				context,
				current.filter((id) => id !== playerId),
			);

			context.log("removed an admin", {
				playerId,
			});
			context.activity.report(revokedActivity(playerId));
		},
	},
};
