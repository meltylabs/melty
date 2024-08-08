import React, { useState, useEffect, useRef } from "react";
import { vscode } from "./utilities/vscode";
import {
  ChevronsUpDown,
  XIcon,
  Undo,
  Trash2Icon,
  FileIcon,
  RotateCcwIcon,
} from "lucide-react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Link,
  Navigate,
  useNavigate,
  useParams,
} from "react-router-dom";

import * as Diff2Html from "diff2html";
import "diff2html/bundles/css/diff2html.min.css";
import { Input } from "./components/ui/input";
import { FilePicker } from "./components/FilePicker";
import { Button } from "./components/ui/button";
import { Textarea } from "./components/ui/textarea";
import { Tasks } from "./components/Tasks";
import { Conversation, Joule } from "./types";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./components/ui/collapsible";
import "./App.css";

// todo: move to a types file
type CommandType =
  | "confirmedUndo"
  | "setPartialResponse"
  | "listMeltyFiles"
  | "listWorkspaceFiles"
  | "loadConversation"
  | "logHello"
  | "listTasks";

function JouleComponent({
  joule,
  isPartial = false,
}: {
  joule: Joule;
  isPartial?: boolean;
}) {
  const renderDiff2HTML = (diff: string) => {
    const lines = diff.split("\n");
    const fileNameLine = lines.find((line) => line.startsWith("diff --git"));
    let fileName = "";
    if (fileNameLine) {
      const match = fileNameLine.match(/diff --git a\/(.*) b\/(.*)/);
      if (match) {
        fileName = match[2]; // Use the 'b' file name (new file)
      }
    }

    const customHeader = fileName ? (
      <div className="diff-header flex items-center space-x-2 p-2 bg-gray-100 rounded-t">
        <FileIcon className="h-4 w-4" />
        <button
          className="text-blue-600 hover:underline"
          onClick={() =>
            vscode.postMessage({
              command: "openFileInEditor",
              filePath: fileName,
            })
          }
        >
          {fileName}
        </button>
      </div>
    ) : null;

    return (
      <>
        {customHeader}
        <div
          className="text-xs mt-4 font-mono"
          dangerouslySetInnerHTML={{
            __html: Diff2Html.html(diff, {
              drawFileList: false,
              matching: "lines",
              outputFormat: "line-by-line",
            }),
          }}
        />
      </>
    );
  };

  const diffHtml =
    joule.pseudoCommit.impl.status === "committed" &&
    joule.pseudoCommit.impl.udiffPreview
      ? renderDiff2HTML(joule.pseudoCommit.impl.udiffPreview)
      : null;

  return (
    <div
      className={`grid grid-cols-2 gap-12 mb-2 p-3 rounded ${
        joule.author === "human" ? "bg-gray-50 " : "bg-white"
      }`}
    >
      <div className="text-xs flex flex-col">
        {joule.message.split("\n").map((line, index) => (
          <React.Fragment key={index}>
            {line}
            {index < joule.message.split("\n").length - 1 && <br />}
          </React.Fragment>
        ))}
        {isPartial && <span className="animate-pulse">▋</span>}
      </div>

      <div>
        {diffHtml && !isPartial && (
          <Collapsible>
            <div className="flex items-center justify-end space-x-4 px-4">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  <h4 className="text-sm font-semibold mr-2">1 file changed</h4>
                  <ChevronsUpDown className="h-4 w-4" />
                  <span className="sr-only">Toggle</span>
                </Button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent>{diffHtml}</CollapsibleContent>
          </Collapsible>
        )}
      </div>
    </div>
  );
}

function ConversationView() {
  const { taskId } = useParams<{ taskId: string }>();
  const inputRef = useRef<HTMLInputElement>(null);
  const [meltyFiles, setMeltyFiles] = useState<string[]>([]);
  const [workspaceFiles, setWorkspaceFiles] = useState<string[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [conversation, setConversation] = useState<Conversation | null>(null);

  function handleAddFile(file: string) {
    vscode.postMessage({ command: "addMeltyFile", filePath: file });
    setPickerOpen(false);
  }

  function handleDropFile(file: string) {
    vscode.postMessage({ command: "dropMeltyFile", filePath: file });
    setPickerOpen(false);
  }

  function loadConversation(taskId: string | null) {
    vscode.postMessage({ command: "loadConversation", taskId });
    vscode.postMessage({ command: "switchTask", taskId });
  }

  function loadFiles() {
    vscode.postMessage({ command: "listMeltyFiles" });
    vscode.postMessage({ command: "listWorkspaceFiles" });
  }

  function handleSendMessage(mode: "ask" | "code", text: string) {
    vscode.postMessage({
      command: mode,
      text: text,
      taskId: taskId,
    });
  }

  function handleUndo() {
    vscode.postMessage({ command: "undo", taskId: taskId });
  }

  function handleReset() {
    vscode.postMessage({ command: "resetTask", taskId: taskId });
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    loadFiles();
    loadConversation(taskId ?? null);

    // Listen for messages from the extension
    const messageListener = (event: MessageEvent) => {
      const message = event.data;
      console.log("NEW MESSAGE IN APP.TSX: ", message);

      switch (message.command as CommandType) {
        case "listMeltyFiles":
          console.log("listMeltyFiles", message);
          setMeltyFiles(message.meltyMindFilePaths);
          break;
        case "listWorkspaceFiles":
          console.log("listWorkspaceFiles", message);
          setWorkspaceFiles(message.workspaceFilePaths);
          break;
        case "loadConversation":
          console.log("loadConversation", message);
          setConversation(message.conversation);
          break;
        case "setPartialResponse":
          setConversation((prevConversation) => {
            if (!prevConversation) return null;
            const updatedJoules = [...prevConversation.joules];
            if (
              updatedJoules.length > 0 &&
              updatedJoules[updatedJoules.length - 1].author === "bot"
            ) {
              updatedJoules[updatedJoules.length - 1] = message.joule;
            } else {
              updatedJoules.push(message.joule);
            }
            return { ...prevConversation, joules: updatedJoules };
          });
          break;
      }
    };

    window.addEventListener("message", messageListener);

    return () => window.removeEventListener("message", messageListener);
  }, []);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const message = form.message.value;
    handleSendMessage("ask", message);
    form.reset();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      if (event.metaKey || event.ctrlKey) {
        // Cmd+Enter or Ctrl+Enter
        event.preventDefault();
        if (event.currentTarget && event.currentTarget.value !== undefined) {
          handleSendMessage("code", event.currentTarget.value);
          event.currentTarget.value = "";
        }
      } else if (!event.shiftKey) {
        event.preventDefault();
        if (event.currentTarget && event.currentTarget.value !== undefined) {
          handleSendMessage("ask", event.currentTarget.value);
          event.currentTarget.value = "";
        }
      }
    }
  };

  return (
    <div className="p-4">
      {taskId && (
        <div className="mb-4 p-2 bg-gray-100 rounded">
          <p className="text-sm font-semibold">Current Task ID: {taskId}</p>
        </div>
      )}
      <div className="mb-4 rounded p-2 mx-auto">
        {conversation?.joules.map((joule, index) => (
          <JouleComponent
            key={index}
            joule={joule}
            isPartial={
              index === conversation.joules.length - 1 &&
              joule.author === "bot" &&
              joule.pseudoCommit.impl.status !== "committed"
            }
          />
        ))}
      </div>
      <div className="">
        <form onSubmit={handleSubmit}>
          <div className="mt-4 flex">
            <Textarea
              placeholder="What should I do? (⌘K)"
              id="message"
              autoFocus
              required
              ref={inputRef}
              onKeyDown={handleKeyDown}
            />
          </div>
          <div className="flex justify-end space-x-2 mt-2">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={handleReset}
            >
              <RotateCcwIcon className="h-3 w-3" />
            </Button>
            <Button name="ask" variant="outline" size="sm" type="submit">
              Ask{" "}
              <kbd className="ml-1.5 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded px-1.5 font-mono text-[10px] font-medium text-black opacity-100">
                <span className="text-xs">↵</span>
              </kbd>
            </Button>
            <Button
              name="code"
              size="sm"
              type="button"
              onClick={() => {
                const message = inputRef.current?.value || "";
                handleSendMessage("code", message);
                if (inputRef.current) inputRef.current.value = "";
              }}
            >
              Code{" "}
              <kbd className="ml-1.5 pointer-events-none inline-flex h-5 select-none items-center gap-1 px-1.5 font-mono text-[10px] font-medium text-white opacity-100">
                <span className="text-xs">⌘</span>
                <span className="text-xs">↵</span>
              </kbd>
            </Button>
          </div>
        </form>
      </div>

      <div className="mt-6">
        <FilePicker
          open={pickerOpen}
          setOpen={setPickerOpen}
          meltyMindFilePaths={meltyFiles}
          workspaceFilePaths={workspaceFiles}
          handleAddFile={handleAddFile}
          handleDropFile={handleDropFile}
        />

        <div className="mt-2">
          <p className="text-xs text-muted-foreground mb-2">
            Melty's Mind{"  "}
            <kbd className="ml-1.5 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
              <span className="text-xs">\</span>
            </kbd>{" "}
          </p>
          {meltyFiles.length === 0 && (
            <p className="text-xs text-muted-foreground mb-2 italic">
              Melty can't see any files yet
            </p>
          )}
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
    </div>
  );
}

function App() {
  return (
    <Router>
      <main className="p-4">
        <nav className="mb-4">
          <Link to="/">Tasks</Link>
        </nav>

        <Routes>
          <Route path="/task/:taskId" element={<ConversationView />} />
          <Route path="/" element={<Tasks />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </Router>
  );
}

export default App;
