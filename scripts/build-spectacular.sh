#!/usr/bin/env bash

# pull the latest
cd extensions/spectacular
git pull

# install dependencies
npm i && cd webview-ui && npm i && cd ..

# build
npm run compile && npm run build:webview
