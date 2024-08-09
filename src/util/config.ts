const EXCLUDES = [
  "**/node_modules/**",
  "**/.melty/**",
  "**/venv/**",
  "**/.venv/**",
  "**/out/**",
  "**/build/**",
  "**/.vscode-test/**",
];

export const EXCLUDES_GLOB = `{${EXCLUDES.join(",")}}`;

export const STRICT_MODE = true as boolean;
