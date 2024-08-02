import React, { useState } from "react";
import { vscode } from "./utilities/vscode";
import { VSCodeButton, VSCodeTextField } from "@vscode/webview-ui-toolkit/react";
import "./App.css";

interface Message {
  text: string;
  sender: "user" | "bot";
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");

  function handleSendMessage() {
    if (inputMessage.trim() !== "") {
      const newMessage: Message = { text: inputMessage, sender: "user" };
      setMessages([...messages, newMessage]);
      setInputMessage("");

      // Send message to extension
      vscode.postMessage({
        command: "sendMessage",
        text: inputMessage,
      });
    }
  }

  return (
    <main className="flex flex-col h-screen p-4">
      <h1 className="text-2xl font-bold text-green-500 mb-4">Chat Interface</h1>
      <div className="flex-grow overflow-y-auto mb-4 border border-gray-300 rounded p-2">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`mb-2 p-2 rounded ${
              message.sender === "user" ? "bg-blue-100 text-right" : "bg-gray-100"
            }`}
          >
            {message.text}
          </div>
        ))}
      </div>
      <div className="flex">
        <VSCodeTextField
          className="flex-grow mr-2"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
          placeholder="Type a message..."
        />
        <VSCodeButton onClick={handleSendMessage} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
          Send
        </VSCodeButton>
      </div>
    </main>
  );
}

export default App;
