import type { Bridge } from "@serverkgg/bridge";
import { ADMINISTRATORS_KEY, textOf } from "./dragonwildsConfig";
import { applyConfig, storedConfig } from "./dragonwildsPending";
import { playerIdOf } from "./dragonwildsSettings";

const LIST_OPEN = "(";

const LIST_CLOSE = ")";

const LIST_SEPARATOR = ",";

const QUOTES = /^["']+|["']+$/g;

export const parseAdministrators = (raw: string): string[] => {
	const trimmed = raw.trim();
	const inner = trimmed.startsWith(LIST_OPEN) && trimmed.endsWith(LIST_CLOSE) ? trimmed.slice(1, -1) : trimmed;
	const ids: string[] = [];

	for (const part of inner.split(LIST_SEPARATOR)) {
		const id = playerIdOf(part.trim().replace(QUOTES, ""));

		if (id.length > 0 && !ids.includes(id)) {
			ids.push(id);
		}
	}

	return ids;
};

export const serializeAdministrators = (ids: readonly string[]) => {
	return `${LIST_OPEN}${ids.join(LIST_SEPARATOR)}${LIST_CLOSE}`;
};

export const administratorsOf = (values: Bridge.Values) => {
	return parseAdministrators(textOf(values, ADMINISTRATORS_KEY));
};

export const readAdministrators = async (context: Bridge.Context) => {
	return administratorsOf(await storedConfig(context));
};

export const writeAdministrators = async (context: Bridge.Context, ids: readonly string[]) => {
	await applyConfig(context, {
		[ADMINISTRATORS_KEY]: serializeAdministrators(ids),
	});
};
