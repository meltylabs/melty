import { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "./ui/card";
import { vscode } from "../utilities/vscode";

import { Button } from "./ui/button";

import { BrowserRouter as Router, Route, Routes, Link } from "react-router-dom";
import { convertChangesToXML } from "diff";

interface Task {
  id: string;
  name: string;
  description: string;
  status: string;
  github_link: string;
}

export function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    vscode.postMessage({
      command: "listTasks",
    });

    const messageListener = (event: MessageEvent) => {
      const message = event.data;
      console.log("tasks.tsx", message);
      if (message.command === "listTasks") {
        setTasks(message.tasks);
      }
    };

    window.addEventListener("message", messageListener);

    return () => {
      window.removeEventListener("message", messageListener);
    };
  }, []);

  return (
    <div>
      <Button
        onClick={() => {
          vscode.postMessage({
            command: "createNewTask",
            taskName: "New Task",
          });
        }}
      >
        Start new task
      </Button>
      <div className="grid grid-cols-2 gap-6 mt-4">
        {tasks.length === 0 && <p>No tasks</p>}
        {tasks.map((task) => (
          <Link to={`/task/${task.id}`} className="mr-4">
            <Card key={task.id}>
              <CardHeader>
                <CardTitle>{task.name}</CardTitle>
                <CardDescription>{task.github_link} </CardDescription>
              </CardHeader>
              <CardContent>
                <p>{task.description}</p>
              </CardContent>
              <CardFooter>
                <p> {task.status}</p>
              </CardFooter>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
