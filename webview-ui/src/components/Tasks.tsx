import { useState, useEffect } from "react";
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    CardFooter,
} from "./ui/card";
import { ExtensionRPC } from "../extensionRPC";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Trash2 } from "lucide-react";
import { MouseEvent } from "react";
import * as Diff2Html from "diff2html";
import "diff2html/bundles/css/diff2html.min.css";
import Diff2HtmlComponent from "./DiffViewer";
import { Link, useNavigate } from "react-router-dom";
interface Task {
    id: string;
    name: string;
    branch: string;
    description: string;
}

export function Tasks() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [newTaskName, setNewTaskName] = useState("");
    const navigate = useNavigate();
    const [extensionRPC] = useState(() => new ExtensionRPC());

    useEffect(() => {
        const fetchTasks = async () => {
            const tasks = (await extensionRPC.run("listTasks")) as Task[];
            console.log(`[Tasks] fetched ${tasks.length} tasks`);
            setTasks(tasks);
        };
        fetchTasks();

        window.addEventListener("message", extensionRPC.handleMessage);

        return () => {
            window.removeEventListener("message", extensionRPC.handleMessage);
        };
    }, []);

    const deleteTask = async (taskId: string, e: MouseEvent) => {
        e.preventDefault(); // Prevent link navigation
        e.stopPropagation(); // Prevent event bubbling
        try {
            await extensionRPC.run("deleteTask", { taskId });
            setTasks(tasks.filter((task) => task.id !== taskId));
            console.log("Task deleted successfully");
        } catch (error) {
            console.error("Failed to delete task:", error);
        }
    };

    const createNewTask = async () => {
        if (newTaskName.trim()) {
            const newTask = (await extensionRPC.run("createNewTask", {
                name: newTaskName.trim(),
            })) as Task;

            console.log(`resolved new task ${newTask.id}`);
            setNewTaskName(""); // Clear the input after creating the task
            navigate(`/task/${newTask.id}`);
        }
    };
    const dummyDiff =
        "diff --git a/src/main.py b/src/main.py\nindex 3333333..4444444 100644\n--- a/main.py\n+++ b/main.py\n@@ -1,7 +1,7 @@\n def main():\n     print('Hello, world!')\n\nif __name__ == '__main__':\n    main()\n\ndiff --git a/utils.py b/utils.py\nindex 5555555..6666666 100644\n--- a/utils.py\n+++ b/utils.py\n@@ -1,5 +1,6 @@\n def helper_function():\n     return 'I am a helper'\n+\ndef another_helper():\n+    return 'I am another helper'\n\ndiff --git a/README.md b/README.md\nindex 7777777..8888888 100644\n--- a/README.md\n+++ b/README.md\n@@ -1,3 +1,4 @@\n # My Project\n\n This is a sample project.\n+It now has more files and functionality.";

    const dummyMessages = [
        {
            sender: "bot",
            message: "hello",
        },
        {
            sender: "human",
            message: "coooool",
        },
    ];
    return (
        <div>
            {/* <form onSubmit={handleSubmit} className="mb-4">
        <div className="flex space-x-2">
          <Input
            type="text"
            value={newTaskMessage}
            onChange={(e) => setNewTaskMessage(e.target.value)}
            placeholder="Type a message to create a new task"
            className="flex-grow"
          />
          <Button type="submit">Create Task</Button>
        </div>
      </form> */}

            {/* <div className="grid grid-cols-2">
        <div className="">
          <div className="overflow-y-scroll ">
            <Diff2HtmlComponent diff={dummyDiff} />
          </div>
        </div>

        <div className="space-y-2 overflow-y-auto">
          {dummyMessages.map((message) => (
            <div className="bg-gray-100" key={message.message}>
              <p>{message.message}</p>
            </div>
          ))}
        </div>
      </div> */}

            <div className="flex space-x-2 mb-4">
                <Input
                    type="text"
                    value={newTaskName}
                    onChange={(e) => setNewTaskName(e.target.value)}
                    placeholder="Enter task name"
                    className="flex-grow"
                />
                <Button onClick={createNewTask}>
                    + New task
                </Button>
            </div>
            <div className="grid grid-cols-2 gap-6 mt-4">
                {tasks.length === 0 && <p>No tasks</p>}
                {tasks.reverse().map((task) => (
                    <div key={task.id} className="mr-4 relative">
                        <Link to={`/task/${task.id}`}>
                            <Card>
                                <CardHeader>
                                    <CardTitle>{task.name}</CardTitle>
                                    <CardDescription>
                                        {task.description}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <p>{task.description}</p>
                                </CardContent>
                            </Card>
                        </Link>
                        <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2"
                            onClick={(e) => deleteTask(task.id, e)}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                ))}
            </div>
        </div>
    );
}
