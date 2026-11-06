import type { Bridge } from "@serverkgg/bridge";
import { PROVISIONAL_LEAVE_LINE, PROVISIONAL_LOGIN_LINE, parseLeave, parseLogin } from "./dragonwildsLog";
import { roster } from "./dragonwildsRoster";

const watched = new WeakSet<Bridge.Context>();

export const watchServerLog = (context: Bridge.Context) => {
	if (watched.has(context)) {
		return;
	}

	watched.add(context);

	context.logs.follow(PROVISIONAL_LOGIN_LINE, (match) => {
		const login = parseLogin(match.at(0) ?? "");

		if (login) {
			roster.join(login.playerId, login.player);
		}
	});

	context.logs.follow(PROVISIONAL_LEAVE_LINE, (match) => {
		const left = parseLeave(match.at(0) ?? "");

		if (left) {
			roster.leave(left.playerId);
		}
	});
};
