import { type Bridge, BridgeKind } from "@serverkgg/bridge";
import { reportVerify } from "../setup";
import {
	applyConfig,
	changedSettingValues,
	OWNER_ID_KEY,
	settingValues,
	storedConfig,
	validateSettingsWrite,
} from "../shared";

export const settings: Bridge.Settings = {
	kind: BridgeKind.Settings,
	async read(context) {
		return settingValues(await storedConfig(context));
	},
	async write(context, values) {
		const checked = validateSettingsWrite(values);
		const changed = changedSettingValues(await storedConfig(context), checked);

		await applyConfig(context, changed);

		if (Object.hasOwn(changed, OWNER_ID_KEY)) {
			await reportVerify(context, true);
		}
	},
};
