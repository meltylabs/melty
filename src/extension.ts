import * as vscode from 'vscode';
import * as path from 'path';
import axios from 'axios';

let chatMessages: string[] = [];

export function activate(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            'spectacularChat',
            new SpectacularChatViewProvider(context.extensionUri)
        )
    );
}

class SpectacularChatViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'spectacularChat';
    private _view?: vscode.WebviewView;

    constructor(private readonly _extensionUri: vscode.Uri) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this.getWebviewContent(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'sendMessage':
                        const response = await sendMessageToAider(message.text);
                        chatMessages.push(`User: ${message.text}`);
                        chatMessages.push(`Aider: ${response}`);
                        this._view?.webview.postMessage({ command: 'receiveMessage', text: response });
                        break;
                }
            }
        );

        // Restore chat history
        webviewView.webview.postMessage({ command: 'restoreMessages', messages: chatMessages });
    }

    private getWebviewContent(webview: vscode.Webview): string {
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js'));
        const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.css'));

        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Spectacular Chat</title>
                <link href="${styleUri}" rel="stylesheet">
            </head>
            <body>
                <div id="chat-container">
                    <div id="messages"></div>
                    <input id="message-input" type="text" placeholder="Type a message..."/>
                    <button id="send-button">Send</button>
                </div>
                <script src="${scriptUri}"></script>
            </body>
            </html>
        `;
    }
}

async function sendMessageToAider(userInput: string): Promise<string> {
    return new Promise(async (resolve, reject) => {
        try {
            // Ensure the Aider server is started
            await axios.post('http://0.0.0.0:8000/startup', {
                root_dir: vscode.workspace.rootPath
            });

            // Send the command to Aider
            const response = await axios.post('http://0.0.0.0:8000/aider/sendCommand', {
                message: userInput
            });

            resolve(response.data.message);
        } catch (error: any) {
            vscode.window.showErrorMessage('Failed to connect to Aider server. Please ensure the server is running.');
            reject(`Aider command failed: ${error.message}`);
        }
    });
}

function getWebviewContent() {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Spectacular Chat</title>
        </head>
        <body>
            <div id="chat-container">
                <div id="messages"></div>
                <input id="message-input" type="text" placeholder="Type a message..."/>
                <button id="send-button">Send</button>
            </div>
            <script>
                const vscode = acquireVsCodeApi();

                document.getElementById('send-button').addEventListener('click', () => {
                    const input = document.getElementById('message-input');
                    vscode.postMessage({
                        command: 'sendMessage',
                        text: input.value
                    });
                    input.value = '';
                });

                window.addEventListener('message', event => {
                    const message = event.data;
                    switch (message.command) {
                        case 'receiveMessage':
                            const messagesDiv = document.getElementById('messages');
                            const messageElement = document.createElement('div');
                            messageElement.textContent = message.text;
                            messagesDiv.appendChild(messageElement);
                            break;
                    }
                });
            </script>
        </body>
        </html>
    `;
}

export function deactivate() {}
