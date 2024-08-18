import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "./ui/card";
import { RpcClient } from "../rpcClient";
import { Button } from "./ui/button";
import {
  ArrowUp,
  Trash2,
  CheckCircle,
  XCircle,
  LoaderCircle,
  XIcon,
} from "lucide-react";
import { FilePicker } from "./FilePicker";
import { MouseEvent, KeyboardEvent } from "react";
import "diff2html/bundles/css/diff2html.min.css";
import { Link, useNavigate } from "react-router-dom";
import { Textarea } from "./ui/textarea";
import { Task, AssistantType } from "../types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

// Utility function to format the date
function formatDate(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
  if (diffInSeconds < 3600)
    return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400)
    return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 604800)
    return `${Math.floor(diffInSeconds / 86400)} days ago`;

  return date.toLocaleDateString();
}

export function Tasks({
  initialMeltyMindFiles,
}: {
  initialMeltyMindFiles?: string[];
}) {
  const [rpcClient] = useState(() => new RpcClient());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [messageText, setMessageText] = useState("");
  const [gitConfigError, setGitConfigError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [workspaceFilePaths, setWorkspaceFilePaths] = useState<string[]>([]);
  const [meltyMindFilePaths, setMeltyMindFilePaths] = useState<string[]>(
    initialMeltyMindFiles || []
  );
  const [pickerOpen, setPickerOpen] = useState(false);

  const fetchTasks = useCallback(async () => {
    const fetchedTasks = (await rpcClient.run("listTasks")) as Task[];
    console.log(`[Tasks] fetched ${fetchedTasks.length} tasks`);
    const sortedTasks = fetchedTasks.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    setTasks(sortedTasks);
  }, [rpcClient]);

  const checkGitConfig = useCallback(async () => {
    const possibleError = await rpcClient.run("getGitConfigErrors");
    setGitConfigError(possibleError);
  }, [rpcClient]);

  const deleteTask = useCallback(
    async (taskId: string, e: MouseEvent) => {
      e.preventDefault(); // Prevent link navigation
      e.stopPropagation(); // Prevent event bubbling
      try {
        await rpcClient.run("deleteTask", { taskId });
        await fetchTasks();
        console.log("Task deleted successfully");
      } catch (error) {
        console.error("Failed to delete task:", error);
      }
    },
    [fetchTasks, rpcClient]
  );

  const createNewTask = async (taskName: string) => {
    console.log(`[Tasks] creating new task ${taskName}`);
    const newTaskId = (await rpcClient.run("createAndSwitchToTask", {
      name: taskName.trim(),
      files: meltyMindFilePaths,
    })) as string;
    console.log(`[Tasks] created new task ${newTaskId}`);
    navigate(`/task/${newTaskId}`);
  };

  function handleSendMessage(assistantType: AssistantType, text: string) {
    rpcClient.run("chatMessage", { assistantType, text });
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const form = event.target as HTMLFormElement;
    const message = messageText;
    const assistantType = form.assistantType.value as AssistantType;
    console.log(`[Tasks] to ${assistantType}`);
    let taskName = message.substring(0, 40);
    if (message.length > 40) {
      taskName = taskName + "...";
    }
    createNewTask(taskName);
    handleSendMessage(assistantType, message);
    setMessageText("");
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();

      if (event.currentTarget && event.currentTarget.value !== undefined) {
        const form = event.currentTarget.form;
        if (form) {
          const assistantType = form.assistantType.value as AssistantType;
          console.log(`[Tasks] to ${assistantType}`);
          let taskName = messageText.substring(0, 40);
          if (messageText.length > 40) {
            taskName = taskName + "...";
          }
          createNewTask(taskName);
          handleSendMessage(assistantType, messageText);
          setMessageText("");
        }
      }
    }
  };

  const fetchFilePaths = useCallback(async () => {
    const workspacePaths = await rpcClient.run("listWorkspaceFiles");
    setWorkspaceFilePaths(workspacePaths);

    if (!initialMeltyMindFiles) {
      const meltyMindPaths = await rpcClient.run("listMeltyFiles");
      setMeltyMindFilePaths(meltyMindPaths);
    }
  }, [rpcClient, initialMeltyMindFiles]);

  const handleAddFile = useCallback(
    async (filePath: string) => {
      const updatedMeltyFiles = await rpcClient.run("addMeltyFile", {
        filePath,
      });
      setMeltyMindFilePaths(updatedMeltyFiles);
      setPickerOpen(false);
    },
    [rpcClient]
  );

  async function handleDropFile(file: string) {
    const meltyFiles = await rpcClient.run("dropMeltyFile", {
      filePath: file,
    });
    setMeltyMindFilePaths(meltyFiles);
    setPickerOpen(false);
  }

  useEffect(() => {
    fetchTasks();
    checkGitConfig();
    fetchFilePaths();

    window.addEventListener("message", rpcClient.handleMessage);

    return () => {
      window.removeEventListener("message", rpcClient.handleMessage);
    };
  }, [fetchTasks, fetchFilePaths, checkGitConfig, rpcClient]);

  return (
    <div>
      <FilePicker
        open={pickerOpen}
        setOpen={setPickerOpen}
        meltyMindFilePaths={meltyMindFilePaths}
        workspaceFilePaths={workspaceFilePaths}
        handleAddFile={handleAddFile}
        handleDropFile={handleDropFile}
      />
      <form onSubmit={handleSubmit}>
        <div className="mt-4 relative">
          <Textarea
            placeholder="What are you trying to do?"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-grow p-3 pr-12"
            autoFocus
            required
            rows={6}
          />

          <div className="absolute right-2 top-2 flex gap-2">
            {messageText.trim() !== "" && (
              <button
                className="bg-black p-2 rounded-lg text-white"
                name="ask"
                type="submit"
              >
                <ArrowUp className="h-3 w-3" />
              </button>
            )}
          </div>

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
          {meltyMindFilePaths.map((file, i) => (
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

      <div className="grid md:grid-cols-2 grid-cols-1 gap-6 mt-4">
        {tasks.length === 0 && <p>No tasks</p>}
        {tasks.map((task) => (
          <div key={task.id} className="relative">
            <Link to={`/task/${task.id}`}>
              <Card>
                <CardHeader>
                  <CardTitle>{task.name}</CardTitle>
                  <CardDescription>{task.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p>{task.description}</p>
                  <p>{task.branch}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    Updated {formatDate(new Date(task.updatedAt))}
                  </p>
                </CardContent>
              </Card>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 p-1"
              onClick={(e) => deleteTask(task.id, e)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center">
        {gitConfigError === null ? (
          <>
            <LoaderCircle className="animate-spin text-gray-500 mr-2 h-4 w-4" />
            <span>Checking Git configuration...</span>
          </>
        ) : gitConfigError === "" ? (
          <>
            <CheckCircle className="text-green-500 mr-2 h-4 w-4" />
            <span>Git configured</span>
          </>
        ) : (
          <>
            <XCircle className="text-red-500 mr-2 h-4 w-4" />
            <span>Git configuration error: {gitConfigError}</span>
          </>
        )}
      </div>
    </div>
  );
}
