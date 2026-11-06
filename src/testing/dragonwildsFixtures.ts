import { INSTALL_STAMP_FILE } from "@serverkgg/bridge/install";
import { DEDICATED_SERVER_FILE, type DragonwildsStamp } from "../shared";

export const PLAYER_ID_FIXTURE = "0002a1b3c4d5e6f708192a3b4c5d6e7f";

export const SECOND_PLAYER_ID_FIXTURE = "0002ffeeddccbbaa0099887766554433";

export const READY_FIXTURE =
	"[2026.11.06-11.35.31:917][120]LogWorld: Bringing World /Game/Maps/World/L_World.L_World up for play (max tick rate 30) at 2026.11.06-11.35.31";

export const STARTUP_MAP_FIXTURE =
	"[2026.11.06-11.31.19:166][  0]LogWorld: Bringing World /Game/Maps/Server/L_ServerStartup.L_ServerStartup up for play (max tick rate 30) at 2026.11.06-11.31.19";

export const CONFIG_REFUSED_FIXTURE = " Dedicated Server cannot continue due to DedicatedServer.ini configuration";

export const OWNER_MISSING_FIXTURE = "The [OwnerId] for this server is empty.  ";

export const PLATFORM_POLICY_INVALID_FIXTURE =
	"The [PlatformPolicy] value [Bogus] is invalid. Valid values: Crossplay, PC, PlayStation, Xbox, Nintendo. Update the config and restart to continue.";

export const CRASH_FIXTURE = "[2026.11.06-11.50.50:174][  0]LogCore: === Critical error: ===";

export const JOIN_CODE_FIXTURE =
	'[2026.11.06-11.35.31:977][120]LogNetSessionSettings: Setting ["JoinCode"] written with key[xz] value[1234-AB5C]';

export const LOGIN_FIXTURE = `[2026.11.06-12.20.00:000][100]LogNet: Login request: ?Name=Mohammed?Password=[hidden] userId: EOS:${PLAYER_ID_FIXTURE} platform: EOS`;

export const LEAVE_FIXTURE = `[2026.11.06-12.30.00:000][200]LogNet: UNetConnection::Close: [UNetConnection] RemoteAddr: 203.0.113.7:51234, Name: IpConnection_0, Driver: GameNetDriver IpNetDriver_0, IsServer: YES, PC: BP_PlayerController_C_0, Owner: BP_PlayerController_C_0, UniqueId: EOS:${PLAYER_ID_FIXTURE}, Channels: 25, Time: 2026.11.06-12.30.00`;

export const BIND_FAILED_FIXTURE =
	"[2026.11.06-12.00.05:000][  0]LogNet: Warning: Could not create socket for bind address 0.0.0.0:26000, got error SE_EADDRINUSE";

export const BIND_FIXTURE = "[2026.11.06-11.31.19:166][  0]LogNet: Created socket for bind address: 0.0.0.0:26000";

export const DEDICATED_SERVER_FIXTURE = [
	"[/Script/Dominion.DedicatedServerSettings]",
	`OwnerId=${PLAYER_ID_FIXTURE}`,
	"ServerName=Old Name",
	"DefaultWorldName=Ashen",
	"WorldPassword=",
	`AdministratorList=(${SECOND_PLAYER_ID_FIXTURE})`,
	"ServerGuid=7C2F9E0B4A1D4E8F9A3B5C6D7E8F9012",
	"PlatformPolicy=Crossplay",
	"bAllowSendingCrashDumps=False",
	"",
	"[SectionsToSave]",
	"bCanSaveAllSections=true",
	"",
].join("\n");

export const GAME_INI_FIXTURE = [
	"[/Script/Engine.GameSession]",
	"MaxPlayers=4",
	"",
].join("\n");

export const ADMIN_PASSWORD_FIXTURE = "OldAdmin42";

export const RETAINED_STAMP = JSON.stringify({
	buildId: "26161880",
	settingsRetained: {
		AdminPassword: ADMIN_PASSWORD_FIXTURE,
		MaxPlayers: 4,
	},
});

export const CONFIG_FILES: Record<string, string> = {
	[DEDICATED_SERVER_FILE]: DEDICATED_SERVER_FIXTURE,
	[INSTALL_STAMP_FILE]: RETAINED_STAMP,
};

export const EMPTY_STAMP: DragonwildsStamp = {
	buildId: null,
	ownerVerified: false,
	settingsBaseline: {
		secrets: {},
		values: {},
	},
	settingsPending: {},
	settingsRetained: {},
};

export const LOG_OPEN_FIXTURE = "﻿Log file open, 11/06/26 12:05:41";

export const SECOND_JOIN_CODE_FIXTURE =
	'[2026.11.06-11.35.32:673][141]LogNetSessionSettings: Setting ["JoinCode"] written with key[xz] value[9876-ZY5X]';

export const READY_LOG_FIXTURE = [
	LOG_OPEN_FIXTURE,
	"LogPakFile: Initializing PakPlatformFile",
	STARTUP_MAP_FIXTURE,
	"[2026.11.06-11.35.27:541][  0]LogDomServerGameMode: Loading configured world [Ashen] from save slot [Ashen]",
	READY_FIXTURE,
	JOIN_CODE_FIXTURE,
	SECOND_JOIN_CODE_FIXTURE,
	"",
].join("\n");

export const BOOTING_LOG_FIXTURE = [
	LOG_OPEN_FIXTURE,
	"LogPakFile: Initializing PakPlatformFile",
	STARTUP_MAP_FIXTURE,
	"",
].join("\n");

export const OWNER_MISSING_LOG_FIXTURE = [
	LOG_OPEN_FIXTURE,
	STARTUP_MAP_FIXTURE,
	OWNER_MISSING_FIXTURE,
	"An OwnerId is required for normal Server operation.  ",
	CONFIG_REFUSED_FIXTURE,
	"",
].join("\n");

export const CONFIG_REFUSED_LOG_FIXTURE = [
	LOG_OPEN_FIXTURE,
	STARTUP_MAP_FIXTURE,
	CONFIG_REFUSED_FIXTURE,
	"",
].join("\n");

export const PLATFORM_REFUSED_LOG_FIXTURE = [
	LOG_OPEN_FIXTURE,
	STARTUP_MAP_FIXTURE,
	PLATFORM_POLICY_INVALID_FIXTURE,
	CONFIG_REFUSED_FIXTURE,
	"",
].join("\n");

const NUL = "\u0000";

const MAP_FIXTURE = "L_World";

const fstringOf = (text: string) => {
	return `${String.fromCharCode(text.length + 1)}${NUL}${NUL}${NUL}${text}${NUL}`;
};

export const saveFixtureOf = (worldName: string) => {
	return `SAVE${NUL}${NUL}INFO${fstringOf(worldName)}${fstringOf(MAP_FIXTURE)}GLOB${NUL}`;
};
