import { type Bridge, BridgeKind, BridgeTerminalLevel } from "@serverkgg/bridge";
import { consoleHandler } from "./consoleHandler";

const commands: Bridge.TerminalCommand[] = [
	{
		name: "status",
		summary: {
			ar: "حالة سيرفرك: البيلد، واللاعبون، ومدة التشغيل، والماب المفعّل، والمنصات، ومالك السيرفر.",
			en: "Your server's state: build, players, uptime, the active world, platforms and the owner.",
		},
	},
	{
		name: "players",
		summary: {
			ar: "اللاعبون المتصلون الآن بمعرّفاتهم.",
			en: "The players who are on right now, with their player IDs.",
		},
	},
	{
		name: "access",
		summary: {
			ar: "اسم الماب الذي يبحث عنه أصحابك، وعنوان الاتصال المباشر.",
			en: "The world name your friends search for, and the direct connection address.",
		},
	},
	{
		name: "help",
		summary: {
			ar: "الأوامر التي ننفّذها من هنا.",
			en: "The commands we answer from here.",
		},
	},
];

const rules: Bridge.TerminalRule[] = [
	{
		level: BridgeTerminalLevel.Error,
		match:
			/Fatal error|=== Critical error|Ran out of memory allocating|: Error: |cannot continue due to DedicatedServer\.ini|The \[OwnerId\] for this server is empty|The \[PlatformPolicy\] value .* is invalid/,
	},
	{
		level: BridgeTerminalLevel.Warn,
		match: /: Warning: /,
	},
	{
		level: BridgeTerminalLevel.Info,
		match:
			/Bringing World \/Game\/Maps\/World\/|Loading configured world|No save found for configured world|LogNet: Login request:|LogNet: Join succeeded:/,
	},
];

export const terminal: Bridge.Terminal = {
	kind: BridgeKind.Terminal,
	commands,
	rules,
	run: consoleHandler,
};
