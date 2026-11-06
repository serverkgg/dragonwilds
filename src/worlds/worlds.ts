import { type Bridge, BridgeKind, BridgeUserError } from "@serverkgg/bridge";
import { BridgeEventName } from "@serverkgg/bridge/protocol";
import { formatByteSize, relativeUploadPath } from "@serverkgg/bridge/utils";
import {
	applyConfig,
	type DragonwildsWorld,
	formatUtc,
	listWorlds,
	readSaveWorldName,
	readWorldName,
	requireWorldName,
	SAVE_GAMES_DIRECTORY,
	WORLD_BACKUP_SUFFIX,
	WORLD_NAME_KEY,
	WORLD_UPLOAD_EXTENSION,
	WORLD_UPLOAD_STAGING,
	worldNameOf,
	worldPathOf,
} from "../shared";

export const ACTIVE_MARK = "✓";

export const ACTIVATE_ACTION = "activate";

export const DELETE_ACTION = "delete";

export const ALREADY_ACTIVE: Bridge.Text = {
	ar: "هذا الماب هو الماب المفعّل أصلًا.",
	en: "This world is already the active world.",
};

export const ACTIVE_WORLD_DELETE: Bridge.Text = {
	ar: "لا يمكن حذف الماب المفعّل. فعّل مابًا آخر أولًا.",
	en: "You can't delete the active world. Activate another one first.",
};

export const WORLD_MISSING: Bridge.Text = {
	ar: "تعذّر العثور على ملف هذا الماب في سيرفرك. حدّث القائمة.",
	en: "We couldn't find this world's file on your server. Refresh the list.",
};

export const STOP_BEFORE_UPLOAD: Bridge.Text = {
	ar: "أوقف سيرفرك قبل رفع الماب، ثم جرب مرة ثانية.",
	en: "Stop your server before uploading a world, then try again.",
};

export const UPLOAD_MISSING: Bridge.Text = {
	ar: "تعذّر العثور على الملف الذي رفعته. ارفعه مرة ثانية.",
	en: "We couldn't find the file you uploaded. Upload it again.",
};

export const WORLD_ALREADY_HERE: Bridge.Text = {
	ar: "يوجد على سيرفرك ماب بهذا الاسم، فلا نستبدله. احذف الماب الموجود أولًا إذا أردت رفعه من جديد.",
	en: "Your server already has a world with this name, and we don't replace it. Delete that world first if you want to upload it again.",
};

export const WORLD_RENAMED: Bridge.Text = {
	ar: "تغيّر اسم ملف هذا الماب، فالماب الذي داخله باسم آخر، ولا يحمّل دراقونوايلدز مابًا إلا من ملف باسمه. أعد إلى الملف اسمه الأصلي، ثم جرب مرة ثانية.",
	en: "This world's file was renamed, so the world inside it has another name, and Dragonwilds loads a world only from a file of its own name. Give the file back its original name, then try again.",
};

export interface WorldRow extends Bridge.Row {
	id: string;
	name: string;
	size: string;
	modified: string;
	active: string;
	path: string;
}

export const worldRowOf = (world: DragonwildsWorld): WorldRow => {
	return {
		active: world.active ? ACTIVE_MARK : "",
		id: world.name,
		modified: formatUtc(Date.parse(world.modifiedAt)),
		name: world.name,
		path: world.path,
		size: formatByteSize(world.sizeBytes),
	};
};

const isUnder = (path: string, directory: string) => {
	return path.startsWith(`${directory}/`);
};

const uploadedSaveOf = async (context: Bridge.Context, input: string) => {
	const source = relativeUploadPath(input);

	if (
		source === null
		|| !isUnder(source, WORLD_UPLOAD_STAGING)
		|| !source.toLowerCase().endsWith(`.${WORLD_UPLOAD_EXTENSION}`)
		|| !(await context.files.exists(source))
	) {
		throw new BridgeUserError(UPLOAD_MISSING);
	}

	return source;
};

export const uploadedWorldNameOf = (source: string) => {
	return requireWorldName(worldNameOf(source.split("/").at(-1) ?? ""));
};

const requireOwnName = async (context: Bridge.Context, path: string, name: string) => {
	const inside = await readSaveWorldName(context, path);

	if (inside === null) {
		context.log.warn("could not read the world name inside a save, so it was taken by its file name", {
			world: name,
		});

		return;
	}

	if (inside !== name) {
		context.log.warn("a save holds a world of another name than its file", {
			inside,
			world: name,
		});

		throw new BridgeUserError(WORLD_RENAMED);
	}
};

const worldOfRow = async (context: Bridge.Context, row: Bridge.Row) => {
	const world = (await listWorlds(context, await readWorldName(context))).find((entry) => entry.name === row.id);

	if (world === undefined) {
		throw new BridgeUserError(WORLD_MISSING);
	}

	return world;
};

export const worlds: Bridge.Collection = {
	kind: BridgeKind.Collection,
	protectedActions: [
		DELETE_ACTION,
	],
	async list(context) {
		return (await listWorlds(context, await readWorldName(context))).map(worldRowOf);
	},
	async add(context, input) {
		if (context.server.running) {
			throw new BridgeUserError(STOP_BEFORE_UPLOAD);
		}

		const source = await uploadedSaveOf(context, input);
		const name = uploadedWorldNameOf(source);
		const target = worldPathOf(name);

		if (await context.files.exists(target)) {
			throw new BridgeUserError(WORLD_ALREADY_HERE);
		}

		await requireOwnName(context, source, name);
		await context.files.ensure(SAVE_GAMES_DIRECTORY);
		await context.files.move(source, target);

		context.log("imported an uploaded world", {
			world: name,
		});
		context.activity.report({
			details: {
				world: name,
			},
			name: BridgeEventName.WorldImported,
			subject: name,
			text: {
				ar: `تم رفع الماب ${name}`,
				en: `Uploaded world ${name}`,
			},
		});

		return {
			notice: {
				ar: `تم رفع الماب ${name}، فعّله من الجدول لتلعب عليه`,
				en: `Uploaded world ${name}, activate it from the table to play on it`,
			},
		};
	},
	actions: {
		async [ACTIVATE_ACTION](context, row) {
			const world = await worldOfRow(context, row);

			if (world.active) {
				throw new BridgeUserError(ALREADY_ACTIVE);
			}

			await requireOwnName(context, world.path, world.name);

			const previous = await readWorldName(context);

			await applyConfig(context, {
				[WORLD_NAME_KEY]: world.name,
			});

			context.log("switched the active world", {
				previous,
				world: world.name,
			});
			context.activity.report({
				details: {
					previous,
					world: world.name,
				},
				name: BridgeEventName.WorldActivated,
				subject: world.name,
				text: {
					ar: `تم تفعيل الماب ${world.name}، ويُطبَّق في التشغيل القادم`,
					en: `Activated world ${world.name}, takes effect at the next start`,
				},
			});
		},
		async [DELETE_ACTION](context, row) {
			const world = await worldOfRow(context, row);

			if (world.active) {
				throw new BridgeUserError(ACTIVE_WORLD_DELETE);
			}

			await context.files.remove(world.path);
			await context.files.remove(`${world.path}${WORLD_BACKUP_SUFFIX}`);

			context.log("deleted a world", {
				world: world.name,
			});
			context.activity.report({
				details: {
					world: world.name,
				},
				name: BridgeEventName.WorldDeleted,
				subject: world.name,
				text: {
					ar: `تم حذف الماب ${world.name}`,
					en: `Deleted world ${world.name}`,
				},
			});
		},
	},
	async unavailable(_context, row): Promise<Bridge.Unavailable> {
		return row.active === ACTIVE_MARK
			? {
					[ACTIVATE_ACTION]: ALREADY_ACTIVE,
					[DELETE_ACTION]: ACTIVE_WORLD_DELETE,
				}
			: {};
	},
};
