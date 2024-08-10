import React, { useState, useEffect, useRef } from "react";
import { vscode } from "./utilities/vscode";
import {
  XIcon,
  FileIcon,
  RotateCcwIcon,
  PlusIcon,
  GitPullRequestIcon,
  ChevronsUpDown,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Link,
  Navigate,
  useParams,
} from "react-router-dom";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./components/ui/collapsible";
import * as Diff2Html from "diff2html";
import "diff2html/bundles/css/diff2html.min.css";
import { FilePicker } from "./components/FilePicker";
import { Button } from "./components/ui/button";
import { Textarea } from "./components/ui/textarea";
import { Tasks } from "./components/Tasks";
import { Task, Joule } from "./types";
import CopyButton from "./components/CopyButton";
import "./App.css";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { ExtensionRPC } from "./extensionRPC";

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
      className={`grid grid-cols-1 gap-12 mb-2 p-3 rounded ${
        joule.author === "human" ? "bg-gray-50 " : "bg-white"
      }`}
    >
      <div className="text-xs flex flex-col prose">
        <ReactMarkdown
          components={{
            code({ node, className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || "");
              return match ? (
                <div className="relative p-0 ">
                  {!isPartial && (
                    <CopyButton code={String(children).replace(/\n$/, "")} />
                  )}
                  <SyntaxHighlighter
                    language={match[1]}
                    style={vscDarkPlus}
                    PreTag="div"
                    children={String(children).replace(/\n$/, "")}
                  />
                </div>
              ) : (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            },
          }}
        >
          {joule.message}
        </ReactMarkdown>
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
  const [extensionRPC] = useState(() => new ExtensionRPC());
  const { taskId } = useParams<{ taskId: string }>();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [meltyFiles, setMeltyFiles] = useState<string[]>([]);
  const [workspaceFiles, setWorkspaceFiles] = useState<string[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [task, setTask] = useState<Task | null>(null);

  async function handleAddFile(file: string) {
    const meltyFiles = await extensionRPC.run("addMeltyFile", {
      filePath: file,
    });
    setMeltyFiles(meltyFiles);
    setPickerOpen(false);
  }

  async function handleDropFile(file: string) {
    const meltyFiles = await extensionRPC.run("dropMeltyFile", {
      filePath: file,
    });
    setMeltyFiles(meltyFiles);
    setPickerOpen(false);
  }

  async function loadTask(taskId: string) {
    // TODO refactor loadTask and switchTask
    const task = await extensionRPC.run("loadTask", { taskId });
    setTask(task);
    await extensionRPC.run("switchTask", { taskId }); // discard output
  }

  async function loadFiles() {
    const meltyFiles = await extensionRPC.run("listMeltyFiles");
    setMeltyFiles(meltyFiles);
    const workspaceFiles = await extensionRPC.run("listWorkspaceFiles");
    setWorkspaceFiles(workspaceFiles);
  }

  function handleSendMessage(mode: "ask" | "code", text: string) {
    extensionRPC.run("chatMessage", { mode, text });
    // response will be returned asynchronously through notifications
  }

  // function handleUndo() {
  //   vscode.postMessage({ command: "undo", taskId: taskId });
  // }

  // function handleReset() {
  //   vscode.postMessage({ command: "resetTask", taskId: taskId });
  // }

  function handleCreatePR() {
    vscode.postMessage({ command: "createPR" });
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "m") {
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
    if (taskId) {
      loadTask(taskId);
    }

    // handle rpc calls and notifications
    const handleNotification = (event: MessageEvent) => {
      const message = event.data;
      if (message.type === "notification") {
        console.log(
          `Webview received notification ${message.notificationType} -- ${message}`
        );
        switch (message.notificationType) {
          case "setPartialResponse":
            setTask(message.task);
            return;
        }
      }
    };

    window.addEventListener("message", extensionRPC.handleMessage);
    window.addEventListener("message", handleNotification);

    return () => {
      window.removeEventListener("message", extensionRPC.handleMessage);
      window.removeEventListener("message", handleNotification);
    };
  }, []);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const message = form.message.value;
    handleSendMessage("ask", message);
    form.reset();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
      <div className="mt-2 flex justify-between">
        {task && (
          <div className="p-2">
            <p className="text-sm font-semibold">{task.name}</p>
          </div>
        )}
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
      <div className="mb-16 rounded p-2 mx-auto">
        {task?.conversation.joules.map((joule, index) => (
          <JouleComponent
            key={index}
            joule={joule}
            isPartial={
              index === task.conversation.joules.length - 1 &&
              joule.author === "bot" &&
              joule.pseudoCommit.impl.status !== "committed"
            }
          />
        ))}
      </div>
      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 p-4 rounded-lg shadow-md">
        <form onSubmit={handleSubmit}>
          <div className="mt-4 flex">
            <Textarea
              placeholder="Tell me what to do! (⌘m)"
              id="message"
              autoFocus
              required
              rows={1}
              ref={inputRef}
              onKeyDown={handleKeyDown}
            />
          </div>
          <div className="flex justify-between space-x-2 mt-2">
            {/* <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={handleReset}
            >
              <RotateCcwIcon className="h-3 w-3" />
            </Button> */}
            <Button
              name="createPR"
              size="sm"
              type="button"
              onClick={handleCreatePR}
              variant="outline"
            >
              <GitPullRequestIcon className="h-4 w-4 mr-2" />
              Create PR
            </Button>
            <div className="space-x-2">
              <Button name="ask" size="sm" type="submit" variant="outline">
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
          </div>
        </form>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <main className="p-4">
        <nav className="mb-12 flex justify-between">
          <Link to="/">
            <Button variant="ghost" size="sm">
              Home
            </Button>
          </Link>
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
