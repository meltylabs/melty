import { Uri, Webview } from "vscode";
import { ChangeSet } from "../types";
import * as os from "os";
import * as diff from "diff";
import path from 'path';
import fs from 'fs/promises';

/**
 * Log an arbitrary error object verbosely
 */
export function logErrorVerbose(source: string, error: unknown): void {
	console.error(error, `
Source: ${source}
Stringify: ${JSON.stringify(error)}
${printErrorChain(error)}
`);
}

export function printErrorChain(error: unknown): string {
	const logLines: string[] = [];

	const logRecursive = (error: unknown, depth: number) => {
		if (!(error instanceof Error)) {
			logLines.push(`${' '.repeat(depth * 2)}Non-Error thrown: ${error}`);
			return;
		}

		logLines.push(`${' '.repeat(depth * 2)}Error: ${highlightNonAsciiChars(error.message)}`);

		if ('cause' in error && error.cause) {
			logRecursive(error.cause, depth + 1);
		}
	};
	logRecursive(error, 0);

	return `=========Error Chain=========\n${logLines.join('\n')}\n==========================`;
}

export class ErrorOperationCancelled extends Error {
	constructor() {
		super("Operation cancelled");
		this.name = "ErrorOperationCancelled";
	}
}

export function meltyBranchNameFromTaskName(taskName: string): string {
	const rnd = Math.random().toString(16).substring(2, 8);
	const sanitizedTaskName = taskName.replace(/[^a-zA-Z0-9]/g, "").substring(0, 12);
	return `melty/${rnd}_${sanitizedTaskName}`;
}
export function getUri(
	webview: Webview,
	extensionUri: Uri,
	pathList: string[]
) {
	return webview.asWebviewUri(Uri.joinPath(extensionUri, ...pathList));
}

export function getNonce() {
	let text = "";
	const possible =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}

export function resolveTildePath(path: string): string {
	if (path.startsWith("~/") || path === "~") {
		return path.replace("~", os.homedir());
	}
	return path;
}

/**
 * Gets diff preview for a change set (NOT a udiff bc this is easier)
 */
export function getUdiffFromChangeSet(changeSet: ChangeSet): string {
	return Object.entries(changeSet.filesChanged)
		.map(([filePath, { original, updated }]) => {
			return diff.createPatch(filePath, original.contents, updated.contents);
		})
		.join("\n");
}

export function findLongestPrefixMatch(
	text: string,
	search: string,
	nonMatchLength: number = 5
): { match: string; nonMatch: string } {
	let prefixLength = 0;
	while (
		prefixLength < search.length &&
		text.includes(search.slice(0, prefixLength + 1))
	) {
		prefixLength++;
	}
	const match = search.slice(0, prefixLength);
	const nonMatch = search.slice(prefixLength, prefixLength + nonMatchLength);
	return { match, nonMatch };
}

// TODO remove if this solves Bruno's issue
export function highlightNonAsciiChars(input: string): string {
	return input
		.split('')
		.map(char => {
			const code = char.charCodeAt(0);
			if (code < 32 || code > 126) {
				return `\\u${code.toString(16).padStart(4, '0')}`;
			}
			return char;
		})
		.join('');
}

export async function pathExists(path: string): Promise<boolean> {
	try {
		await fs.access(path);
		return true;
	} catch {
		return false;
	}
}

export async function isDirectory(path: string): Promise<boolean> {
	try {
		const stats = await fs.stat(path);
		return stats.isDirectory();
	} catch {
		return false;
	}
}

export async function isFile(path: string): Promise<boolean> {
	try {
		const stats = await fs.stat(path);
		return stats.isFile();
	} catch {
		return false;
	}
}

// return true if path1 is inside path2
export function isPathInside(path1: string, path2: string) {
	const absolutePath1 = path.resolve(path1);
	const absolutePath2 = path.resolve(path2);

	const relative = path.relative(absolutePath2, absolutePath1);

	return !relative.startsWith('..') && !path.isAbsolute(relative);
}
