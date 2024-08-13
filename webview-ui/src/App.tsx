import React, { useState, useEffect, useRef } from "react";
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
import { FilePicker } from "./components/FilePicker";
import { Button } from "./components/ui/button";
import { Textarea } from "./components/ui/textarea";
import { Label } from "./components/ui/label";
import { RadioGroup, RadioGroupItem } from "./components/ui/radio-group";

import { Tasks } from "./components/Tasks";
import { Task, Joule, AssistantType } from "./types";
import CopyButton from "./components/CopyButton";
import "./App.css";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { ExtensionRPC } from "./extensionRPC";
import DiffViewer from "./components/DiffViewer";

function JouleComponent({
  joule,
  isPartial = false,
}: {
  joule: Joule;
  isPartial?: boolean;
}) {
  const diffHtml =
    joule.pseudoCommit.impl.status === "committed" &&
    joule.pseudoCommit.impl.udiffPreview
      ? joule.pseudoCommit.impl.udiffPreview
      : null;

  return (
    <div
      className={`flex mb-2 p-3 rounded ${
        joule.author === "human" ? "bg-gray-50" : "bg-white"
      }`}
    >
      <div className="w-[40%] pr-4 overflow-auto h-full">
        <div className="text-xs prose">
          <ReactMarkdown
            components={{
              code({ node, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || "");
                if (match && match[1] === "codechange") {
                  return (
                    <details>
                      <summary>Writing code...</summary>
                      <pre
                        {...(props as React.DetailedHTMLProps<
                          React.HTMLAttributes<HTMLPreElement>,
                          HTMLPreElement
                        >)}
                      >
                        <code className={className}>{children}</code>
                      </pre>
                    </details>
                  );
                }
                return match ? (
                  <div className="relative p-0 max-h-[300px] overflow-y-auto">
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
      </div>
      <div className="w-[60%] overflow-auto h-full">
        {diffHtml && !isPartial && <DiffViewer diff={diffHtml} />}
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
  const conversationRef = useRef<HTMLDivElement>(null);

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

  function handleSendMessage(assistantType: AssistantType, text: string) {
    extensionRPC.run("chatMessage", { assistantType, text });
    // response will be returned asynchronously through notifications
  }

  async function handleCreatePR() {
    const result = await extensionRPC.run("createPullRequest");
    console.log("PR created", result);
  }

  // auto scroll to bottom if already near bottom
  useEffect(() => {
    if (conversationRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = conversationRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100; // within 100px of bottom

      if (isNearBottom) {
        conversationRef.current.scrollTop = scrollHeight;
      }
    }
  }, [task]);

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
        console.log("[App.tsx] Webview received notification message", message);
        switch (message.notificationType) {
          case "updateTask":
            console.log("[App.tsx] updateTask", message.task === task);
            setTask(message.task);
            return;
          case "updateWorkspaceFiles":
            setWorkspaceFiles(message.files);
            return;
          case "updateMeltyMindFiles":
            setMeltyFiles(message.files);
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
    const assistantType = form.assistantType.value as AssistantType;
    handleSendMessage(assistantType, message);
    form.reset();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (event.currentTarget && event.currentTarget.value !== undefined) {
        const form = event.currentTarget.form;
        if (form) {
          const assistantType = form.assistantType.value as AssistantType;
          handleSendMessage(assistantType, event.currentTarget.value);
          event.currentTarget.value = "";
        }
      }
    }
  };

  return (
    <div className="p-4 flex flex-col h-screen">
      <div className="mt-2 justify-between">
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
      <div
        className="flex-grow mb-20 rounded p-2 overflow-y-auto"
        ref={conversationRef}
      >
        <div className="flex flex-col h-full">
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
      </div>
      <div className="">
        <form onSubmit={handleSubmit}>
          <RadioGroup name="assistantType" defaultValue="coder">
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="coder" id="coder" />
              <Label htmlFor="coder">Coder</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="architect" id="architect" />
              <Label htmlFor="architect">Architect</Label>
            </div>
          </RadioGroup>

          <div className="mt-4 flex">
            <Textarea
              placeholder="Tell me what to do (⌘m)"
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
                Go{" "}
                <kbd className="ml-1.5 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded px-1.5 font-mono text-[10px] font-medium text-black opacity-100">
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
        <nav className="mb-4 flex justify-between">
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
