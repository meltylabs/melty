import React, { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { XIcon, ArrowUp, ArrowLeft, ArrowDown } from "lucide-react";
import { FilePicker } from "./FilePicker";
import { Textarea } from "./ui/textarea";
import { Task, AssistantType } from "../types";
import { RpcClient } from "../rpcClient";
import { JouleComponent } from "./JouleComponent";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

export function ConversationView() {
  const [rpcClient] = useState(() => new RpcClient());
  const { taskId } = useParams<{ taskId: string }>();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [meltyFiles, setMeltyFiles] = useState<string[]>([]);
  const [workspaceFiles, setWorkspaceFiles] = useState<string[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [task, setTask] = useState<Task | null>(null);
  const [messageText, setMessageText] = useState("");
  const conversationRef = useRef<HTMLDivElement>(null);
  const [latestCommitHash, setLatestCommitHash] = useState<string | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  async function handleAddFile(file: string) {
    const meltyFiles = await rpcClient.run("addMeltyFile", {
      filePath: file,
    });
    setMeltyFiles(meltyFiles);
    setPickerOpen(false);
  }

  async function handleDropFile(file: string) {
    const meltyFiles = await rpcClient.run("dropMeltyFile", {
      filePath: file,
    });
    setMeltyFiles(meltyFiles);
    setPickerOpen(false);
  }

  async function loadTask(taskId: string) {
    console.log("loading task ", taskId);
    const task = await rpcClient.run("loadTask", { taskId });
    setTask(task);
    await rpcClient.run("switchTask", { taskId });
  }

  async function loadFiles() {
    const meltyFiles = await rpcClient.run("listMeltyFiles");
    setMeltyFiles(meltyFiles);
    const workspaceFiles = await rpcClient.run("listWorkspaceFiles");
    setWorkspaceFiles(workspaceFiles);
  }

  function handleSendMessage(assistantType: AssistantType, text: string) {
    rpcClient.run("chatMessage", { assistantType, text });
  }

  async function handleCreatePR() {
    const result = await rpcClient.run("createPullRequest");
    console.log("PR created", result);
  }

  const checkScrollPosition = () => {
    if (conversationRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = conversationRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setIsAtBottom(isNearBottom);
    }
  };

  useEffect(() => {
    if (conversationRef.current) {
      conversationRef.current.scrollTop = conversationRef.current.scrollHeight;
    }
    checkScrollPosition();
  }, [task]);

  // Add a new effect to scroll to bottom when component mounts
  useEffect(() => {
    scrollToBottom();
  }, []);

  useEffect(() => {
    const conversationElement = conversationRef.current;
    if (conversationElement) {
      conversationElement.addEventListener("scroll", checkScrollPosition);
      return () =>
        conversationElement.removeEventListener("scroll", checkScrollPosition);
    }
  }, []);

  const scrollToBottom = () => {
    if (conversationRef.current) {
      conversationRef.current.scrollTop = conversationRef.current.scrollHeight;
    }
  };

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

    window.addEventListener("message", rpcClient.handleMessage);
    window.addEventListener("message", handleNotification);

    return () => {
      window.removeEventListener("message", rpcClient.handleMessage);
      window.removeEventListener("message", handleNotification);
    };
  }, []);

  useEffect(() => {
    const checkIfLatestCommit = async () => {
      const result = await rpcClient.run("getLatestCommit", {});
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
    <div className="flex flex-col h-screen">
      <h1>{taskId}</h1>
      <div className="mt-2 flex flex-col">
        {!isAtBottom && (
          <button
            onClick={scrollToBottom}
            className="fixed bottom-36 right-4 bg-black text-white p-2 rounded-full shadow-lg z-10"
          >
            <ArrowDown className="h-4 w-4" />
          </button>
        )}
        {task && (
          <div className="mb-2 flex items-center">
            <Link className="flex items-center" to={"/"}>
              <ArrowLeft className="h-4 w-4" />
              <kbd className="ml-1.5 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                ⌘<span className="text-[8px]">[</span>
              </kbd>
            </Link>
            <p className="text-sm font-semibold ml-2">{task.name}</p>
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
      </div>
      <div
        className="flex-grow mb-20 rounded overflow-y-auto"
        ref={conversationRef}
      >
        <div className="flex flex-col h-full">
          {task?.conversation.joules.map((joule, index) => (
            <JouleComponent
              key={index}
              joule={joule}
              latestCommitHash={latestCommitHash!}
              isPartial={joule.state === "partial"}
              showDiff={index !== 0} // Hide diff view for the first message
            />
          ))}
        </div>
      </div>
      <div className="mb-1.5">
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
                  <SelectItem value="vanilla">Vanilla Claude</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="absolute right-2 bottom-2">
              <span className="text-xs text-muted-foreground">
                <kbd className="ml-1.5 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                  <span className="text-xs">\</span>
                </kbd>{" "}
                to add a file
              </span>
            </div>
          </div>
        </form>
        <div className="mt-1">
          <div className="flex overflow-x-auto">
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
        </div>
      </div>
    </div>
  );
}
