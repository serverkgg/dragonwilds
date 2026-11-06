import type { Bridge } from "@serverkgg/bridge";

const SEPARATOR = "=";

const COMMENT = /^\s*[;#]/;

const sectionOf = (line: string) => {
	const trimmed = line.trim();

	return trimmed.length > 2 && trimmed.startsWith("[") && trimmed.endsWith("]") ? trimmed.slice(1, -1).trim() : null;
};

const keyOf = (line: string) => {
	if (COMMENT.test(line) || sectionOf(line) !== null) {
		return null;
	}

	const separator = line.indexOf(SEPARATOR);
	const key = separator === -1 ? "" : line.slice(0, separator).trim();

	return key.length > 0 ? key : null;
};

export const parseMemoryIni = (contents: string, section = ""): Record<string, string> => {
	const values: Record<string, string> = {};

	let current = "";

	for (const line of contents.split("\n")) {
		const header = sectionOf(line);

		if (header !== null) {
			current = header;

			continue;
		}

		const key = current === section ? keyOf(line) : null;

		if (key !== null) {
			values[key] = line.slice(line.indexOf(SEPARATOR) + 1).trim();
		}
	}

	return values;
};

export const mergeMemoryIni = (contents: string, values: Record<string, string>, section = "") => {
	const lines = contents.length === 0 ? [] : contents.replace(/\n+$/, "").split("\n");
	const written = new Set<string>();
	const output: string[] = [];

	let current = "";
	let seen = false;

	const appendMissing = () => {
		for (const [key, value] of Object.entries(values)) {
			if (!written.has(key)) {
				output.push(`${key}${SEPARATOR}${value}`);
				written.add(key);
			}
		}
	};

	for (const line of lines) {
		const header = sectionOf(line);

		if (header !== null) {
			if (current === section && seen) {
				appendMissing();
			}

			current = header;
			seen = seen || header === section;
			output.push(line);

			continue;
		}

		const key = current === section ? keyOf(line) : null;

		if (key !== null && Object.hasOwn(values, key)) {
			if (!written.has(key)) {
				output.push(`${key}${SEPARATOR}${values[key]}`);
				written.add(key);
			}

			continue;
		}

		output.push(line);
	}

	if (current === section && seen) {
		appendMissing();
	}

	if (!seen) {
		if (output.length > 0) {
			output.push("");
		}

		output.push(`[${section}]`);
		appendMissing();
	}

	return `${output.join("\n")}\n`;
};

const textOf = (value: Bridge.Value) => {
	return value === null ? "" : String(value);
};

export const memoryIniCodec = (files: Map<string, string>) => {
	return {
		async merge(
			path: string,
			values: Bridge.Values,
			options?: {
				section?: string;
			},
		) {
			const strings = Object.fromEntries(
				Object.entries(values).map(([key, value]) => [
					key,
					textOf(value),
				]),
			);

			files.set(path, mergeMemoryIni(files.get(path) ?? "", strings, options?.section));
		},
		async read(
			path: string,
			options?: {
				section?: string;
			},
		): Promise<Bridge.Values> {
			return parseMemoryIni(files.get(path) ?? "", options?.section);
		},
	};
};
