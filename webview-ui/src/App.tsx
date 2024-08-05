import React, { useState, useEffect } from "react";
import { vscode } from "./utilities/vscode";
import { ChevronsUpDown, XIcon, Undo, Trash2Icon } from "lucide-react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Link,
  Navigate,
} from "react-router-dom";

import * as Diff2Html from "diff2html";
import "diff2html/bundles/css/diff2html.min.css";
import { Avatar, AvatarFallback, AvatarImage } from "./components/ui/avatar";
import { Switch } from "./components/ui/switch";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Button as VSCodeButton } from "@vscode/webview-ui-toolkit";
import { FilePicker } from "./components/FilePicker";
import { Button } from "./components/ui/button";
import { Tasks } from "./components/Tasks";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./components/ui/collapsible";
import "./App.css";
import { Message } from "../../src/extension";

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [partialResponse, setPartialResponse] = useState("");
  const [meltyFiles, setMeltyFiles] = useState<string[]>([]);
  const [workspaceFiles, setWorkspaceFiles] = useState<string[]>([]);

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
    vscode.postMessage({ command: "undo" });
  }

  function loadFiles() {
    vscode.postMessage({ command: "listMeltyFiles" });
    vscode.postMessage({ command: "listWorkspaceFiles" });
  }

  function handleAddFile(file: string) {
    vscode.postMessage({ command: "addMeltyFile", filePath: file });
  }

  function handleDropFile(file: string) {
    vscode.postMessage({ command: "dropMeltyFile", filePath: file });
  }

  function loadMessages() {
    vscode.postMessage({ command: "loadMessages" });
  }

  function handleReset() {
    vscode.postMessage({ command: "resetConversation" });
  }

  useEffect(() => {
    loadFiles();
    loadMessages();

    // Listen for messages from the extension
    const messageListener = (event: MessageEvent) => {
      const message = event.data;
      console.log("NEW MESSAGE IN APP.TSX: ", message);
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
        case "listMeltyFiles":
          console.log("listMeltyFiles", message);
          setMeltyFiles(message.meltyFilePaths);
          break;
        case "listWorkspaceFiles":
          console.log("listWorkspaceFiles", message);
          setWorkspaceFiles(message.workspaceFilePaths);
          break;
        case "loadMessages":
          console.log("loadMessages", message);
          setMessages(message.messages);
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
        case "setPartialResponse":
          // commenting out for now

          // setMessages((prevMessages) => [
          //   ...prevMessages,
          //   {
          //     text: message.joule.message,
          //     sender: "bot",
          //   },
          // ]);
          break;
      }
    };

    window.addEventListener("message", messageListener);

    return () => window.removeEventListener("message", messageListener);
  }, []);

  return (
    <Router>
      <main className="p-4">
        <nav className="mb-4">
          <Link to="/" className="mr-4">
            Chat
          </Link>
          <Link to="/tasks">Tasks</Link>
        </nav>

        <Routes>
          <Route
            path="/"
            element={
              <>
                <MessagesView
                  messages={messages}
                  handleSendMessage={handleSendMessage}
                  handleUndo={handleUndo}
                />
                <div className="mt-6">
                  <FilePicker
                    meltyFilePaths={meltyFiles}
                    workspaceFilePaths={workspaceFiles}
                    handleAddFile={handleAddFile}
                  />

                  <div className="mt-2">
                    <p className="text-xs text-muted-foreground mb-2">
                      Melty's Mind{"  "}
                      <kbd className="ml-1.5 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                        <span className="text-xs">⌘⇧m</span>
                      </kbd>{" "}
                    </p>
                    {meltyFiles.map((file, i) => (
                      <button
                        onClick={() => handleDropFile(file)}
                        className="mt-1 text-xs text-muted-foreground mr-2 bg-gray-100 px-2 py-1 inline-flex items-center"
                        key={`file-${i}`}
                      >
                        <XIcon className="h-3 w-3 mr-2" />
                        {file}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            }
          />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </Router>
  );
}

function MessagesView({
  messages,
  handleSendMessage,
  handleUndo,
}: {
  messages: Message[];
  handleSendMessage: (event: React.FormEvent) => void;
  handleUndo: () => void;
}) {
  return (
    <div className="p-4">
      <div className="mb-4 rounded p-2 mx-auto">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`grid grid-cols-2 gap-12 mb-2 p-3 rounded ${
              message.sender === "user" ? "bg-gray-50 " : "bg-white"
            }`}
          >
            <div className="text-xs flex">
              {/* <Avatar className="mr-3">
                {message.sender === "user" ? (
                  <AvatarImage src="https://github.com/cbh123.png" />
                ) : (
                  <AvatarImage src="https://github.com/shlinked.png" />
                )}
                <AvatarFallback>AI</AvatarFallback>
              </Avatar> */}

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
          </div>
          <div className="flex justify-end space-x-2 mt-2">
            <Button variant="ghost" type="button" onClick={handleReset}>
              <Trash2Icon className="h-3 w-3 mr-2" />
              Reset
            </Button>
            <Button variant="outline">
              Ask{" "}
              <kbd className="ml-1.5 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded px-1.5 font-mono text-[10px] font-medium text-black opacity-100">
                <span className="text-xs">↵</span>
              </kbd>
            </Button>
            <Button>
              Code{" "}
              <kbd className="ml-1.5 pointer-events-none inline-flex h-5 select-none items-center gap-1 px-1.5 font-mono text-[10px] font-medium text-white opacity-100">
                <span className="text-xs">⌘</span>
                <span className="text-xs">↵</span>
              </kbd>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default App;
