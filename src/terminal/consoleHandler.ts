import { type Bridge, BridgeUserError } from "@serverkgg/bridge";
import {
	type DragonwildsPlayer,
	directAddressOf,
	displayNameOf,
	listWorlds,
	maxPlayersOf,
	metrics,
	OWNER_ID_KEY,
	PLATFORM_POLICY_KEY,
	platformPolicyOf,
	ROSTER_VERIFIED,
	readConfig,
	readDragonwildsStamp,
	roster,
	textOf,
	WORLD_NAME_KEY,
} from "../shared";

const SPACING = /\s+/;

const UNKNOWN = "unknown";

const ROSTER_HEADER = "player,playerId,joined";

const NO_COMMAND: Bridge.Text = {
	ar: "اكتب أمرًا من قائمة الأوامر.",
	en: "Type a command from the command list.",
};

const NO_CONSOLE: Bridge.Text = {
	ar: "لا يقرأ سيرفر دراقونوايلدز أي أمر من الكونسول، فلا يمكن تمرير هذا الأمر إليه. الطرد والحظر والأدمن تتم داخل اللعبة، والأوامر التي ننفّذها هنا موجودة في قائمة الأوامر.",
	en: "A Dragonwilds server reads nothing from a console, so we can't pass that command to it. Kicks, bans and admin happen in the game, and the command list holds the ones we answer here.",
};

export const commandNameOf = (input: string) => {
	return (input.trim().split(SPACING).at(0) ?? "").toLowerCase();
};

export const rosterLines = (players: DragonwildsPlayer[]): string[] => {
	if (players.length === 0) {
		return [
			"no players online",
		];
	}

	return [
		ROSTER_HEADER,
		...players.map((player) => {
			return [
				displayNameOf(player),
				player.playerId,
				new Date(player.joinedAt).toISOString(),
			].join(",");
		}),
	];
};

type DragonwildsConsoleCommand = (context: Bridge.Context) => Promise<string[]>;

export const consoleCommands: Record<string, DragonwildsConsoleCommand> = {
	async status(context) {
		const stamp = await readDragonwildsStamp(context);
		const config = await readConfig(context);
		const snapshot = metrics.snapshot();
		const worldName = textOf(config, WORLD_NAME_KEY);
		const active = (await listWorlds(context, worldName)).find((world) => world.active);

		return [
			`build: ${stamp.buildId ?? UNKNOWN}`,
			`players: ${ROSTER_VERIFIED ? roster.all().length : UNKNOWN}/${maxPlayersOf(config)}`,
			`uptime: ${snapshot.uptimeSeconds === null ? UNKNOWN : `${snapshot.uptimeSeconds}s`}`,
			`world: ${active?.name ?? (worldName.length === 0 ? UNKNOWN : `${worldName}, created at the next start`)}`,
			`platforms: ${platformPolicyOf(config[PLATFORM_POLICY_KEY])}`,
			`owner: ${textOf(config, OWNER_ID_KEY).length === 0 ? "missing, set the owner's player id in the settings tab" : "set"}`,
		];
	},

	async players() {
		return rosterLines(roster.all());
	},

	async access(context) {
		const worldName = textOf(await readConfig(context), WORLD_NAME_KEY);

		return [
			`world name: ${worldName.length === 0 ? UNKNOWN : worldName}`,
			`direct address: ${directAddressOf(context) ?? UNKNOWN}`,
		];
	},

	async help() {
		return [
			"status: build, players, uptime, active world, platforms and owner",
			"players: everyone the log says is connected, with their player id",
			"access: the world name players search for and the direct address",
			"help: the commands we answer here",
		];
	},
};

export const consoleHandler: NonNullable<Bridge.Terminal["run"]> = async (context, input) => {
	const name = commandNameOf(input);

	if (name.length === 0) {
		throw new BridgeUserError(NO_COMMAND);
	}

	const command = Object.hasOwn(consoleCommands, name) ? consoleCommands[name] : undefined;

	if (!command) {
		throw new BridgeUserError(NO_CONSOLE);
	}

	return {
		groups: {},
		line: (await command(context)).join("\n"),
		sent: input,
	};
};
