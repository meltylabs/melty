# spectacular

## Install

1. npm i
2. cd webview && npm i

## Run stuff

Use the vscode configurations in launch.json

## Notes on build scripts

- I wrote npm clean
- `pretest` automatically runs before `test` (it's an npm thing)
- test/suite/testIndex.ts and test/runTest.ts are for building your own test runner. We don't want that.
  (ref: https://code.visualstudio.com/api/get-started/your-first-extension)
- .vscode-test.mjs configures where to look for test files (out/test/**/*.test.js)
