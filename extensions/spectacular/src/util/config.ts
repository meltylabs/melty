import * as vscode from "vscode";

export function getUserPrompt(): string {
	const config = vscode.workspace.getConfiguration("melty");
	return config.get<string>("userPrompt", "");
}

export function getDebugMode(): boolean {
	const config = vscode.workspace.getConfiguration("melty");
	return config.get<boolean>("debugMode", false);
}

const EXCLUDES = [
	"**/node_modules/**",
	"**/.melty/**",
	"**/venv/**",
	"**/.venv/**",
	"**/out/**",
	"**/build/**",
	"**/.vscode-test/**",
	"**/.github/**",
	"**/.aider.tags.cache",
	"**/.expo/**",
	"**/.next/**",
	"**/.vercel/**",
	"**.env/**",
	"**.env.local/**",
	"**/.ruby-lsp/**",
	"**/tmp/**",
	"**/dist/**",
	"**/.expo/**",
	"**/.contentlayer/**",
	"**/db.sql/**",
];

export function getExcludesGlob(): string {
	const config = vscode.workspace.getConfiguration("melty");
	const userExcludes = config.get<string[]>("excludes", []);
	const allExcludes = [...EXCLUDES, ...userExcludes];
	return `{${allExcludes.join(",")}}`;
}

export function getIsAutocommitMode(): boolean {
	const config = vscode.workspace.getConfiguration("melty");
	return config.get<boolean>("autocommit", true);
}
