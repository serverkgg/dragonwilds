import { type Bridge, BridgeDetailFormat, BridgeKind } from "@serverkgg/bridge";
import { formatUptime } from "@serverkgg/bridge/utils";
import { maxPlayersOf, readDragonwildsStamp, readLoadedWorldName, metrics as sampler, storedConfig } from "../shared";

const DETAIL_ID = "metrics";

export const METRICS_REFRESH_SECONDS = 15;

const MISSING = "—";

export const metrics: Bridge.Detail = {
	kind: BridgeKind.Detail,
	refreshSeconds: METRICS_REFRESH_SECONDS,
	async read(context) {
		const stamp = await readDragonwildsStamp(context);
		const snapshot = sampler.snapshot();
		const world = await readLoadedWorldName(context);
		const max = maxPlayersOf(await storedConfig(context));

		return {
			actions: [],
			badges: [],
			description: null,
			id: DETAIL_ID,
			image: null,
			links: [],
			stale: !context.server.running,
			stats: [
				{
					format: BridgeDetailFormat.Text,
					key: "players",
					label: {
						ar: "اللاعبون",
						en: "Players",
					},
					value: snapshot.players === null ? MISSING : `${snapshot.players}/${max}`,
				},
				{
					format: BridgeDetailFormat.Text,
					key: "world",
					label: {
						ar: "الماب المفعّل",
						en: "Active world",
					},
					value: world.length === 0 ? MISSING : world,
				},
				{
					format: BridgeDetailFormat.Text,
					key: "build",
					label: {
						ar: "بيلد اللعبة",
						en: "Game build",
					},
					value: stamp.buildId ?? MISSING,
				},
				{
					format: BridgeDetailFormat.Text,
					key: "uptime",
					label: {
						ar: "مدة التشغيل",
						en: "Up for",
					},
					value: snapshot.uptimeSeconds === null ? MISSING : formatUptime(snapshot.uptimeSeconds),
				},
			],
			subtitle: {
				ar: "هذه الأرقام صادرة من سيرفرك مباشرة، وليست تقديرًا.",
				en: "These numbers come straight from your own server, not an estimate.",
			},
			title: {
				ar: "حالة السيرفر",
				en: "Server health",
			},
		};
	},
};
