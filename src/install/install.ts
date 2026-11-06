import { type Bridge, BridgeKind, BridgeUserError } from "@serverkgg/bridge";
import { BridgeEventName } from "@serverkgg/bridge/protocol";
import { ANONYMOUS_LOGIN, createSteamcmd, missingGameRoots, SteamcmdPlatform } from "@serverkgg/bridge/steam";
import { execDetail } from "@serverkgg/bridge/utils";
import {
	type DragonwildsStamp,
	ENSURED_DIRECTORIES,
	EXECUTABLE_FILES,
	GAME_LABEL,
	GAME_ROOTS,
	patchDragonwildsStamp,
	readDragonwildsStamp,
	STEAM_APP_ID,
} from "../shared";
import { seedConfig } from "./seedConfig";

export const GAME_FILES_MISSING: Bridge.Text = {
	ar: "اكتمل التنزيل من Steam لكن ملفات اللعبة ناقصة. جرب التثبيت مرة ثانية.",
	en: "The download from Steam finished but the game files are missing. Try the install again.",
};

export const steamcmdFor = (context: Bridge.Context) => {
	return createSteamcmd(context, {
		appId: STEAM_APP_ID,
		label: GAME_LABEL,
		login: ANONYMOUS_LOGIN,
		platform: SteamcmdPlatform.Linux,
	});
};

export const requireGameFiles = async (context: Bridge.Context) => {
	const missing = await missingGameRoots(context, GAME_ROOTS);

	if (missing.length > 0) {
		throw new BridgeUserError(GAME_FILES_MISSING, {
			cause: new Error(`steamcmd finished but ${missing.join(", ")} is missing`),
		});
	}
};

export const markExecutable = async (context: Bridge.Context) => {
	const present: string[] = [];

	for (const path of EXECUTABLE_FILES) {
		if (await context.files.exists(path)) {
			present.push(path);
		}
	}

	if (present.length === 0) {
		return;
	}

	const marked = await context.exec([
		"chmod",
		"+x",
		...present,
	]);

	if (marked.code !== 0) {
		throw new Error(`the server files could not be made executable: ${execDetail(marked)}`);
	}
};

export const updatedActivity = (from: string, to: string): Bridge.Activity => {
	return {
		details: {
			from,
			to,
		},
		name: BridgeEventName.ServerUpdated,
		subject: to,
		text: {
			ar: `تم تحديث دراقونوايلدز من البيلد ${from} إلى ${to}`,
			en: `Updated Dragonwilds from build ${from} to ${to}`,
		},
	};
};

export const installedActivity = (buildId: string | null): Bridge.Activity => {
	return {
		details: {
			build: buildId,
		},
		name: BridgeEventName.GameInstalled,
		subject: GAME_LABEL,
		text: {
			ar: "تم تثبيت دراقونوايلدز، والسيرفر جاهز للتشغيل",
			en: "Installed Dragonwilds, the server is ready to start",
		},
	};
};

export const recordBuild = async (context: Bridge.Context, stamp: DragonwildsStamp, buildId: string | null) => {
	if (buildId === null) {
		context.log.warn("steam finished without naming a build, so this install keeps the build the stamp holds", {
			app: STEAM_APP_ID,
			build: stamp.buildId,
		});

		return;
	}

	if (buildId === stamp.buildId) {
		return;
	}

	await patchDragonwildsStamp(context, {
		buildId,
	});

	if (stamp.buildId === null) {
		return;
	}

	context.log("the server moved to a newer dragonwilds build", {
		from: stamp.buildId,
		to: buildId,
	});
	context.emit(BridgeEventName.ServerUpdated, {
		from: stamp.buildId,
		to: buildId,
	});
	context.activity.report(updatedActivity(stamp.buildId, buildId));
};

export const install: Bridge.Install = {
	kind: BridgeKind.Install,
	async run(context) {
		const stamp = await readDragonwildsStamp(context);
		const fresh = (await missingGameRoots(context, GAME_ROOTS)).length > 0;
		const steam = steamcmdFor(context);

		await steam.prepare();

		context.log(
			fresh
				? "letting steam fetch and verify the whole install, dragonwilds is about 5 GB"
				: "checking steam for a newer build",
			{
				app: STEAM_APP_ID,
			},
		);

		await steam.update({
			validate: fresh,
		});

		await requireGameFiles(context);
		await steam.linkSteamClient();
		await markExecutable(context);
		await context.files.ensure(...ENSURED_DIRECTORIES);
		await seedConfig(context);

		const buildId = await steam.buildId();

		await recordBuild(context, stamp, buildId);

		context.log("install complete", {
			app: STEAM_APP_ID,
			build: buildId,
		});

		if (fresh && stamp.buildId === null) {
			context.activity.report(installedActivity(buildId));
		}
	},
	async describe(context) {
		const stamp = await readDragonwildsStamp(context);

		return {
			build: null,
			variant: null,
			version: stamp.buildId,
		};
	},
};
