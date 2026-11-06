import { describe, expect, it } from "bun:test";
import {
	BridgeConfirm,
	BridgeControl,
	BridgeDetailFormat,
	type BridgeDriver,
	BridgeFormTarget,
	BridgeKind,
	BridgeLayout,
	BridgePlace,
	BridgeSetupStepKind,
	BridgeStopSignal,
	BridgeUploadMode,
} from "@serverkgg/bridge";
import { GuideOpenTab } from "@serverkgg/bridge/guides";
import { isBridgeEventName } from "@serverkgg/bridge/protocol";
import { compileGlobs, matchesAny } from "@serverkgg/bridge/utils";
import { bridgePanelSchema, bridgeSetupManifestSchema, bridgeTerminalManifestSchema } from "@serverkgg/bridge/wire";
import { driver } from "./driver";
import {
	BEACON_PORT,
	DEDICATED_SERVER_FILE,
	GAME_INI_FILE,
	GAME_PORT,
	GAME_ROOTS,
	MOD_UPLOAD_STAGING,
	MODS_DIRECTORY,
	PLAYER_ID_PATTERN,
	PlatformPolicy,
	SAVE_GAMES_DIRECTORY,
	SAVED_DIRECTORY,
	SERVER_READY,
	SERVER_SETTLED,
	STEAM_APP_ID,
	WORLD_NAME_MAX,
	WORLD_NAME_PATTERN,
	WORLD_UPLOAD_STAGING,
} from "./shared";
import { CONFIG_FILES, CONFIG_REFUSED_FIXTURE, memoryContext, READY_FIXTURE, STARTUP_MAP_FIXTURE } from "./testing";

interface Manifest {
	steam: {
		appId: number;
	};
	container: {
		ports: {
			key: string;
			containerPort: number;
			protocol: string;
			mirror?: boolean;
			join?: string;
			follows?: unknown;
			activeWhen?: unknown;
			hostRange: {
				default: number;
				min: number;
				max: number;
			};
		}[];
		runtime: {
			platform: string;
		};
	};
	files: {
		protected: string[];
	};
	backup: {
		only: string[];
		except: string[];
	};
	reset: {
		keep: string[];
	};
	presence: {
		name: string;
		id: string;
		fields: {
			key: string;
		}[];
	};
}

const VALIDATE_TIMEOUT_MS = 120_000;

const PLATFORM_TAB_IDS = [
	"overview",
	"console",
	"files",
	"backups",
	"schedules",
	"analytics",
	"feed",
	"access",
	"integrations",
	"needs",
	"setup",
	"change-game",
];

const manifest = Bun.YAML.parse(await Bun.file(new URL("../serverk.yml", import.meta.url)).text()) as Manifest;

const modules = driver.modules ?? {};

const tabs = driver.panel?.tabs ?? [];

const sections = tabs.flatMap((tab) => tab.sections);

const steps = driver.setup?.steps ?? [];

const formSection = (tabId: string, sectionId: string) => {
	const section = tabs.find((tab) => tab.id === tabId)?.sections.find((entry) => entry.id === sectionId);

	return section?.layout === BridgeLayout.Form ? section : null;
};

const fieldOf = (tabId: string, sectionId: string, key: string) => {
	return formSection(tabId, sectionId)?.fields.find((field) => field.key === key);
};

type PanelModule = NonNullable<BridgeDriver["modules"]>[string];

const protectedActionsOf = (module: PanelModule) => {
	return "protectedActions" in module ? (module.protectedActions ?? []) : [];
};

describe("assembling the dragonwilds driver", () => {
	it(
		"passes the same validation the platform runs at boot",
		async () => {
			const validate = Bun.spawn(
				[
					"bunx",
					"serverk-bridge",
					"validate",
				],
				{
					cwd: new URL("..", import.meta.url).pathname,
					stderr: "pipe",
					stdout: "pipe",
				},
			);
			const output = `${await new Response(validate.stdout).text()}${await new Response(validate.stderr).text()}`;

			expect(await validate.exited).toBe(0);
			expect(output).toContain("dragonwilds is valid");
		},
		VALIDATE_TIMEOUT_MS,
	);

	it("fills the slots a game without a console channel uses, in order, and no announce or pending", () => {
		expect(Object.keys(driver)).toEqual([
			"install",
			"lifecycle",
			"events",
			"query",
			"backup",
			"setup",
			"terminal",
			"panel",
			"modules",
		]);
		expect(driver.announce).toBeUndefined();
		expect(driver.pending).toBeUndefined();
	});

	it("registers the settings, the cards, the world modules, the mods, the roster and the admins", () => {
		expect(Object.keys(modules)).toEqual([
			"settings",
			"access",
			"metrics",
			"worlds",
			"worldActions",
			"mods",
			"players",
			"admins",
		]);
		expect(modules.settings?.kind).toBe(BridgeKind.Settings);
		expect(modules.access?.kind).toBe(BridgeKind.Detail);
		expect(modules.metrics?.kind).toBe(BridgeKind.Detail);
		expect(modules.worlds?.kind).toBe(BridgeKind.Collection);
		expect(modules.worldActions?.kind).toBe(BridgeKind.Actions);
		expect(modules.mods?.kind).toBe(BridgeKind.Collection);
		expect(modules.players?.kind).toBe(BridgeKind.Collection);
		expect(modules.admins?.kind).toBe(BridgeKind.Collection);
	});

	it("builds a panel, a terminal and a setup the agent's wire schemas accept", () => {
		const panel = bridgePanelSchema.safeParse(driver.panel);
		const setup = bridgeSetupManifestSchema.safeParse({
			steps,
		});
		const terminal = bridgeTerminalManifestSchema.safeParse({
			commands: driver.terminal?.commands ?? [],
			rules: (driver.terminal?.rules ?? []).map((rule) => {
				return {
					flags: rule.match.flags,
					level: rule.level,
					match: rule.match.source,
				};
			}),
		});

		expect(panel.success ? null : panel.error.issues).toBeNull();
		expect(setup.success ? null : setup.error.issues).toBeNull();
		expect(terminal.success ? null : terminal.error.issues).toBeNull();
	});

	it("names an exported module in every section", () => {
		for (const section of sections) {
			expect(Object.keys(modules)).toContain(section.module ?? "");
		}
	});

	it("takes the name of no platform sidebar entry", () => {
		expect(tabs.map((tab) => tab.id)).toEqual([
			"settings",
			"connect",
			"world",
			"mods",
			"players",
		]);

		for (const tab of tabs) {
			expect(PLATFORM_TAB_IDS).not.toContain(tab.id);
		}
	});

	it("places every section of the players tab on the players page", () => {
		const players = tabs.find((tab) => tab.id === "players");

		expect(players?.sections.map((section) => section.id)).toEqual([
			"online",
			"admins",
		]);

		for (const section of players?.sections ?? []) {
			expect("place" in section ? section.place : undefined).toBe(BridgePlace.Players);
		}
	});
});

describe("guarding the world delete nothing else brings back", () => {
	it("protects deleting a world, and nothing else", () => {
		const declared = Object.fromEntries(
			Object.entries(modules).flatMap(([id, module]) => {
				const actions = protectedActionsOf(module);

				return actions.length > 0
					? [
							[
								id,
								actions,
							],
						]
					: [];
			}),
		);

		expect(declared).toEqual({
			worlds: [
				"delete",
			],
		});
	});

	it("tells the player before every protected action that no backup is taken and to take one first", () => {
		const warned: string[] = [];

		for (const section of sections) {
			const module = "module" in section && section.module !== undefined ? modules[section.module] : undefined;
			const guarded = module === undefined ? [] : protectedActionsOf(module);

			for (const action of "actions" in section ? (section.actions ?? []) : []) {
				if (!guarded.includes(action.id)) {
					continue;
				}

				expect(action.confirmText?.ar, action.id).toContain("لا نأخذ نسخة احتياطية");
				expect(action.confirmText?.ar, action.id).toContain("خذ نسخة احتياطية أولًا");
				expect(action.confirmText?.en, action.id).toContain("don't take a backup");
				expect(action.confirmText?.en, action.id).toMatch(/take (a backup|one) first/i);
				warned.push(action.id);
			}
		}

		expect(warned).toEqual([
			"delete",
		]);
	});

	it("protects only mutations the module declares, on modules that work while the game is stopped", () => {
		for (const [id, module] of Object.entries(modules)) {
			const actions = protectedActionsOf(module);

			if (actions.length === 0) {
				continue;
			}

			expect("requiresRunning" in module && module.requiresRunning === true, `${id} requires running`).toBe(false);

			const declaredActions =
				module.kind === BridgeKind.Collection || module.kind === BridgeKind.Actions
					? Object.keys(module.actions ?? {})
					: [];

			for (const action of actions) {
				expect(declaredActions, `${id} does not declare ${action}`).toContain(action);
			}

			expect("unavailable" in module ? typeof module.unavailable : undefined, id).toBe("function");
		}
	});

	it("serves every download from the row's path, never from a handler", () => {
		for (const section of sections) {
			if (section.layout !== BridgeLayout.Table) {
				continue;
			}

			const module = modules[section.module];

			for (const action of section.actions ?? []) {
				if (action.download !== true) {
					continue;
				}

				expect(module?.kind === BridgeKind.Collection ? Object.keys(module.actions ?? {}) : []).not.toContain(
					action.id,
				);
			}
		}

		const worldsTable = tabs.find((tab) => tab.id === "world")?.sections.find((section) => section.id === "worlds");

		expect(
			worldsTable?.layout === BridgeLayout.Table && worldsTable.actions?.some((action) => action.download === true),
		).toBe(true);
	});

	it("uploads worlds and mods as files into staging folders the manifest leaves unprotected", () => {
		const uploadOf = (tabId: string, sectionId: string) => {
			const table = tabs.find((tab) => tab.id === tabId)?.sections.find((section) => section.id === sectionId);

			return table?.layout === BridgeLayout.Table ? table.upload : undefined;
		};

		const protectedGlobs = compileGlobs(manifest.files.protected);

		expect(uploadOf("world", "worlds")).toMatchObject({
			extensions: [
				"sav",
			],
			mode: BridgeUploadMode.File,
			staging: WORLD_UPLOAD_STAGING,
		});
		expect(uploadOf("mods", "mods")).toMatchObject({
			extensions: [
				"zip",
				"pak",
			],
			mode: BridgeUploadMode.File,
			staging: MOD_UPLOAD_STAGING,
		});
		expect(matchesAny(`${WORLD_UPLOAD_STAGING}/upload/Ashen.sav`, protectedGlobs)).toBe(false);
		expect(matchesAny(`${MOD_UPLOAD_STAGING}/upload/Mod.zip`, protectedGlobs)).toBe(false);
	});

	it("confirms deleting a world with the checkbox, and every other world and mod action once", () => {
		const confirmOf = (tabId: string, sectionId: string, actionId: string) => {
			const section = tabs.find((tab) => tab.id === tabId)?.sections.find((entry) => entry.id === sectionId);

			return section && "actions" in section
				? section.actions?.find((action) => action.id === actionId)?.confirm
				: undefined;
		};

		expect(confirmOf("world", "worlds", "delete")).toBe(BridgeConfirm.Strong);
		expect(confirmOf("world", "worlds", "activate")).toBe(BridgeConfirm.Normal);
		expect(confirmOf("world", "worlds", "download")).toBeUndefined();
		expect(confirmOf("world", "new-world", "create")).toBe(BridgeConfirm.Normal);
		expect(confirmOf("mods", "mods", "disable")).toBe(BridgeConfirm.Normal);
		expect(confirmOf("mods", "mods", "enable")).toBe(BridgeConfirm.Normal);
		expect(confirmOf("mods", "mods", "remove")).toBe(BridgeConfirm.Normal);
	});

	it("asks for a restart after every world and mod change, because the game reads them at start", () => {
		for (const [tabId, sectionId] of [
			[
				"world",
				"worlds",
			],
			[
				"mods",
				"mods",
			],
		]) {
			const section = tabs.find((tab) => tab.id === tabId)?.sections.find((entry) => entry.id === sectionId);

			expect(section?.layout === BridgeLayout.Table && section.restartHint).toBe(true);
		}
	});

	it("checks a new world's name and the settings world name with the driver's one pattern, cap and text", () => {
		const create = tabs.find((tab) => tab.id === "world")?.sections.find((section) => section.id === "new-world");
		const field =
			create?.layout === BridgeLayout.Actions
				? create.actions.find((action) => action.id === "create")?.fields?.at(0)
				: undefined;

		const setting = fieldOf("settings", "server", "DefaultWorldName");

		expect(field?.pattern).toBe(WORLD_NAME_PATTERN.source);
		expect(field?.maxLength).toBe(WORLD_NAME_MAX);
		expect(setting?.pattern).toBe(WORLD_NAME_PATTERN.source);
		expect(setting?.maxLength).toBe(WORLD_NAME_MAX);
		expect(field?.patternHint).toEqual(setting?.patternHint);
		expect(WORLD_NAME_MAX).toBe(16);
	});

	it("labels the world and mod actions as the guides name them", () => {
		const labelsOf = (tabId: string, sectionId: string) => {
			const section = tabs.find((tab) => tab.id === tabId)?.sections.find((entry) => entry.id === sectionId);

			return [
				...(section && "actions" in section ? (section.actions ?? []) : []).map((action) => action.label.ar),
				...(section?.layout === BridgeLayout.Table && section.upload
					? [
							section.upload.label.ar,
						]
					: []),
			];
		};

		expect(tabs.find((tab) => tab.id === "world")?.title.ar).toBe("الماب");
		expect(tabs.find((tab) => tab.id === "mods")?.title.ar).toBe("المودات");
		expect(labelsOf("world", "worlds")).toEqual([
			"فعّل",
			"نزّل",
			"احذف",
			"ارفع ماب",
		]);
		expect(labelsOf("world", "new-world")).toEqual([
			"أنشئ مابًا جديدًا",
		]);
		expect(labelsOf("mods", "mods")).toEqual([
			"وقّف",
			"فعّل",
			"أزل",
			"ارفع مودًا",
		]);
	});
});

describe("the panel", () => {
	it("writes both settings forms through the settings module with a normal confirm and a restart hint", () => {
		for (const id of [
			"owner",
			"server",
		]) {
			const form = formSection("settings", id);

			expect(form?.target).toBe(BridgeFormTarget.Settings);
			expect(form?.module).toBe("settings");
			expect(form?.confirm).toBe(BridgeConfirm.Normal);
			expect(form?.restartHint).toBe(true);
			expect(form?.help?.ar.length).toBeGreaterThan(0);
		}
	});

	it("keeps both passwords secret and checks the owner id with the driver's own pattern", () => {
		expect(fieldOf("settings", "server", "AdminPassword")?.control).toBe(BridgeControl.Secret);
		expect(fieldOf("settings", "server", "WorldPassword")?.control).toBe(BridgeControl.Secret);
		expect(fieldOf("settings", "owner", "OwnerId")?.pattern).toBe(PLAYER_ID_PATTERN.source);
	});

	it("bounds the player count at the game's cap of six and offers the five platform policies", () => {
		expect(fieldOf("settings", "server", "MaxPlayers")).toMatchObject({
			max: 6,
			min: 1,
		});

		const options = fieldOf("settings", "server", "PlatformPolicy")?.options;

		expect(Array.isArray(options) ? options.map((option) => option.value) : []).toEqual(Object.values(PlatformPolicy));
	});

	it("adds admins by player id and removes them with one confirm", () => {
		const table = tabs.find((tab) => tab.id === "players")?.sections.find((section) => section.id === "admins");

		expect(table?.layout).toBe(BridgeLayout.Table);
		expect(table?.layout === BridgeLayout.Table ? table.add?.placeholder : null).toMatch(PLAYER_ID_PATTERN);
		expect(table?.layout === BridgeLayout.Table ? table.actions?.map((action) => action.confirm) : null).toEqual([
			BridgeConfirm.Normal,
		]);
	});
});

describe("the cards", () => {
	it("places the access card on the overview linked to the connect tab, and keeps a copy in the tab", () => {
		const cards = sections.filter((section) => section.module === "access");
		const placed = cards.find((section) => "place" in section && section.place === BridgePlace.Overview);
		const inTab = cards.find((section) => !("place" in section) || section.place === undefined);

		expect(placed?.layout === BridgeLayout.Detail && placed.related?.tab).toBe("connect");
		expect(inTab?.layout).toBe(BridgeLayout.Detail);
	});

	it("shows the join code and the world password as secret stats", async () => {
		const access = modules.access;
		const { context, files } = memoryContext({
			files: {
				...CONFIG_FILES,
			},
		});

		files.set(
			DEDICATED_SERVER_FILE,
			`${files.get(DEDICATED_SERVER_FILE) ?? ""}`.replace("WorldPassword=", "WorldPassword=Sails"),
		);

		const detail = access?.kind === BridgeKind.Detail ? await access.read(context) : null;

		expect(detail?.stats.find((stat) => stat.key === "joinCode")?.format).toBe(BridgeDetailFormat.Secret);
		expect(detail?.stats.find((stat) => stat.key === "worldPassword")?.format).toBe(BridgeDetailFormat.Secret);
	});

	it("places the metrics on the overview", () => {
		const metrics = sections.find((section) => section.module === "metrics");

		expect(metrics?.layout).toBe(BridgeLayout.Detail);
		expect(metrics && "place" in metrics ? metrics.place : null).toBe(BridgePlace.Overview);
	});
});

describe("walking the customer through the first run", () => {
	it("sets the owner, proves it, names the server and its world, picks the platforms, then points at the join card", () => {
		expect(steps.map((step) => step.id)).toEqual([
			"owner",
			"verify",
			"name",
			"crossplay",
			"invite",
		]);
	});

	it("requires the owner and its proof, and nothing else", () => {
		expect(steps.filter((step) => step.required === true).map((step) => step.id)).toEqual([
			"owner",
			"verify",
		]);
		expect(steps.find((step) => step.id === "verify")?.kind).toBe(BridgeSetupStepKind.Driver);
	});

	it("points every form step at a form and fields the panel declares", () => {
		for (const step of steps) {
			if (step.kind !== BridgeSetupStepKind.Form) {
				continue;
			}

			const section = formSection(step.tab, step.section);

			expect(section, step.id).not.toBeNull();
			expect((step.fields ?? []).length, step.id).toBeGreaterThan(0);

			for (const key of step.fields ?? []) {
				expect((section?.fields ?? []).map((field) => field.key)).toContain(key);
			}
		}

		expect(steps.find((step) => step.id === "owner")).toMatchObject({
			fields: [
				"OwnerId",
			],
			section: "owner",
			tab: "settings",
		});
	});

	it("opens the overview for the invite, where the join card lives", () => {
		const invite = steps.find((step) => step.id === "invite");

		expect(invite?.kind === BridgeSetupStepKind.Open && invite.target.tab).toBe(GuideOpenTab.Overview);
	});
});

describe("declaring the events the platform acts on", () => {
	it("names only events the platform's taxonomy knows", () => {
		for (const name of [
			...(driver.events?.patterns ?? []).map((pattern) => pattern.emit),
			...(driver.events?.emits ?? []),
		]) {
			expect(isBridgeEventName(name)).toBe(true);
		}
	});

	it("matches started, crashed, out of memory and port bind failed from the log", () => {
		expect((driver.events?.patterns ?? []).map((pattern) => pattern.emit)).toEqual([
			"ServerStarted",
			"ServerCrashed",
			"OutOfMemory",
			"PortBindFailed",
		]);
	});

	it("raises join and leave from the roster sync", () => {
		expect(driver.events?.emits).toContain("PlayerJoined");
		expect(driver.events?.emits).toContain("PlayerLeft");
	});

	it("lists every world and mod event the panel raises", () => {
		for (const name of [
			"WorldActivated",
			"WorldCreated",
			"WorldDeleted",
			"WorldImported",
			"ModInstalled",
			"ModRemoved",
			"ModEnabled",
			"ModDisabled",
		]) {
			expect(driver.events?.emits).toContain(name);
		}
	});

	it("calls the server ready on the world map, settles on a refused config, and never on the startup map", () => {
		expect(driver.lifecycle.ready?.source).toBe(SERVER_SETTLED.source);
		expect(driver.lifecycle.ready?.test(READY_FIXTURE)).toBe(true);
		expect(driver.lifecycle.ready?.test(CONFIG_REFUSED_FIXTURE)).toBe(true);
		expect(driver.lifecycle.ready?.test(STARTUP_MAP_FIXTURE)).toBe(false);
		expect(driver.events?.patterns.find((pattern) => pattern.emit === "ServerStarted")?.match.source).toBe(
			SERVER_READY.source,
		);
	});

	it("stops with sigterm inside the platform's deadline", () => {
		expect(driver.lifecycle.stopSignal).toBe(BridgeStopSignal.Term);
		expect(driver.lifecycle.stopTimeoutSeconds).toBeLessThanOrEqual(180);
	});
});

describe("the manifest", () => {
	it("installs the dedicated server app natively on linux", () => {
		expect(manifest.steam.appId).toBe(Number(STEAM_APP_ID));
		expect(manifest.steam.appId).toBe(4_019_830);
		expect(manifest.container.runtime.platform).toBe("linux");
	});

	it("declares the two mirrored udp ports on independent ranges, and nothing derived", () => {
		expect(manifest.container.ports).toHaveLength(2);
		expect(manifest.container.ports.find((port) => port.key === GAME_PORT)).toMatchObject({
			containerPort: 7777,
			hostRange: {
				default: 26_000,
				max: 26_099,
				min: 26_000,
			},
			join: "combined",
			mirror: true,
			protocol: "udp",
		});
		expect(manifest.container.ports.find((port) => port.key === BEACON_PORT)).toMatchObject({
			containerPort: 8888,
			hostRange: {
				default: 26_100,
				max: 26_199,
				min: 26_100,
			},
			join: "separate",
			mirror: true,
			protocol: "udp",
		});

		for (const port of manifest.container.ports) {
			expect(port.follows).toBeUndefined();
			expect(port.activeWhen).toBeUndefined();
		}
	});

	it("keeps the game roots through a reset and never the saves, the config or the mods", () => {
		const keep = compileGlobs(manifest.reset.keep);

		for (const root of GAME_ROOTS) {
			expect(matchesAny(root, keep)).toBe(true);
		}

		expect(matchesAny("RSDragonwilds/Content/Paks/RSDragonwilds-LinuxServer.pak", keep)).toBe(true);
		expect(matchesAny(SAVED_DIRECTORY, keep)).toBe(false);
		expect(matchesAny(`${SAVE_GAMES_DIRECTORY}/Ashen.sav`, keep)).toBe(false);
		expect(matchesAny(DEDICATED_SERVER_FILE, keep)).toBe(false);
		expect(matchesAny(GAME_INI_FILE, keep)).toBe(false);
		expect(matchesAny(MODS_DIRECTORY, keep)).toBe(false);
		expect(matchesAny(`${MODS_DIRECTORY}/RSDragonwilds-Mod.pak`, keep)).toBe(false);
	});

	it("protects only the driver's own .serverk paths", () => {
		for (const path of manifest.files.protected) {
			expect(path.startsWith(".serverk")).toBe(true);
		}
	});

	it("archives the worlds, the config, the mods and the stamp, and skips logs and crash dumps", () => {
		expect(manifest.backup.only).toEqual([
			"RSDragonwilds/Saved/SaveGames/**",
			"RSDragonwilds/Saved/Config/LinuxServer/*.ini",
			"RSDragonwilds/Content/Paks/~mods/**",
			".serverk-install.json",
		]);

		const only = compileGlobs(manifest.backup.only);

		for (const path of [
			`${SAVE_GAMES_DIRECTORY}/Ashen.sav`,
			DEDICATED_SERVER_FILE,
			GAME_INI_FILE,
			`${MODS_DIRECTORY}/Mod.pak`,
			".serverk-install.json",
		]) {
			expect(matchesAny(path, only)).toBe(true);
		}

		expect(matchesAny("RSDragonwilds/Binaries/Linux/RSDragonwildsServer-Linux-Shipping", only)).toBe(false);
		expect(manifest.backup.except).toEqual([
			"RSDragonwilds/Saved/Logs/**",
			"RSDragonwilds/Saved/Crashes/**",
		]);
	});

	it("names the presence keys the roster sends", () => {
		expect(manifest.presence.name).toBe("player");
		expect(manifest.presence.id).toBe("playerId");
		expect(manifest.presence.fields.map((field) => field.key)).toEqual([
			"playerId",
		]);
	});
});
