# Contributing to Melty

Thanks for helping make Melty better!

## Feedback

We'd love to hear your feedback at [humans@melty.sh](mailto:humans@melty.sh).

## Issues and feature requests

Feel free to create a new GitHub issue for bugs or feature requests.

If you're reporting a bug, please include

- Version of Melty (About -> Melty)
- Your operating system
- Errors from the Dev Tools Console (open from the menu: Help > Toggle Developer Tools)

## Pull requests

We're working hard to get the Melty code into a stable state where it's easy to accept contributions. If you're interested in adding something to Melty, please reach out first and we can discuss how it fits into our roadmap.

## Local development

To get started with local development, clone the repository and run:

```bash
# install dependencies
npm run melty:install

# start the melty extension and code editor in development mode
npm run melty:dev
```

> **Note:** The `melty:dev` script runs the melty extension in development mode, alongside the code editor. The extension may take time to build and start. If the code editor launches while the extension is building, you will have to reload the code editor by pressing `cmd+R` or `ctrl+R` after the extension has been built and started.

In the development mode, any changes you make to the `./extensions/spectacular/` directory will be watched and the extension will be built. To see your changes, you must reload the code editor.
