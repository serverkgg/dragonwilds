import type { BridgeDriver } from "@serverkgg/bridge";
import { backup } from "./backup";
import { admins, players } from "./collections";
import { access, metrics } from "./details";
import { events } from "./events";
import { install } from "./install";
import { lifecycle } from "./lifecycle";
import { mods } from "./mods";
import { panel } from "./panel";
import { query } from "./query";
import { settings } from "./settings";
import { setup } from "./setup";
import { terminal } from "./terminal";
import { worldActions, worlds } from "./worlds";

export const driver: BridgeDriver = {
	install,
	lifecycle,
	events,
	query,
	backup,
	setup,
	terminal,
	panel,
	modules: {
		settings,
		access,
		metrics,
		worlds,
		worldActions,
		mods,
		players,
		admins,
	},
};
