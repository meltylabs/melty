import { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "./ui/card";
import { ExtensionRPC } from "../extensionRPC";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Link, useNavigate } from "react-router-dom";

interface Task {
  id: string;
  name: string;
  branch: string;
  description: string;
}

export function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskMessage, setNewTaskMessage] = useState("");
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

  const createNewTask = async (message: string) => {
    const newTask = (await extensionRPC.run("createNewTask", {
      name: [
        "Zucchini",
        "Rutabega",
        "Tomato",
        "Cucumber",
        "Celery",
        "Lemon",
        "Artichoke",
      ][Math.floor(Math.random() * 7)],
    })) as Task;

    console.log(`resolved new task ${newTask.id}`);

    // Send the initial message
    await extensionRPC.run("chatMessage", {
      taskId: newTask.id,
      mode: "ask",
      text: message,
    });

    navigate(`/task/${newTask.id}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTaskMessage.trim()) {
      createNewTask(newTaskMessage.trim());
      setNewTaskMessage("");
    }
  };

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
      <Button
        onClick={async () => {
          // if we're not on the main branch, ask user to confirm
          // TODO: implement this

          const newTask = (await extensionRPC.run("createNewTask", {
            name: [
              "Zucchini",
              "Rutabega",
              "Tomato",
              "Cucumber",
              "Celery",
              "Lemon",
              "Artichoke",
            ][Math.floor(Math.random() * 7)],
          })) as Task;

          console.log(`resolved new task ${newTask.id}`);

          navigate(`/task/${newTask.id}`);
        }}
      >
        + New task
      </Button>
      <div className="grid grid-cols-2 gap-6 mt-4">
        {tasks.length === 0 && <p>No tasks</p>}
        {tasks.reverse().map((task) => (
          <Link to={`/task/${task.id}`} key={task.id} className="mr-4">
            <Card>
              <CardHeader>
                <CardTitle>{task.name}</CardTitle>
                <CardDescription>{task.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <p>{task.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
