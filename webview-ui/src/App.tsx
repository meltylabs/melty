import React, { useState, useEffect } from "react";
import { vscode } from "./utilities/vscode";
import {
  VSCodeButton,
  VSCodeTextField,
} from "@vscode/webview-ui-toolkit/react";
import * as Diff2Html from "diff2html";
import "diff2html/bundles/css/diff2html.min.css";
import "./App.css";

interface Message {
  text: string;
  sender: "user" | "bot";
  diff?: string;
}

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [diffHtml, setDiffHtml] = useState<string>("");

  function handleSendMessage(event: React.FormEvent) {
    event.preventDefault();
    const message = (event.target as HTMLFormElement).message.value;
    const newMessage: Message = { text: message, sender: "user" };
    setMessages([...messages, newMessage]);

    // Send message to extension
    vscode.postMessage({
      command: "code",
      text: message,
    });

    // clear the input
    (event.target as HTMLFormElement).reset();
  }

  function addDemoMessage() {
    const demoDiff = `
diff --git a/example.js b/example.js
index 6214953..1d78b34 100644
--- a/example.js
+++ b/example.js
@@ -1,5 +1,5 @@
 function greet(name) {
-  console.log("Hello, " + name + "!");
+  console.log(\`Hello, \${name}!\`);
 }

-greet("World");
+greet("VSCode");
`;

    const diffHtml = Diff2Html.html(demoDiff, {
      drawFileList: true,
      matching: "lines",
      outputFormat: "side-by-side",
    });

    setDiffHtml(diffHtml);
  }

  useEffect(() => {
    // Listen for messages from the extension
    const messageListener = (event: MessageEvent) => {
      const message = event.data;
      switch (message.command) {
        case "aiResponse":
          console.log("aiResponse", message);
          setMessages((prevMessages) => [
            ...prevMessages,
            {
              text: message.text.message,
              sender: "bot",
              diff: message.text.diff,
            },
          ]);
          break;
      }
    };

    window.addEventListener("message", messageListener);

    return () => window.removeEventListener("message", messageListener);
  }, []);

  return (
    <main className="p-4">
      <h1 className="text-2xl font-bold text-green-500 mb-4">
        General Editor 🫡
      </h1>
      <div className="overflow-y-auto mb-4 rounded p-2">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`mb-2 p-2 rounded ${
              message.sender === "user"
                ? "bg-blue-100 text-right"
                : "bg-gray-100"
            }`}
          >
            {message.diff ? (
              <div
                dangerouslySetInnerHTML={{
                  __html: Diff2Html.html(message.diff, {
                    drawFileList: true,
                    matching: "lines",
                    outputFormat: "side-by-side",
                  }),
                }}
              />
            ) : (
              message.text
            )}
          </div>
        ))}
      </div>

      <div className="flex mb-4">
        <form onSubmit={handleSendMessage}>
          <VSCodeTextField
            id="message"
            className="flex-grow mr-2"
            placeholder="Type a message..."
            required
          />
          <VSCodeButton
            type="submit"
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            Send
          </VSCodeButton>
        </form>
      </div>
      <VSCodeButton
        onClick={addDemoMessage}
        className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
      >
        Add Demo Diff
      </VSCodeButton>
    </main>
  );
}

export default App;
