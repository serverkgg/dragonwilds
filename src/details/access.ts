import { type Bridge, BridgeDetailFormat, BridgeDetailTone, BridgeKind } from "@serverkgg/bridge";
import {
	directAddressOf,
	PLATFORM_POLICY_KEY,
	PlatformPolicy,
	platformPolicyOf,
	readConfig,
	readJoinCode,
	storedConfig,
	textOf,
	WORLD_NAME_KEY,
	WORLD_PASSWORD_KEY,
} from "../shared";

const DETAIL_ID = "access";

export const ACCESS_REFRESH_SECONDS = 30;

const MISSING = "—";

export const PLATFORM_LABELS: Record<PlatformPolicy, Bridge.Text> = {
	[PlatformPolicy.Crossplay]: {
		ar: "كل المنصات (كروس بلاي)",
		en: "All platforms (crossplay)",
	},
	[PlatformPolicy.Pc]: {
		ar: "PC فقط",
		en: "PC only",
	},
	[PlatformPolicy.PlayStation]: {
		ar: "PlayStation فقط",
		en: "PlayStation only",
	},
	[PlatformPolicy.Xbox]: {
		ar: "Xbox فقط",
		en: "Xbox only",
	},
	[PlatformPolicy.Nintendo]: {
		ar: "Nintendo فقط",
		en: "Nintendo only",
	},
};

export const WORLD_NAME_PENDING: Bridge.DetailBadge = {
	label: {
		ar: "اسم الماب الجديد يُطبَّق بعد الريستارت",
		en: "The new world name applies after a restart",
	},
	tone: BridgeDetailTone.Warning,
};

export const JOIN_CODE_WAITING: Bridge.DetailBadge = {
	label: {
		ar: "يظهر كود الانضمام بعد تشغيل سيرفرك",
		en: "The join code shows once your server starts",
	},
	tone: BridgeDetailTone.Warning,
};

const platformLabelOf = (value: Bridge.Value | undefined): Bridge.Text => {
	return PLATFORM_LABELS[platformPolicyOf(value) as PlatformPolicy];
};

export const accessBadges = (worldPending: boolean, code: string | null): Bridge.DetailBadge[] => {
	return [
		...(worldPending
			? [
					WORLD_NAME_PENDING,
				]
			: []),
		...(code === null
			? [
					JOIN_CODE_WAITING,
				]
			: []),
	];
};

export const access: Bridge.Detail = {
	kind: BridgeKind.Detail,
	refreshSeconds: ACCESS_REFRESH_SECONDS,
	async read(context) {
		const stored = await storedConfig(context);
		const loaded = textOf(await readConfig(context), WORLD_NAME_KEY);
		const worldName = textOf(stored, WORLD_NAME_KEY);
		const password = textOf(stored, WORLD_PASSWORD_KEY);
		const code = context.server.running ? await readJoinCode(context) : null;

		return {
			actions: [],
			badges: accessBadges(worldName !== loaded, code),
			description: {
				ar: "يجد أصحابك سيرفرك داخل اللعبة من Worlds ثم Public بالبحث عن اسم الماب، أو يدخلون بكود الانضمام أو بالعنوان المباشر. يتغيّر كود الانضمام في كل تشغيل.",
				en: "Your friends find your server in the game under Worlds, then Public, by searching for the world name, or join with the join code or the direct address. The join code changes at every start.",
			},
			id: DETAIL_ID,
			image: null,
			links: [],
			stale: false,
			stats: [
				{
					format: BridgeDetailFormat.Text,
					key: "worldName",
					label: {
						ar: "اسم الماب",
						en: "World name",
					},
					value: worldName.length === 0 ? MISSING : worldName,
				},
				{
					format: BridgeDetailFormat.Secret,
					key: "joinCode",
					label: {
						ar: "كود الانضمام",
						en: "Join code",
					},
					value: code ?? "",
				},
				...(password.length === 0
					? []
					: [
							{
								format: BridgeDetailFormat.Secret,
								key: "worldPassword",
								label: {
									ar: "كلمة مرور الماب",
									en: "World password",
								},
								value: password,
							},
						]),
				{
					format: BridgeDetailFormat.Text,
					key: "address",
					label: {
						ar: "العنوان المباشر",
						en: "Direct address",
					},
					value: directAddressOf(context) ?? MISSING,
				},
				{
					format: BridgeDetailFormat.Text,
					key: "platforms",
					label: {
						ar: "المنصات",
						en: "Platforms",
					},
					value: platformLabelOf(stored[PLATFORM_POLICY_KEY]),
				},
			],
			subtitle: {
				ar: "اسم الماب وكود الانضمام والعنوان",
				en: "World name, join code and address",
			},
			title: {
				ar: "طرق الدخول",
				en: "How to join",
			},
		};
	},
};
