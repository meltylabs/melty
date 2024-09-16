#!/bin/bash
set -e

# Run yarn
yarn

# Navigate to spectacular extension and install dependencies
cd extensions/spectacular && yarn

# Navigate to webview-ui and install dependencies
cd webview-ui && yarn

# Return to spectacular directory and build
cd .. && yarn run compile && yarn run build:webview

# Return to the root directory
cd ../..
