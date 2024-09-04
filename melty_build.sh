#!/bin/bash

# Run yarn
yarn

# Navigate to spectacular extension and install dependencies
cd extensions/spectactular && npm i

# Navigate to webview-ui and install dependencies
cd webview-ui && npm i

# Return to spectacular directory and build
cd .. && npm run build

# Navigate to supermaven extension and install dependencies
cd ../supermaven && npm i

# Return to the root directory
cd ../..
