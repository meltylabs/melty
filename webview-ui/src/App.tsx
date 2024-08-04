import React, { useState, useEffect } from "react";
import { vscode } from "./utilities/vscode";
import { ChevronsUpDown, XIcon, Undo } from "lucide-react";
import * as Diff2Html from "diff2html";
import "diff2html/bundles/css/diff2html.min.css";
import { Avatar, AvatarFallback, AvatarImage } from "./components/ui/avatar";
import { Switch } from "./components/ui/switch";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Button as VSCodeButton } from "@vscode/webview-ui-toolkit";
import { FilePicker } from "./components/filePicker";
import { Button } from "./components/ui/button";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./components/ui/tooltip";
import "./App.css";

interface Message {
  text: string;
  sender: "user" | "bot";
  diff?: string;
}

// dummy message

const dummy2: Message = {
  diff: "",
  text: "hi",
  sender: "user",
};

const dummy1: Message = {
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
  const [messages, setMessages] = useState<Message[]>([]);

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

  function handleUndo() {
    vscode.postMessage({
      command: "undo",
    });
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
        case "confirmedUndo":
          console.log("confirmedUndo", message);
          setMessages((prevMessages) => [
            ...prevMessages,
            {
              text: "Undone commit",
              sender: "user",
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
      <div className="mb-4 rounded p-2 mx-auto">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`grid grid-cols-2 gap-12 mb-2 p-3 rounded ${
              message.sender === "user" ? "bg-gray-50 " : "bg-white"
            }`}
          >
            <div className="text-xs flex">
              <Avatar className="mr-3">
                {message.sender === "user" ? (
                  <AvatarImage src="https://github.com/cbh123.png" />
                ) : (
                  <AvatarImage src="https://github.com/shlinked.png" />
                )}
                <AvatarFallback>AI</AvatarFallback>
              </Avatar>
              {message.text}
            </div>

            <div>
              {message.diff && (
                <Collapsible>
                  <div className="flex items-center justify-end space-x-4 px-4">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <h4 className="text-sm font-semibold mr-2">
                          1 file changed
                        </h4>
                        <ChevronsUpDown className="h-4 w-4" />
                        <span className="sr-only">Toggle</span>
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                  <CollapsibleContent>
                    <div
                      className="text-xs mt-4 font-mono"
                      dangerouslySetInnerHTML={{
                        __html: Diff2Html.html(message.diff, {
                          drawFileList: true,
                          matching: "lines",
                          outputFormat: "line-by-line",
                        }),
                      }}
                    />
                  </CollapsibleContent>
                </Collapsible>
              )}
              {index === messages.length - 1 && message.diff && (
                <div className="mt-6 flex justify-end">
                  <Button size="sm" variant="ghost" onClick={handleUndo}>
                    <Undo className="h-3 w-3 mr-2" />
                    <span className="text-xs">Undo</span>
                    <kbd className="ml-1.5 pointer-events-none inline-flex h-4.5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                      <span className="text-xs">⌘</span>U
                    </kbd>
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="">
        {/* <Separator /> */}

        <form onSubmit={handleSendMessage}>
          <div className="mt-4 flex">
            <Input
              placeholder="What should I do?"
              id="message"
              autoFocus
              required
            />
            <Button>Ask Melty</Button>
          </div>
        </form>

        <div className="mt-6 flex items-center space-x-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center space-x-2">
                  <Switch id="airplane-mode" />
                  <Label htmlFor="airplane-mode">Code Mode</Label>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>If code is off, Melty will only offer suggestions.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className="mt-6">
          <FilePicker />

          <div className="mt-2">
            <p className="text-xs text-muted-foreground mb-2">
              Context{"  "}
              <kbd className="ml-1.5 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                <span className="text-xs">⌘</span>J
              </kbd>{" "}
            </p>
            {[...Array(3)].map((_, i) => (
              <span
                className="text-xs text-muted-foreground mr-2 bg-gray-100 px-2 py-1 inline-flex items-center"
                key={i}
              >
                <XIcon className="h-3 w-3 mr-2" />
                file{i}.txt
              </span>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

export default App;
