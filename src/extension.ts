import * as vscode from 'vscode';
import axios from 'axios';

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('spectacular.run', async () => {
        const panel = vscode.window.createWebviewPanel(
            'spectacularChat',
            'Spectacular Chat',
            vscode.ViewColumn.One,
            {
                enableScripts: true
            }
        );

        panel.webview.html = getWebviewContent();

        panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'sendMessage':
                        const response = await sendMessageToAider(message.text);
                        panel.webview.postMessage({ command: 'receiveMessage', text: response });
                        break;
                }
            },
            undefined,
            context.subscriptions
        );
    });

    context.subscriptions.push(disposable);
}

async function sendMessageToAider(userInput: string): Promise<string> {
    return new Promise((resolve, reject) => {
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
        } catch (error) {
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
