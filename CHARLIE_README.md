# Welcome!

Hi there! Welcome to the project. We're glad you're here.

# To initialize

> yarn
> git submodule init

# To run

> yarn && yarn watch (takes a minute or so)
> Build with cmd+shift+b (or go to command palette and run build task)
> ./scripts/code.sh

# To install latest spectacular

> ./scripts/build-spectacular.sh

# To package

> yarn gulp vscode-darwin-arm64

# VSCode contribution instructions

https://github.com/microsoft/vscode/wiki/How-to-Contribute

# How to do React

1. Wrap rpc calls in useCallback. This one should not have empty dependency array (but don't omit it entirely, or it will run on every render!)
2. The useCallback result is a function. Assign it to a constant
3. Call the function from inside useEffect. Dependency array will include the function -- that's okay, the function never changes, so it won't trigger the effect.

Do not put rpcClient into any dependency arrays (just in case).

Actually, pure event handlers don't need to be wrapped (I think). But anything called from inside a useCallback does need to be wrapped.

# Webview contract

1. Call humanXYZ() when user does XYZ. This sends updateTask and then returns to indicate complete.
2. Immediately after, call startBotTurn() (returns immediately), which takes care of figuring out what to do to get back to human control.
3. Call stopBotTurn() if needed.

All task updates are sent via updateTask. eventually there will be an endBotTurn notification, but we don't need it yet.

# Issues encountered

## Unable to launch browser

Problem: Unable to launch browser: Could not connect to debug target at http://localhost:9222: Could not find any debuggable target

Solution: restart vscode

## A javascript error occurred in the main process

Solution: run yarn watch

## Doesn't open, then says "check launch.json" or something like that

Solution ???
