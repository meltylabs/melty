#!/bin/bash

# Run yarn
yarn

# Navigate to spectacular extension and install dependencies
cd extensions/spectacular && npm i

# Navigate to webview-ui and install dependencies
cd webview-ui && npm i

# Return to spectacular directory and build
cd .. && npm run compile && npm run build:webview

# Navigate to supermaven extension, install dependencies and build
cd ../supermaven && npm i && npm run compile

# Return to the root directory and run vscode
cd ../.. && ./scripts/code.sh
