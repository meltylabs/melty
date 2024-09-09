# run this from melty directory

export NODE_OPTIONS="--max-old-space-size=8192"

VSCODE_ARCH="arm64"
VSCODE_PLATFORM="darwin"

yarn monaco-compile-check
yarn valid-layers-check

yarn gulp compile-build
yarn gulp compile-extension-media
yarn gulp compile-extensions-build
yarn gulp minify-vscode

yarn gulp "vscode-darwin-${VSCODE_ARCH}-min"

# update modification time
find "../VSCode-darwin-${VSCODE_ARCH}" -print0 | xargs -0 touch -c

yarn gulp minify-vscode-reh
yarn gulp "vscode-reh-${VSCODE_PLATFORM}-${VSCODE_ARCH}-min"
