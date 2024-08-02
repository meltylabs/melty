// file: src/panels/HelloWorldPanel.ts

import * as vscode from "vscode";

export class HelloWorldPanel {
  public static currentPanel: HelloWorldPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];

  private constructor(panel: vscode.WebviewPanel) {
    this._panel = panel;
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    this._panel.webview.html = this._getWebviewContent();
  }

  public static render() {
    if (HelloWorldPanel.currentPanel) {
      HelloWorldPanel.currentPanel._panel.reveal(vscode.ViewColumn.One);
    } else {
      const panel = vscode.window.createWebviewPanel(
        "hello-world",
        "Hello World",
        vscode.ViewColumn.One,
        {
          // Empty for now
        }
      );

      HelloWorldPanel.currentPanel = new HelloWorldPanel(panel);
    }
  }

  private _getWebviewContent() {
    // Tip: Install the es6-string-html VS Code extension to enable code highlighting below
    return /*html*/ `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Hello World!</title>
        </head>
        <body>
          <h1>Hello World!</h1>
          <vscode-button id="howdy">Howdy!</vscode-button>
        </body>
      </html>
    `;
  }

  public dispose() {
    HelloWorldPanel.currentPanel = undefined;

    this._panel.dispose();

    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}
