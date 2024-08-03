import React, { useState, useEffect } from "react";
import { vscode } from "./utilities/vscode";
import * as Diff2Html from "diff2html";
import "diff2html/bundles/css/diff2html.min.css";
import { Avatar, AvatarFallback, AvatarImage } from "./components/ui/avatar";

import "./App.css";

interface Message {
  text: string;
  sender: "user" | "bot";
  diff?: string;
}

// dummy message

const dummy1: Message = {
  diff: "",
  text: "hi",
  sender: "user",
};

const dummy2: Message = {
  diff: "",
  text: "Hello! I'm here to assist you. Since you haven't made any specific request for changes yet, there\nare no files that I can identify as needing changes at this moment. When you have a specific task\nor modification in mind, please let me know, and I'll be happy to suggest which files might need \nto be edited to accomplish that task. Once I've identified potential files for editing, I'll stop\nand wait for your approval before proceeding with any changes.                                   Tokens: 12,556 sent, 94 received. Cost: $0.04 request, $0.04 session.",
  sender: "bot",
};

const dummy3: Message = {
  diff: "diff --git a/hi.txt b/hi.txt\nnew file mode 100644\nindex 0000000..a7299ca\n--- /dev/null\n+++ b/hi.txt\n@@ -0,0 +1 @@\n+Hello! This is the content of hi.txt file.",
  text: 'Certainly! I can create a new file named "hi.txt" for you. Since this is a new file, we don\'t    \nneed to search for existing content. Here\'s the SEARCH/REPLACE block to create the file:         \n\nhi.txt                                                                                           \n                                                                                                 \n <<<<<<< SEARCH                                                                                   =======                                                                                          Hello! This is the content of hi.txt file.                                                       >>>>>>> REPLACE                                                                                 \n                                                                                                 \n\nThis will create a new file named "hi.txt" in the current directory with a simple greeting       \nmessage. Let me know if you want to make any changes to the content or if you\'d like to proceed  \nwith creating this file.                                                                         Tokens: 12,680 sent, 119 received. Cost: $0.04 request, $0.08 session.Applied edit to hi.txtCommit 0afed18 Create new hi.txt fileYou can use /undo to revert and discard commit 0afed18.',
  sender: "bot",
};

function App() {
  const [messages, setMessages] = useState<Message[]>([dummy1, dummy2, dummy3]);

  function handleSendMessage(event: React.FormEvent) {
    event.preventDefault();
    const message = (event.target as HTMLFormElement).message.value;

    // Send message to extension
    vscode.postMessage({
      command: "code",
      text: message,
    });

    // clear the input
    (event.target as HTMLFormElement).reset();
  }

  useEffect(() => {
    // Listen for messages from the extension
    const messageListener = (event: MessageEvent) => {
      const message = event.data;
      switch (message.command) {
        case "addMessage":
          console.log("addMessage", message);
          setMessages((prevMessages) => [
            ...prevMessages,
            {
              text: message.text.message,
              sender: message.text.sender,
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
      <h1 className="text-xl font-bold leading-7 text-gray-900 sm:truncate sm:tracking-tight">
        Melty
      </h1>
      <div className="mb-4 rounded p-2 mx-auto">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`grid grid-cols-2 mb-2 p-2 rounded ${
              message.sender === "user" ? "bg-blue-100" : "bg-gray-100"
            }`}
          >
            <div>{message.text}</div>

            <div>
              {message.diff && (
                <div
                  dangerouslySetInnerHTML={{
                    __html: Diff2Html.html(message.diff, {
                      drawFileList: true,
                      matching: "lines",
                      outputFormat: "side-by-side",
                    }),
                  }}
                />
              )}
            </div>
          </div>
        ))}
      </div>
      <Avatar>
        <AvatarImage src="https://github.com/shadcn.png" />
        <AvatarFallback>CN</AvatarFallback>
      </Avatar>
      <div className="">
        <form onSubmit={handleSendMessage}>
          <div className="mt-2">
            <input
              id="message"
              name="message"
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              defaultValue={""}
              required
            />
          </div>

          <button
            type="submit"
            className="mt-4 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            Send
          </button>
        </form>
      </div>
    </main>
  );
}

export default App;
