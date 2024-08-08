const EXCLUDES = [
  "**/node_modules/**",
  "**/.melty/**",
  "**/venv/**",
  "**/.venv/**",
  "**/out/**",
  "**/build/**",
];

export const EXCLUDES_GLOB = `{${EXCLUDES.join(",")}}`;