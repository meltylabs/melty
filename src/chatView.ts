import * as vscode from "vscode";
import { sendMessageToAider } from "./aider";

const logPrefix = "[ChatView]";

export class ChatView {
  private readonly _view: vscode.WebviewView;
  private _messages: Array<{ sender: "user" | "ai"; text: string }> = [];

  constructor(view: vscode.WebviewView) {
    this._view = view;
    try {
      console.log(`${logPrefix} ChatView constructor called`);
      this._view = view;

      console.log(`${logPrefix} Setting up webview options`);
      console.log(`${logPrefix} Webview view:`, this._view);
      this._view.webview.options = {
        enableScripts: true,
        localResourceRoots: [
          vscode.Uri.joinPath(
            vscode.Uri.file(
              vscode.workspace.workspaceFolders?.[0].uri.fsPath || ""
            ),
            "media"
          ),
        ],
      };
      console.log(`${logPrefix} Webview options set up successfully`);

      console.log(`${logPrefix} Setting up webview HTML`);
      this._view.webview.html = this._getHtmlForWebview();
      console.log(`${logPrefix} Webview HTML set up successfully`);

      console.log(`${logPrefix} Setting up message listener`);
      this._view.webview.onDidReceiveMessage(
        this._onDidReceiveMessage.bind(this)
      );
      console.log(`${logPrefix} Message listener set up successfully`);

      // Initialize empty chat
      this._updateChatView();
      console.log(`${logPrefix} ChatView constructor completed successfully`);
    } catch (error) {
      console.error(`${logPrefix} Error in ChatView constructor:`, error);
      vscode.window.showErrorMessage(
        `Error initializing ChatView: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  private _getHtmlForWebview(): string {
    const htmlContent = /*html*/ `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Spectacle Chat</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 10px; font-size: 12px; }
                    #chat-messages { height: 300px; overflow-y: auto; border: 1px solid #ccc; padding: 10px; margin-bottom: 10px; }
                    #message-input { width: calc(100% - 10px); padding: 5px; margin-bottom: 10px; font-size: 12px; }
                    #send-button, #reset-button { margin-right: 5px; padding: 5px 10px; font-size: 12px; }
                    .message { margin-bottom: 10px; }
                    .user { color: blue; }
                    .ai { color: green; }
                    .thinking { color: gray; font-style: italic; }
                    #ai-loading { display: none; color: gray; font-style: italic; margin-top: 10px; }
                    @keyframes ellipsis {
                        to { width: 20px; }
                    }
                    .ellipsis:after {
                        overflow: hidden;
                        display: inline-block;
                        vertical-align: bottom;
                        animation: ellipsis 2s infinite;
                        content: "\\2026";
                        width: 0px;
                    }
                </style>
            </head>
            <body>
                <div id="chat-messages"></div>
                <select id="command-select">
                    <option value="ask">Ask</option>
                    <option value="add">Add</option>
                    <option value="drop">Drop</option>
                    <option value="diff">Diff</option>
                    <option value="code">Code</option>
                </select>
                <input type="text" id="message-input" placeholder="Type your message...">
                <button id="send-button">Send</button>
                <button id="reset-button">Reset Chat</button>
                <div id="ai-loading" class="ellipsis">AI is thinking</div>
                <div id="usage-info" style="margin-top: 10px; font-size: 10px; color: #666;">
                    <div>Tokens sent: <span id="tokens-sent"></span></div>
                    <div>Tokens received: <span id="tokens-received"></span></div>
                    <div>Cost of call: <span id="cost-call"></span></div>
                    <div>Cost of session: <span id="cost-session"></span></div>
                </div>
                <div id="file-changes" style="margin-top: 10px; font-size: 12px;">
                    <h3>File Changes:</h3>
                    <ul id="file-changes-list"></ul>
                </div>
            </body>
            </html>
        `;

    const scriptContent = /*javascript*/ `
        const vscode = acquireVsCodeApi();
        const chatMessages = document.getElementById('chat-messages');
        const messageInput = document.getElementById('message-input');
        const sendButton = document.getElementById('send-button');
        const resetButton = document.getElementById('reset-button');
        const aiLoading = document.getElementById('ai-loading');
        const commandSelect = document.getElementById('command-select');

        let currentAIMessage = null;

        sendButton.addEventListener('click', sendMessage);
        resetButton.addEventListener('click', resetChat);
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });

        async function sendMessage() {
            const message = messageInput.value;
            const command = commandSelect.value;
            if (message) {
                let input;
                if (command === 'add' || command === 'drop') {
                    input = message.split(',').map(file => file.trim());
                } else {
                    input = message;
                }
                console.log("Sending message to Aider:", input);
                console.log('command: ', command);
                try {
                    const response = await sendMessageToAider(input, `/aider/${command}`);
                    handleAiderResponse(response);
                } catch (error) {
                    console.error("Error sending message to Aider:", error);
                    addMessageToChat('system', `Error: ${error.message}`);
                }
                messageInput.value = '';
                setAIThinking(true);
            }
        }

        function handleAiderResponse(response) {
            updatePartialResponse(response.message);
            if (response.usage) {
                updateUsageInfo(response.usage);
            }
            if (response.fileChanges) {
                renderFileChanges(response.fileChanges);
            }
            setAIThinking(false);
        }

        function addMessageToChat(sender, text) {
            const messageElement = document.createElement('div');
            messageElement.className = 'message ' + sender;
            if (typeof text === 'object' && text !== null) {
                text = JSON.stringify(text, null, 2);
            }
            const senderText = document.createElement('strong');
            senderText.textContent = \`${sender === "user" ? "You" : "AI"}: \`;
            messageElement.appendChild(senderText);
            const contentText = document.createElement('span');
            contentText.textContent = text;
            messageElement.appendChild(contentText);
            chatMessages.appendChild(messageElement);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }

        function updatePartialResponse(text) {
            if (!currentAIMessage) {
                currentAIMessage = document.createElement('div');
                currentAIMessage.className = 'message ai';
                chatMessages.appendChild(currentAIMessage);
            }
            let formattedText;
            if (typeof text === 'object' && text !== null) {
                formattedText = JSON.stringify(text, null, 2);
            } else {
                formattedText = text.toString();
            }
            currentAIMessage.innerHTML = '<strong>AI:</strong> <pre style="white-space: pre-wrap; word-wrap: break-word; max-width: 100%;">' + formattedText + '</pre>';
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }

        function finalizeAIResponse() {
            currentAIMessage = null;
            setA

IThinking(false);
        }

        function startNewAIMessage() {
            currentAIMessage = null;
        }

        function resetChat() {
            vscode.postMessage({ type: 'resetChat' });
            chatMessages.innerHTML = '';
            setAIThinking(false);
        }

        function setAIThinking(isThinking) {
            aiLoading.style.display = isThinking ? 'block' : 'none';
            if (!isThinking && currentAIMessage) {
                currentAIMessage.classList.remove('thinking');
            }
        }

        function updateUsageInfo(usageInfo) {
            console.log("Received usage info in webview:", usageInfo);
            const usageInfoElement = document.getElementById('usage-info');
            const tokensSent = document.getElementById('tokens-sent');
            const tokensReceived = document.getElementById('tokens-received');
            const costCall = document.getElementById('cost-call');
            const costSession = document.getElementById('cost-session');

            if (usageInfo) {
                console.log("Updating usage info display");
                tokensSent.textContent = usageInfo.tokens_sent;
                tokensReceived.textContent = usageInfo.tokens_received;
                costCall.textContent = '$' + usageInfo.cost_call.toFixed(2);
                costSession.textContent = '$' + usageInfo.cost_session.toFixed(2);
                usageInfoElement.style.display = 'block';
            } else {
                console.log("No usage info available");
                usageInfoElement.style.display = 'none';
            }
        }

        function renderFileChanges(fileChanges) {
            const fileChangesList = document.getElementById('file-changes-list');
            fileChangesList.innerHTML = '';
            if (fileChanges && fileChanges.length > 0) {
                fileChanges.forEach(file => {
                    const li = document.createElement('li');
                    li.textContent = file;
                    fileChangesList.appendChild(li);
                });
                document.getElementById('file-changes').style.display = 'block';
            } else {
                document.getElementById('file-changes').style.display = 'none';
            }
        }

        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.type) {
                case 'addMessage':
                    addMessageToChat(message.sender, message.text);
                    break;
                case 'updatePartialResponse':
                    updatePartialResponse(message.text);
                    break;
                case 'finalizeAIResponse':
                    finalizeAIResponse();
                    break;
                case 'updateMessages':
                    chatMessages.innerHTML = '';
                    message.messages.forEach(msg => {
                        addMessageToChat(msg.author, msg.text);
                    });
                    break;
                case 'setAIThinking':
                    setAIThinking(message.isThinking);
                    break;
                case 'startNewAIMessage':
                    startNewAIMessage();
                    break;
                case 'updateUsageInfo':
                    updateUsageInfo(message.usageInfo);
                    break;
                case 'renderFileChanges':
                    renderFileChanges(message.fileChanges);
                    break;
            }
        });

        vscode.postMessage({ type: 'webviewReady' });
    `;

    return htmlContent.replace(
      "</body>",
      `<script>${scriptContent}</script></body>`
    );
  }

  public getWebviewContent(): string {
    return this._getHtmlForWebview();
  }

  private async _onDidReceiveMessage(message: any) {
    console.log(`${logPrefix} Received message:`, message);

    if (message.type === "resetChat") {
      console.log(`${logPrefix} Resetting chat`);
      this._messages = [];
      this._updateChatView();
    } else if (message.type === "sendMessage") {
      console.log(`${logPrefix} Received sendMessage request:`, message);

      try {
        const input = message.command === "add" || message.command === "drop"
          ? message.files
          : message.message;

        // Add user message to chat
        const displayMessage = `${message.command}: ${Array.isArray(input) ? input.join(", ") : input}`;
        this.addMessage("user", displayMessage);

        // Generate AI response
        this.setAIThinking(true);
        const response = await sendMessageToAider(input, `/aider/${message.command}`);
        this.handleAiderResponse(response);
      } catch (error) {
        console.error(`${logPrefix} Error in message handling:`, error);
        vscode.window.showErrorMessage(
          `An error occurred: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        this.setAIThinking(false);
      }
    } else if (message.type === "webviewReady") {
      console.log(`${logPrefix} Webview ready`);
      this._updateChatView();
    } else if (message.type === "log") {
      console.log(`${logPrefix} Log from webview: ${message.message}`);
    } else {
      console.warn(`${logPrefix} Unknown message type received:`, message.type);
    }
  }

  private handleAiderResponse(response: AiderResponse) {
    this.updatePartialResponse(response.message);
    if (response.usage) {
      this._view.webview.postMessage({
        type: "updateUsageInfo",
        usageInfo: response.usage,
      });
    }
    if (response.fileChanges) {
      this._view.webview.postMessage({
        type: "renderFileChanges",
        fileChanges: response.fileChanges,
      });
    }
    this.setAIThinking(false);
  }

  private async createAIResponse(
    command: string,
    userInput: string | string[]
  ): Promise<void> {
    console.log(`${logPrefix} Creating AI response for command: ${command}`);
    try {
      console.log(`${logPrefix} Sending message to Aider`);

      this._view.webview.postMessage({ type: "startNewAIMessage" });

      let response;
      switch (command) {
        case "ask":
        case "code":
          response = await sendMessageToAider(
            userInput as string,
            `/aider/${command}`
          );
          break;
        case "add":
        case "drop":
          response = await sendMessageToAider(
            userInput as string[],
            `/aider/${command}`
          );
          break;
        case "diff":
          response = await sendMessageToAider("", "/aider/diff");
          break;
        default:
          throw new Error(`Unknown command: ${command}`);
      }

      console.log(`${logPrefix} Received response from Aider`);
      console.log(`${logPrefix} response: `, response);
      console.log(`${logPrefix} Usage info: `, response.usage);
      this.updatePartialResponse(response.message);
      if (response.usage) {
        console.log(`${logPrefix} Sending usage info to webview`);
        this._view.webview.postMessage({
          type: "updateUsageInfo",
          usageInfo: response.usage,
        });
      } else {
        console.log(`${logPrefix} No usage info available in the response`);
      }
    } catch (error) {
      console.error(`${logPrefix} Error creating AI response:`, error);
      throw error;
    }
  }

  private _updateChatView() {
    console.log(
      `${logPrefix} Updating chat view with messages:`,
      this._messages
    );
    if (this._view && this._view.webview) {
      this._view.webview.postMessage({
        type: "updateMessages",
        messages: this._messages,
      });
      console.log(`${logPrefix} Posted updateMessages to webview`);
    } else {
      console.error(`${logPrefix} Error: _view or _view.webview is undefined`);
    }
  }

  public addMessage(sender: "user" | "ai", text: string) {
    console.log(`${logPrefix} Adding message - ${sender}: ${text}`);
    this._messages.push({ sender, text });
    this._view.webview.postMessage({
      type: "addMessage",
      sender,
      text,
    });
  }

  public setAIThinking(isThinking: boolean) {
    this._view.webview.postMessage({
      type: "setAIThinking",
      isThinking,
    });
  }

  public updatePartialResponse(
    partialResponse: string | { message: string; fileChanges?: string[] }
  ) {
    let message: string;
    let fileChanges: string[] | undefined;

    if (typeof partialResponse === "string") {
      message = partialResponse;
    } else {
      message = partialResponse.message;
      fileChanges = partialResponse.fileChanges;
    }

    this._view.webview.postMessage({
      type: "updatePartialResponse",
      text: message,
    });
    console.log(`${logPrefix} Sent partial response to webview: ${message}`);

    if (fileChanges) {
      this._view.webview.postMessage({
        type: "renderFileChanges",
        fileChanges: fileChanges,
      });
      console.log(`${logPrefix} Sent file changes to webview:`, fileChanges);
    }

    // Update or add the AI message in the _messages array
    const lastMessage = this._messages[this._messages.length - 1];
    if (lastMessage && lastMessage.sender === "ai") {
      lastMessage.text = message;
    } else {
      this._messages.push({ sender: "ai", text: message });
    }
  }

  public updateWithTask(task: any) {
    // Implement the logic to update the chat view with the task
    console.log(`${logPrefix} Updating chat view with task:`, task);
    // You may want to add the task to the messages or update the UI in some way
  }
}
