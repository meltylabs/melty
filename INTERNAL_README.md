Melty is a VS Code extension that acts as an AI pair programmer, helping you write and improve your code.

## Features

- AI-assisted code generation
- Intelligent code suggestions
- [Add more features here]

## Installation

1. Install the extension from the VS Code Marketplace.
2. Set up your Anthropic API key in the extension settings.
3. [Add any additional setup steps]

## Usage

[Provide instructions on how to use the extension]

## Requirements

- VS Code 1.91.0 or higher
- [List any other requirements]

## Extension Settings

This extension contributes the following settings:

- `melty.anthropicApiKey`: API key for Anthropic Claude
- `melty.githubToken`: GitHub token

## Known Issues

[List any known issues or limitations]

## Release Notes

### 0.1.0

Initial release of Melty

---

## For Developers

### Setup

1. Clone the repository
2. Run `npm run install:all` to install dependencies for both the extension and the webview

### Build and Run

- Use the VS Code launch configurations in `launch.json` to run and debug the extension
- Run `npm run watch` to start the compiler in watch mode
- Run `npm run watch:webview` to start the webview compiler in watch mode

Webview / Frontend:

- Run `npm run watch:all` to start the webview compiler in watch mode. It will automatically open a new browser window with the webview. Whenever changes are made to webview-ui, it will automatically create a build.

## Publish

- `vsce publish minor`

### Testing

- Run `npm test` to run the test suite

### Publishing

To publish the extension to the VS Code Marketplace:

1. Ensure you have a Microsoft account and are logged in to the [Visual Studio Marketplace](https://marketplace.visualstudio.com/vscode).
2. Install the `vsce` package globally: `npm install -g vsce`
3. Update the `version` field in `package.json` for each new release.
4. Package your extension: `vsce package`
5. Publish your extension: `vsce publish`
   You'll be prompted to enter your personal access token.

For more detailed instructions, refer to the [official documentation](https://code.visualstudio.com/api/working-with-extensions/publishing-extension).

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
