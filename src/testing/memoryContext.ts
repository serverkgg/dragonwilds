import type { Bridge } from "@serverkgg/bridge";
import { compileGlob } from "@serverkgg/bridge/utils";
import { memoryIniCodec } from "./memoryIni";

export interface MemoryEmit {
	event: string;
	payload: Bridge.Values | undefined;
}

export interface MemoryLog {
	level: "info" | "warn" | "error";
	message: string;
	fields: Bridge.Values | undefined;
}

export interface MemoryContextOptions {
	files?: Record<string, string>;
	modified?: Record<string, string>;
	variables?: Record<string, string>;
	ports?: Record<string, number>;
	running?: boolean;
	publicAddress?: string | null;
	playerAddress?: string | null;
	exec?: (command: string[]) => Bridge.ExecResult;
	archives?: Record<string, Record<string, string>>;
}

export interface MemoryFollow {
	pattern: RegExp;
	onMatch: (match: RegExpMatchArray) => void;
}

export const MEMORY_MODIFIED_AT = "2026-11-06T12:00:00.000Z";

const GREP = "grep";

const HEAD = "head";

const HIDDEN_PREFIX = ".";

const grepOf = (files: Map<string, string>, command: string[]): Bridge.ExecResult => {
	const pattern = new RegExp(command.at(-2) ?? "");
	const content = files.get(command.at(-1) ?? "");

	if (content === undefined) {
		return {
			code: 2,
			stderr: "no such file",
			stdout: "",
		};
	}

	const matched = content.split("\n").filter((line) => pattern.test(line));

	return {
		code: matched.length === 0 ? 1 : 0,
		stderr: "",
		stdout: matched.length === 0 ? "" : `${matched.join("\n")}\n`,
	};
};

interface MemoryExtractOptions {
	tree?: boolean;
	extensions?: string[];
}

const extractedNameOf = (entry: string, options: MemoryExtractOptions) => {
	const segments = entry.split("/");
	const name = segments.at(-1) ?? "";
	const extension = name.split(".").at(-1)?.toLowerCase() ?? "";

	if (name.length === 0 || segments.some((segment) => segment.startsWith(HIDDEN_PREFIX))) {
		return null;
	}

	if (options.extensions !== undefined && !options.extensions.includes(extension)) {
		return null;
	}

	return options.tree === true ? entry : name;
};

const isWithin = (path: string, directory: string) => {
	return path === directory || path.startsWith(`${directory}/`);
};

export const memoryContext = (options: MemoryContextOptions = {}) => {
	const files = new Map(Object.entries(options.files ?? {}));
	const modified = new Map(Object.entries(options.modified ?? {}));
	const ensured: string[] = [];
	const activities: Bridge.Activity[] = [];
	const emits: MemoryEmit[] = [];
	const logged: MemoryLog[] = [];
	const commands: string[][] = [];
	const portsRead: string[] = [];
	const printed: string[] = [];
	const follows: MemoryFollow[] = [];
	const setupReports: Bridge.SetupRuntime[] = [];
	const server = {
		playerAddress: options.playerAddress ?? null,
		publicAddress: options.publicAddress ?? null,
		running: options.running ?? false,
	};

	const listed = (glob: string): Bridge.FileEntry[] => {
		const pattern = compileGlob(glob);

		return [
			...files.entries(),
		]
			.filter(([path]) => pattern.test(path))
			.map(([path, content]) => {
				return {
					directory: false,
					modifiedAt: modified.get(path) ?? MEMORY_MODIFIED_AT,
					name: path.split("/").at(-1) ?? path,
					path,
					sizeBytes: content.length,
				};
			});
	};

	const logAt = (level: MemoryLog["level"]) => {
		return (message: string, fields?: Bridge.Values) => {
			logged.push({
				fields,
				level,
				message,
			});
		};
	};

	const context = {
		activity: {
			report(entry: Bridge.Activity) {
				activities.push(entry);
			},
		},
		codec: {
			ini: memoryIniCodec(files),
		},
		emit(event: string, payload?: Bridge.Values) {
			emits.push({
				event,
				payload,
			});
		},
		async exec(command: string[]) {
			commands.push(command);

			if (options.exec !== undefined) {
				return options.exec(command);
			}

			if (command.at(0) === GREP) {
				return grepOf(files, command);
			}

			if (command.at(0) === HEAD) {
				return {
					code: files.has(command.at(-1) ?? "") ? 0 : 1,
					stderr: "",
					stdout: (files.get(command.at(-1) ?? "") ?? "").slice(0, Number(command.at(-2))),
				};
			}

			return {
				code: 0,
				stderr: "",
				stdout: "",
			};
		},
		files: {
			async ensure(...paths: string[]) {
				ensured.push(...paths);
			},
			async extract(path: string, destination: string, extractOptions: MemoryExtractOptions = {}) {
				const archive = options.archives?.[path];

				if (archive === undefined || !files.has(path)) {
					throw new Error(`path "${path}" is not a readable archive`);
				}

				const written: string[] = [];

				for (const [entry, content] of Object.entries(archive)) {
					const name = extractedNameOf(entry, extractOptions);

					if (name !== null) {
						files.set(`${destination}/${name}`, content);
						written.push(`${destination}/${name}`);
					}
				}

				if (written.length === 0) {
					throw new Error(`archive "${path}" contained no matching files`);
				}

				return written;
			},
			async exists(path: string) {
				return (
					ensured.some((entry) => isWithin(entry, path))
					|| [
						...files.keys(),
					].some((entry) => isWithin(entry, path))
				);
			},
			async list(glob: string) {
				return listed(glob);
			},
			async move(from: string, to: string) {
				const moved = [
					...files.entries(),
				].filter(([entry]) => isWithin(entry, from));

				if (moved.length === 0) {
					throw new Error(`"${from}" does not exist`);
				}

				if (
					[
						...files.keys(),
					].some((entry) => isWithin(entry, to))
				) {
					throw new Error(`"${to}" already exists`);
				}

				for (const [entry, content] of moved) {
					const target = `${to}${entry.slice(from.length)}`;

					files.delete(entry);
					files.set(target, content);

					const at = modified.get(entry);

					if (at !== undefined) {
						modified.delete(entry);
						modified.set(target, at);
					}
				}
			},
			async read(path: string) {
				const content = files.get(path);

				if (content === undefined) {
					throw new Error(`ENOENT: ${path}`);
				}

				return content;
			},
			async remove(path: string) {
				for (const entry of [
					...files.keys(),
				]) {
					if (isWithin(entry, path)) {
						files.delete(entry);
					}
				}
			},
			async write(path: string, content: string) {
				files.set(path, content);
			},
		},
		log: Object.assign(logAt("info"), {
			error: logAt("error"),
			warn: logAt("warn"),
		}),
		logs: {
			follow(pattern: RegExp, onMatch: (match: RegExpMatchArray) => void) {
				follows.push({
					onMatch,
					pattern,
				});

				return () => {};
			},
		},
		port(key: string) {
			portsRead.push(key);

			const port = options.ports?.[key];

			if (port === undefined) {
				throw new Error(`port "${key}" is not active`);
			}

			return port;
		},
		print(line: string) {
			printed.push(line);
		},
		server,
		setup: {
			report(runtime: Bridge.SetupRuntime) {
				setupReports.push(runtime);
			},
		},
		variable(key: string) {
			return options.variables?.[key] ?? null;
		},
	} as unknown as Bridge.Context;

	const feed = (line: string) => {
		for (const follow of follows) {
			const match = follow.pattern.exec(line);

			if (match) {
				follow.onMatch(match);
			}
		}
	};

	return {
		activities,
		commands,
		context,
		emits,
		ensured,
		feed,
		files,
		follows,
		logged,
		portsRead,
		printed,
		server,
		setupReports,
	};
};
