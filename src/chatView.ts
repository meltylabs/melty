import * as vscode from "vscode";
import { Claude } from "./util/claude";

export class ChatView {
  private readonly _view: vscode.WebviewView;
  private _messages: Array<{ sender: "user" | "ai"; text: string }> = [];

  constructor(view: vscode.WebviewView) {
    this._view = view;
    try {
      console.log("ChatView constructor called");
      this._view = view;

      console.log("Setting up webview options");
      console.log("Webview view:", this._view);
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
      console.log("Webview options set up successfully");

      console.log("Setting up webview HTML");
      this._view.webview.html = this._getHtmlForWebview();
      console.log("Webview HTML set up successfully");

      console.log("Setting up message listener");
      this._view.webview.onDidReceiveMessage(
        this._onDidReceiveMessage.bind(this)
      );
      console.log("Message listener set up successfully");

      // Initialize empty chat
      this._updateChatView();
      console.log("ChatView constructor completed successfully");
    } catch (error) {
      console.error("Error in ChatView constructor:", error);
      vscode.window.showErrorMessage(
        `Error initializing ChatView: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private _getHtmlForWebview(): string {
    return `
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
                <input type="text" id="message-input" placeholder="Type your message...">
                <button id="send-button">Send</button>
                <button id="reset-button">Reset Chat</button>
                <div id="ai-loading" class="ellipsis">AI is thinking</div>
                <script>
                    const vscode = acquireVsCodeApi();
                    const chatMessages = document.getElementById('chat-messages');
                    const messageInput = document.getElementById('message-input');
                    const sendButton = document.getElementById('send-button');
                    const resetButton = document.getElementById('reset-button');
                    const aiLoading = document.getElementById('ai-loading');

                    let currentAIMessage = null;

                    sendButton.addEventListener('click', sendMessage);
                    resetButton.addEventListener('click', resetChat);
                    messageInput.addEventListener('keypress', (e) => {
                        if (e.key === 'Enter') {
                            sendMessage();
                        }
                    });

                    function sendMessage() {
                        const message = messageInput.value;
                        if (message) {
                            vscode.postMessage({ type: 'sendMessage', message });
                            messageInput.value = '';
                            setAIThinking(true);
                        }
                    }

                    function addMessageToChat(sender, text) {
                        const messageElement = document.createElement('div');
                        messageElement.className = 'message ' + sender;
                        if (typeof text === 'object' && text !== null) {
                            text = JSON.stringify(text, null, 2);
                        }
                        const senderText = document.createElement('strong');
                        senderText.textContent = \`\${sender === 'user' ? 'You' : 'AI'}: \`;
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
                        setAIThinking(false);
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
                        }
                    });

                    vscode.postMessage({ type: 'webviewReady' });
                </script>
            </body>
            </html>
        `;
  }

  public getWebviewContent(): string {
    return this._getHtmlForWebview();
  }

  private async _onDidReceiveMessage(message: any) {
    console.log(`CHATVIEW: Received message:`, message);

    if (message.type === "resetChat") {
      console.log(`CHATVIEW: Resetting chat`);
      this._messages = [];
      this._updateChatView();
    } else if (message.type === "sendMessage") {
      console.log(`CHATVIEW: Received sendMessage request: ${message.message}`);

      try {
        // Add user message to chat
        this.addMessage("user", message.message);

        // Generate AI response
        this.setAIThinking(true);
        await this.createAIResponse(message.message);
        this.setAIThinking(false);
      } catch (error) {
        console.error("CHATVIEW: Error in message handling:", error);
        vscode.window.showErrorMessage(`An error occurred: ${error instanceof Error ? error.message : String(error)}`);
        this.setAIThinking(false);
      }
    } else if (message.type === "webviewReady") {
      console.log(`CHATVIEW: Webview ready`);
      this._updateChatView();
    } else if (message.type === "log") {
      console.log(`CHATVIEW: Log from webview: ${message.message}`);
    } else {
      console.warn("CHATVIEW: Unknown message type received:", message.type);
    }
  }

  private async createAIResponse(userMessage: string): Promise<void> {
    console.log("Creating AI response");
    try {
      const fullPrompt = `You are an expert programmer. Help this user with their task. Provide your response in a clear and concise manner.

User: ${userMessage}

Please provide your response to assist the user with their task.`;

      console.log("Sending prompt to Claude");

      this._view.webview.postMessage({ type: "startNewAIMessage" });

      let fullResponse = "";
      const stream = await Claude.sendMessageStream(fullPrompt);

      for await (const chunk of stream) {
        if (
          chunk.type === "content_block_start" ||
          chunk.type === "content_block_delta"
        ) {
          if ('delta' in chunk && 'text' in chunk.delta && chunk.delta.text) {
            fullResponse += chunk.delta.text;
            this.updatePartialResponse(fullResponse);
          }
        }
      }

      console.log("Received full response from Claude");
    } catch (error) {
      console.error(`Error creating AI response:`, error);
      throw error;
    }
  }

  private _updateChatView() {
    console.log("CHATVIEW: Updating chat view with messages:", this._messages);
    if (this._view && this._view.webview) {
      this._view.webview.postMessage({
        type: "updateMessages",
        messages: this._messages,
      });
      console.log("CHATVIEW: Posted updateMessages to webview");
    } else {
      console.error("CHATVIEW: Error: _view or _view.webview is undefined");
    }
  }

  public addMessage(sender: "user" | "ai", text: string) {
    console.log(`CHATVIEW: Adding message - ${sender}: ${text}`);
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

  public updatePartialResponse(partialResponse: string) {
    this._view.webview.postMessage({
      type: "updatePartialResponse",
      text: partialResponse,
    });
    console.log(`Sent partial response to webview: ${partialResponse}`);

    // Update or add the AI message in the _messages array
    const lastMessage = this._messages[this._messages.length - 1];
    if (lastMessage && lastMessage.sender === "ai") {
      lastMessage.text = partialResponse;
    } else {
      this._messages.push({ sender: "ai", text: partialResponse });
    }
  }

  public updateWithTask(task: any) {
    // Implement the logic to update the chat view with the task
    console.log("Updating chat view with task:", task);
    // You may want to add the task to the messages or update the UI in some way
  }
}
