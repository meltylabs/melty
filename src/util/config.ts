import * as vscode from "vscode";

const EXCLUDES = [
  "**/node_modules/**",
  "**/.melty/**",
  "**/venv/**",
  "**/.venv/**",
  "**/out/**",
  "**/build/**",
  "**/.vscode-test/**",
];

export function getExcludesGlob(): string {
  const config = vscode.workspace.getConfiguration("melty");
  const userExcludes = config.get<string[]>("excludes", []);
  const allExcludes = [...EXCLUDES, ...userExcludes];
  return `{${allExcludes.join(",")}}`;
}

export const STRICT_GIT = false;

export const DEV_MODE = true;
