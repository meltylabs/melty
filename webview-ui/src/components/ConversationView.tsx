import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { XIcon, GitPullRequestIcon, ArrowUp } from "lucide-react";
import { FilePicker } from "./FilePicker";
import { Textarea } from "./ui/textarea";
import { Task, AssistantType } from "../types";
import { ExtensionRPC } from "../extensionRPC";
import { JouleComponent } from "./JouleComponent";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

export function ConversationView() {
  const [extensionRPC] = useState(() => new ExtensionRPC());
  const { taskId } = useParams<{ taskId: string }>();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [meltyFiles, setMeltyFiles] = useState<string[]>([]);
  const [workspaceFiles, setWorkspaceFiles] = useState<string[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [task, setTask] = useState<Task | null>(null);
  const [messageText, setMessageText] = useState("");
  const conversationRef = useRef<HTMLDivElement>(null);
  const [latestCommitHash, setLatestCommitHash] = useState<string | null>(null);

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
    const task = await extensionRPC.run("loadTask", { taskId });
    setTask(task);
    await extensionRPC.run("switchTask", { taskId });
  }

  async function loadFiles() {
    const meltyFiles = await extensionRPC.run("listMeltyFiles");
    setMeltyFiles(meltyFiles);
    const workspaceFiles = await extensionRPC.run("listWorkspaceFiles");
    setWorkspaceFiles(workspaceFiles);
  }

  function handleSendMessage(assistantType: AssistantType, text: string) {
    extensionRPC.run("chatMessage", { assistantType, text });
  }

  async function handleCreatePR() {
    const result = await extensionRPC.run("createPullRequest");
    console.log("PR created", result);
  }

  useEffect(() => {
    if (conversationRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = conversationRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

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

    const handleNotification = (event: MessageEvent) => {
      const message = event.data;
      if (message.type === "notification") {
        console.log(
          "[ConversationView.tsx] Webview received notification message",
          message
        );
        switch (message.notificationType) {
          case "updateTask":
            console.log(
              "[ConversationView.tsx] updateTask",
              message.task === task
            );
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

  useEffect(() => {
    const checkIfLatestCommit = async () => {
      const result = await extensionRPC.run("getLatestCommit", {});
      setLatestCommitHash(result);
    };

    checkIfLatestCommit();
  }, [task]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const message = form.message.value;
    const assistantType = form.assistantType.value as AssistantType;
    handleSendMessage(assistantType, message);
    setMessageText("");
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
          setMessageText("");
          event.currentTarget.value = "";
        }
      }
    }
  };

  return (
    <div className="p-4 flex flex-col h-screen">
      <div className="mt-2 flex flex-col">
        {task && (
          <div className="mb-4">
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

        <div className="mt-4">
          <p className="text-xs text-muted-foreground mb-2 flex items-center">
            Melty's Mind
            <kbd className="ml-1.5 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
              <span className="text-xs">\</span>
            </kbd>
          </p>
          {meltyFiles.length === 0 ? (
            <p className="text-xs text-muted-foreground mb-2 italic">
              Melty can't see any files yet
            </p>
          ) : (
            <div className="flex flex-wrap">
              {meltyFiles.map((file, i) => (
                <button
                  onClick={() => handleDropFile(file)}
                  className="mt-1 text-xs text-muted-foreground mr-2 mb-2 bg-gray-100 px-2 py-1 inline-flex items-center rounded"
                  key={`file-${i}`}
                >
                  <XIcon className="h-3 w-3 mr-2" />
                  {file}
                </button>
              ))}
            </div>
          )}
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
              latestCommitHash={latestCommitHash!}
              isPartial={
                index === task.conversation.joules.length - 1 &&
                joule.author === "bot" &&
                joule.pseudoCommit.impl.status !== "committed"
              }
            />
          ))}
        </div>
      </div>
      <div className="mb-16">
        <form onSubmit={handleSubmit}>
          <div className="mt-4 relative">
            <Textarea
              placeholder="Talk to Melty"
              id="message"
              className="p-3 pr-12"
              autoFocus
              required
              rows={4}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={handleKeyDown}
            />

            {messageText.trim() !== "" && (
              <div
                className={`absolute right-2 top-2 transition-opacity duration-300 ${
                  messageText.trim() !== "" ? "opacity-100" : "opacity-0"
                }`}
              >
                <button
                  className="bg-black p-2 rounded-lg text-white"
                  name="ask"
                  type="submit"
                >
                  <ArrowUp className="h-3 w-3" />
                </button>
              </div>
            )}

            <div className="absolute left-2 bottom-2">
              <Select name="assistantType" defaultValue="coder">
                <SelectTrigger>
                  <SelectValue placeholder="Select an assistant" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="coder">Coder</SelectItem>
                  <SelectItem value="architect">Architect</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
