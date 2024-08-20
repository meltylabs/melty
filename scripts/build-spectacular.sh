#!/usr/bin/env bash

# pull the latest
git submodule update --remote

# go to melty
cd extensions/spectacular

# install dependencies
npm i && cd webview-ui && npm i && cd ..

# build
npm run compile && npm run build:webview
