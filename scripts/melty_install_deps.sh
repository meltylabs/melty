#!/bin/bash
set -e

# Run yarn
yarn

# Navigate to spectacular extension and install dependencies
cd extensions/spectacular && npm i

# Navigate to webview-ui and install dependencies
cd webview-ui && npm i
