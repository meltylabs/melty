import axios from 'axios';
import * as vscode from 'vscode';
import * as path from 'path';

export class AiderPanel {
    public static currentPanel: AiderPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        this._panel.webview.html = this._getWebviewContent(this._panel.webview, extensionUri);
        this._setWebviewMessageListener(this._panel.webview);
    }

    public static createOrShow(extensionUri: vscode.Uri) {
        const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;

        if (AiderPanel.currentPanel) {
            AiderPanel.currentPanel._panel.reveal(column);
        } else {
            const panel = vscode.window.createWebviewPanel(
                'spectacularChat',
                'Spectacular Chat',
                column || vscode.ViewColumn.One,
                {
                    enableScripts: true,
                    localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')]
                }
            );
            AiderPanel.currentPanel = new AiderPanel(panel, extensionUri);
        }
    }

    private _getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri) {
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'media.js'));
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'media.css'));

        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link rel="stylesheet" type="text/css" href="${styleUri}">
                <title>Spectacular Chat</title>
            </head>
            <body>
                <div class="chat-container">
                    <div class="messages"></div>
                    <div class="input-container">
                        <input type="text" id="userInput" placeholder="Type your message...">
                        <button id="sendButton">Send</button>
                    </div>
                </div>
                <script src="${scriptUri}"></script>
            </body>
            </html>
        `;
    }

    private _setWebviewMessageListener(webview: vscode.Webview) {
        webview.onDidReceiveMessage(
            async (message: any) => {
                const { command, text } = message;
                switch (command) {
                    case 'sendToAider':
                        try {
                            const response = await sendMessageToAider(text);
                            webview.postMessage({ command: 'addAiMessage', text: response });
                        } catch (error) {
                            webview.postMessage({ command: 'addAiMessage', text: `Error: ${error}` });
                        }
                        return;
                }
            },
            undefined,
            this._disposables
        );
    }
}

export async function sendMessageToAider(userInput: string): Promise<string> {
    try {
        // Ensure the Aider server is started
        await axios.post('http://0.0.0.0:8000/startup', {
            root_dir: vscode.workspace.rootPath
        });

        // Send the command to Aider
        const response = await axios.post('http://0.0.0.0:8000/aider/sendCommand', {
            message: userInput
        });

        return response.data.message;
    } catch (error: any) {
        vscode.window.showErrorMessage('Failed to connect to Aider server. Please ensure the server is running.');
        throw new Error(`Aider command failed: ${error.message}`);
    }
}
