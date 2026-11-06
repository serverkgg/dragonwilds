import {
	type Bridge,
	BridgeConfirm,
	BridgeControl,
	BridgeFormTarget,
	BridgeIcon,
	BridgeLayout,
	BridgePlace,
	BridgeUploadMode,
} from "@serverkgg/bridge";
import { REMOVE_ACTION } from "../collections";
import { ACCESS_REFRESH_SECONDS, METRICS_REFRESH_SECONDS, PLATFORM_LABELS } from "../details";
import { DISABLE_ACTION, ENABLE_ACTION, REMOVE_MOD_ACTION } from "../mods";
import {
	ADMIN_PASSWORD_KEY,
	CRASH_DUMPS_KEY,
	MAX_PLAYERS_KEY,
	MAX_PLAYERS_MAX,
	MAX_PLAYERS_MIN,
	MOD_UPLOAD_EXTENSIONS,
	MOD_UPLOAD_STAGING,
	OWNER_ID_KEY,
	PASSWORD_MAX,
	PLATFORM_POLICY_KEY,
	PLAYER_ID_INVALID,
	PLAYER_ID_PATTERN,
	PlatformPolicy,
	SERVER_NAME_KEY,
	SERVER_NAME_MAX,
	WORLD_NAME_INVALID,
	WORLD_NAME_KEY,
	WORLD_NAME_MAX,
	WORLD_NAME_PATTERN,
	WORLD_PASSWORD_KEY,
	WORLD_UPLOAD_EXTENSION,
	WORLD_UPLOAD_STAGING,
} from "../shared";
import { ACTIVATE_ACTION, CREATE_ACTION, DELETE_ACTION, NEW_WORLD_NAME_ARGUMENT } from "../worlds";

export const SETTINGS_TAB_ID = "settings";

export const OWNER_SECTION_ID = "owner";

export const SERVER_SECTION_ID = "server";

export const CONNECT_TAB_ID = "connect";

export const WORLD_TAB_ID = "world";

export const MODS_TAB_ID = "mods";

export const PLAYERS_TAB_ID = "players";

const DOWNLOAD_ACTION = "download";

export const PLAYER_ID_PLACEHOLDER = "0002a1b3c4d5e6f708192a3b4c5d6e7f";

const settingsTitle: Bridge.Text = {
	ar: "الإعدادات",
	en: "Settings",
};

const playerIdLabel: Bridge.Text = {
	ar: "معرّف اللاعب",
	en: "Player ID",
};

export const PLATFORM_OPTIONS: Bridge.Option[] = Object.values(PlatformPolicy).map((policy) => {
	return {
		label: PLATFORM_LABELS[policy],
		value: policy,
	};
});

export const OWNER_FIELDS: Bridge.Field[] = [
	{
		control: BridgeControl.Text,
		help: {
			ar: "معرّف اللاعب الخاص بمالك السيرفر، ويطلبه دراقونوايلدز ليعمل السيرفر. انسخه من اللعبة كما هو.",
			en: "The player ID of the server's owner, which Dragonwilds needs to run the server. Copy it from the game as it is.",
		},
		key: OWNER_ID_KEY,
		label: {
			ar: "معرّف اللاعب للمالك",
			en: "Owner's player ID",
		},
		pattern: PLAYER_ID_PATTERN.source,
		patternHint: PLAYER_ID_INVALID,
		placeholder: PLAYER_ID_PLACEHOLDER,
	},
];

export const SERVER_FIELDS: Bridge.Field[] = [
	{
		control: BridgeControl.Text,
		help: {
			ar: "الاسم الذي يظهر به سيرفرك للاعبين.",
			en: "The name your server shows to players.",
		},
		key: SERVER_NAME_KEY,
		label: {
			ar: "اسم السيرفر",
			en: "Server name",
		},
		maxLength: SERVER_NAME_MAX,
	},
	{
		control: BridgeControl.Text,
		help: {
			ar: "يبحث عنه أصحابك في قائمة Worlds داخل اللعبة، والأحرف الكبيرة والصغيرة فيه مختلفة. وفي التشغيل القادم يحمّل السيرفر الماب المحفوظ بهذا الاسم، أو ينشئ مابًا جديدًا به.",
			en: "Your friends search for it in the game's Worlds list, and capital and small letters in it are different. At the next start the server loads the world saved under this name, or creates a new one with it.",
		},
		key: WORLD_NAME_KEY,
		label: {
			ar: "اسم الماب",
			en: "World name",
		},
		maxLength: WORLD_NAME_MAX,
		pattern: WORLD_NAME_PATTERN.source,
		patternHint: WORLD_NAME_INVALID,
	},
	{
		control: BridgeControl.Secret,
		help: {
			ar: "اختيارية. إذا كتبتها يطلبها دراقونوايلدز من كل لاعب عند الدخول، وإذا تركتها فارغة يدخل كل من يجد سيرفرك.",
			en: "Optional. If you set one, Dragonwilds asks every player for it when they join. Leave it empty and anyone who finds your server can join.",
		},
		key: WORLD_PASSWORD_KEY,
		label: {
			ar: "كلمة مرور الماب",
			en: "World password",
		},
		maxLength: PASSWORD_MAX,
	},
	{
		control: BridgeControl.Secret,
		help: {
			ar: "يكتبها اللاعب داخل اللعبة ليصبح أدمن. ولّدناها لك عند التثبيت، فشاركها فقط مع من تثق به.",
			en: "A player types it in the game to become an admin. We generated it at install, so share it only with people you trust.",
		},
		key: ADMIN_PASSWORD_KEY,
		label: {
			ar: "كلمة مرور الأدمن",
			en: "Admin password",
		},
		maxLength: PASSWORD_MAX,
	},
	{
		control: BridgeControl.Select,
		help: {
			ar: "الكروس بلاي يسمح بدخول اللاعبين من كل المنصات، واختيار منصة واحدة يسمح بدخول لاعبيها فقط.",
			en: "Crossplay lets players on every platform join. Pick one platform to let only its players join.",
		},
		key: PLATFORM_POLICY_KEY,
		label: {
			ar: "المنصات",
			en: "Platforms",
		},
		options: PLATFORM_OPTIONS,
	},
	{
		control: BridgeControl.Number,
		help: {
			ar: `يسمح دراقونوايلدز بـ ${MAX_PLAYERS_MAX} لاعبين كحد أقصى، ويحتاج كل لاعب إضافي إلى رام أكثر.`,
			en: `Dragonwilds allows up to ${MAX_PLAYERS_MAX} players, and every extra player needs more RAM.`,
		},
		key: MAX_PLAYERS_KEY,
		label: {
			ar: "عدد اللاعبين",
			en: "Max players",
		},
		max: MAX_PLAYERS_MAX,
		min: MAX_PLAYERS_MIN,
	},
	{
		control: BridgeControl.Boolean,
		help: {
			ar: "يرسل دراقونوايلدز تقريرًا إلى مطوّريه عندما يتعطّل السيرفر.",
			en: "Dragonwilds sends a report to its developers when the server crashes.",
		},
		key: CRASH_DUMPS_KEY,
		label: {
			ar: "إرسال تقارير التعطّل",
			en: "Send crash reports",
		},
	},
];

const settingsTab: Bridge.Tab = {
	icon: BridgeIcon.Settings,
	id: SETTINGS_TAB_ID,
	sections: [
		{
			confirm: BridgeConfirm.Normal,
			fields: OWNER_FIELDS,
			help: {
				ar: "يطرد المالك ويحظر أي لاعب داخل اللعبة، متصلًا كان أو غير متصل.",
				en: "The owner can kick and ban any player in the game, online or not.",
			},
			id: OWNER_SECTION_ID,
			layout: BridgeLayout.Form,
			module: "settings",
			restartHint: true,
			target: BridgeFormTarget.Settings,
			title: {
				ar: "مالك السيرفر",
				en: "Server owner",
			},
		},
		{
			confirm: BridgeConfirm.Normal,
			fields: SERVER_FIELDS,
			help: {
				ar: "نكتب هذه الإعدادات في ملف السيرفر قبل التشغيل القادم، لأن دراقونوايلدز يعيد كتابة ملفه بنفسه.",
				en: "We write these into the server's file before the next start, because Dragonwilds rewrites its file itself.",
			},
			id: SERVER_SECTION_ID,
			layout: BridgeLayout.Form,
			module: "settings",
			restartHint: true,
			target: BridgeFormTarget.Settings,
			title: {
				ar: "السيرفر",
				en: "Server",
			},
		},
		{
			help: {
				ar: `اللاعبون والماب والبيلد ومدة التشغيل في نظرة واحدة، وتتحدث كل ${METRICS_REFRESH_SECONDS} ثانية.`,
				en: `Players, world, build and uptime at a glance, refreshed every ${METRICS_REFRESH_SECONDS} seconds.`,
			},
			id: "metrics",
			layout: BridgeLayout.Detail,
			module: "metrics",
			place: BridgePlace.Overview,
			related: {
				label: settingsTitle,
				tab: SETTINGS_TAB_ID,
			},
			title: {
				ar: "حالة السيرفر",
				en: "Server health",
			},
		},
	],
	title: settingsTitle,
};

const connectTitle: Bridge.Text = {
	ar: "الاتصال",
	en: "Connect",
};

const accessTitle: Bridge.Text = {
	ar: "طرق الدخول",
	en: "How to join",
};

const connectTab: Bridge.Tab = {
	icon: BridgeIcon.Globe,
	id: CONNECT_TAB_ID,
	sections: [
		{
			help: {
				ar: "يجد أصحابك سيرفرك باسم الماب أو بكود الانضمام، ويتغيّر الكود في كل تشغيل.",
				en: "Your friends find your server by its world name or join code, and the code changes at every start.",
			},
			id: "access",
			layout: BridgeLayout.Detail,
			module: "access",
			place: BridgePlace.Overview,
			related: {
				label: connectTitle,
				tab: CONNECT_TAB_ID,
			},
			title: accessTitle,
		},
		{
			help: {
				ar: `يبحث أصحابك عن اسم الماب في Worlds ثم Public داخل اللعبة، أو يكتبون كود الانضمام أو العنوان المباشر. يتغيّر كود الانضمام في كل تشغيل، فأرسل لهم الكود الجديد بعد كل ريستارت. تتحدث البطاقة كل ${ACCESS_REFRESH_SECONDS} ثانية.`,
				en: `Your friends search for the world name under Worlds, then Public, in the game, or type the join code or the direct address. The join code changes at every start, so send them the new one after every restart. The card refreshes every ${ACCESS_REFRESH_SECONDS} seconds.`,
			},
			id: "join",
			layout: BridgeLayout.Detail,
			module: "access",
			title: accessTitle,
		},
	],
	title: connectTitle,
};

const worldNameLabel: Bridge.Text = {
	ar: "اسم الماب",
	en: "World name",
};

const worldTab: Bridge.Tab = {
	icon: BridgeIcon.Map,
	id: WORLD_TAB_ID,
	sections: [
		{
			actions: [
				{
					confirm: BridgeConfirm.Normal,
					confirmText: {
						ar: "يصبح هذا الماب هو الماب المفعّل، ويحمّله سيرفرك في التشغيل القادم. يبقى مابك الحالي في الجدول كما هو.",
						en: "This world becomes the active world, and your server loads it at the next start. Your current world stays in the table as it is.",
					},
					id: ACTIVATE_ACTION,
					label: {
						ar: "فعّل",
						en: "Activate",
					},
				},
				{
					download: true,
					id: DOWNLOAD_ACTION,
					label: {
						ar: "نزّل",
						en: "Download",
					},
				},
				{
					confirm: BridgeConfirm.Strong,
					confirmText: {
						ar: "يُحذف ملف هذا الماب نهائيًا، ولا نأخذ نسخة احتياطية قبل الحذف. خذ نسخة احتياطية أولًا إذا أردت الرجوع إليه. وإذا كان سيرفرك شغّالًا نوقفه ثم نشغّله من جديد.",
						en: "This world's file is deleted for good, and we don't take a backup first. Take a backup first if you might want it back. If your server is running, we stop it and start it again.",
					},
					id: DELETE_ACTION,
					label: {
						ar: "احذف",
						en: "Delete",
					},
				},
			],
			columns: [
				{
					key: "name",
					label: {
						ar: "الماب",
						en: "World",
					},
				},
				{
					key: "size",
					label: {
						ar: "الحجم",
						en: "Size",
					},
				},
				{
					key: "modified",
					label: {
						ar: "آخر حفظ",
						en: "Last saved",
					},
				},
				{
					key: "active",
					label: {
						ar: "الماب المفعّل",
						en: "Active world",
					},
				},
			],
			empty: {
				ar: "لا توجد مابات بعد. ينشئ دراقونوايلدز أول ماب في أول تشغيل باسم الماب في تبويب الإعدادات.",
				en: "No worlds yet. Dragonwilds creates the first one at its first start, named after the world name in the Settings tab.",
			},
			help: {
				ar: `يحمّل سيرفرك الماب الذي يطابق اسمه اسم الماب في تبويب الإعدادات، وزر فعّل يغيّره لك. اسم الملف دون ‎.sav هو اسم الماب، ولا يتجاوز ${WORLD_NAME_MAX} حرفًا. يتطلب الرفع أن يكون سيرفرك متوقفًا.`,
				en: `Your server loads the world whose name matches the world name in the Settings tab, and Activate changes it for you. A file's name without .sav is the world name, up to ${WORLD_NAME_MAX} characters. Uploading needs your server stopped.`,
			},
			id: "worlds",
			layout: BridgeLayout.Table,
			module: "worlds",
			restartHint: true,
			title: {
				ar: "المابات",
				en: "Worlds",
			},
			upload: {
				extensions: [
					WORLD_UPLOAD_EXTENSION,
				],
				label: {
					ar: "ارفع ماب",
					en: "Upload world",
				},
				mode: BridgeUploadMode.File,
				staging: WORLD_UPLOAD_STAGING,
			},
		},
		{
			actions: [
				{
					confirm: BridgeConfirm.Normal,
					confirmText: {
						ar: "في التشغيل القادم ينشئ دراقونوايلدز مابًا جديدًا من نوع Standard بهذا الاسم، ويصبح هو الماب المفعّل. يبقى مابك الحالي في الجدول لتفعّله متى أردت.",
						en: "At the next start, Dragonwilds creates a new Standard world with this name, and it becomes the active world. Your current world stays in the table for you to activate whenever you like.",
					},
					fields: [
						{
							control: BridgeControl.Text,
							help: {
								ar: "يبحث عنه أصحابك في قائمة Worlds داخل اللعبة، والأحرف الكبيرة والصغيرة فيه مختلفة.",
								en: "Your friends search for it in the game's Worlds list, and capital and small letters in it are different.",
							},
							key: NEW_WORLD_NAME_ARGUMENT,
							label: worldNameLabel,
							maxLength: WORLD_NAME_MAX,
							pattern: WORLD_NAME_PATTERN.source,
							patternHint: WORLD_NAME_INVALID,
						},
					],
					id: CREATE_ACTION,
					label: {
						ar: "أنشئ مابًا جديدًا",
						en: "Create world",
					},
				},
			],
			help: {
				ar: "ينشئ دراقونوايلدز الماب الجديد في التشغيل القادم. ولماب من نوع Custom أو Creative، أنشئه في اللعبة على الكمبيوتر ثم ارفعه.",
				en: "Dragonwilds creates the new world at the next start. For a Custom or Creative world, create it in the game on PC, then upload it.",
			},
			id: "new-world",
			layout: BridgeLayout.Actions,
			module: "worldActions",
			title: {
				ar: "ماب جديد",
				en: "New world",
			},
		},
	],
	title: {
		ar: "الماب",
		en: "World",
	},
};

const modsTab: Bridge.Tab = {
	icon: BridgeIcon.Puzzle,
	id: MODS_TAB_ID,
	sections: [
		{
			actions: [
				{
					confirm: BridgeConfirm.Normal,
					confirmText: {
						ar: "يتوقف سيرفرك عن تشغيل هذا المود من التشغيل القادم، وتبقى ملفاته لتفعّله متى أردت.",
						en: "Your server stops running this mod from the next start, and its files stay so you can enable it whenever you like.",
					},
					id: DISABLE_ACTION,
					label: {
						ar: "وقّف",
						en: "Disable",
					},
				},
				{
					confirm: BridgeConfirm.Normal,
					confirmText: {
						ar: "يشغّل سيرفرك هذا المود من التشغيل القادم. يلزم أن يملك كل لاعب المود نفسه في لعبته.",
						en: "Your server runs this mod from the next start. Every player needs the same mod in their own game.",
					},
					id: ENABLE_ACTION,
					label: {
						ar: "فعّل",
						en: "Enable",
					},
				},
				{
					confirm: BridgeConfirm.Normal,
					confirmText: {
						ar: "نحذف ملفات هذا المود من سيرفرك، ويتوقف من التشغيل القادم. ارفعه من جديد متى أردت.",
						en: "We delete this mod's files from your server, and it stops from the next start. Upload it again whenever you like.",
					},
					id: REMOVE_MOD_ACTION,
					label: {
						ar: "أزل",
						en: "Remove",
					},
				},
			],
			columns: [
				{
					key: "name",
					label: {
						ar: "المود",
						en: "Mod",
					},
				},
				{
					key: "size",
					label: {
						ar: "الحجم",
						en: "Size",
					},
				},
				{
					key: "enabled",
					label: {
						ar: "الحالة",
						en: "Status",
					},
				},
			],
			empty: {
				ar: "لا توجد مودات مثبّتة. ارفع ملف zip لمود pak كما نزّلته، أو ملف ‎.pak الخاص به.",
				en: "No mods installed. Upload a pak mod's zip as you downloaded it, or its .pak file.",
			},
			help: {
				ar: "يشغّل سيرفرك مودات pak فقط، ولا تشتغل مودات UE4SS. إذا جاء المود مع ملفات ‎.utoc و ‎.ucas فارفع ملف zip ليصل كاملًا. يلزم أن يملك كل لاعب المودات نفسها.",
				en: "Your server runs pak mods only, and UE4SS mods don't run. If a mod comes with .utoc and .ucas files, upload its zip so it arrives whole. Every player needs the same mods.",
			},
			id: "mods",
			layout: BridgeLayout.Table,
			module: "mods",
			restartHint: true,
			title: {
				ar: "المودات المثبّتة",
				en: "Installed mods",
			},
			upload: {
				extensions: MOD_UPLOAD_EXTENSIONS,
				label: {
					ar: "ارفع مودًا",
					en: "Upload a mod",
				},
				mode: BridgeUploadMode.File,
				staging: MOD_UPLOAD_STAGING,
			},
		},
	],
	title: {
		ar: "المودات",
		en: "Mods",
	},
};

const playersTab: Bridge.Tab = {
	icon: BridgeIcon.Users,
	id: PLAYERS_TAB_ID,
	sections: [
		{
			columns: [
				{
					key: "name",
					label: {
						ar: "اللاعب",
						en: "Player",
					},
				},
				{
					key: "playerId",
					label: playerIdLabel,
				},
				{
					key: "joined",
					label: {
						ar: "وقت الدخول",
						en: "Joined",
					},
				},
				{
					key: "played",
					label: {
						ar: "مدة اللعب",
						en: "Time played",
					},
				},
			],
			empty: {
				ar: "لا يوجد لاعبون متصلون الآن.",
				en: "Nobody is online right now.",
			},
			help: {
				ar: "اللاعبون المتصلون بسيرفرك الآن. نقرؤهم من سجل السيرفر، فيظهر اللاعب بعد دخوله بلحظة.",
				en: "Everyone on your server right now. We read them from the server log, so a player shows up a moment after they join.",
			},
			id: "online",
			layout: BridgeLayout.Table,
			module: "players",
			place: BridgePlace.Players,
			title: {
				ar: "المتصلون الآن",
				en: "Online now",
			},
		},
		{
			actions: [
				{
					confirm: BridgeConfirm.Normal,
					id: REMOVE_ACTION,
					label: {
						ar: "أزله",
						en: "Remove",
					},
				},
			],
			add: {
				label: {
					ar: "أضف أدمن",
					en: "Add an admin",
				},
				placeholder: PLAYER_ID_PLACEHOLDER,
			},
			columns: [
				{
					key: "playerId",
					label: playerIdLabel,
				},
				{
					key: "player",
					label: {
						ar: "اللاعب",
						en: "Player",
					},
				},
			],
			empty: {
				ar: "لا يوجد أدمن هنا بعد، ويستطيع أي لاعب أن يصبح أدمن بكلمة مرور الأدمن من تبويب الإعدادات.",
				en: "No admins here yet. Any player can still become an admin with the admin password from the Settings tab.",
			},
			help: {
				ar: "تصبح هذه الحسابات أدمن دون كتابة كلمة مرور الأدمن، ويقرأ سيرفرك القائمة عند التشغيل.",
				en: "These accounts become admins without typing the admin password, and your server reads the list when it starts.",
			},
			id: "admins",
			layout: BridgeLayout.Table,
			module: "admins",
			place: BridgePlace.Players,
			restartHint: true,
			title: {
				ar: "الأدمن",
				en: "Admins",
			},
		},
	],
	title: {
		ar: "اللاعبون",
		en: "Players",
	},
};

export const panel: Bridge.Panel = {
	tabs: [
		settingsTab,
		connectTab,
		worldTab,
		modsTab,
		playersTab,
	],
};
