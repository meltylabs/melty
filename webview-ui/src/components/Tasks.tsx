import { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "./ui/card";
import { BrowserRouter as Router, Route, Routes, Link } from "react-router-dom";

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  github_link: string;
}

export function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([
    {
      id: "1",
      title: "Task 1",
      description: "Description 1",
      status: "merged",
      github_link: "https://github.com/cbh123/melty/pull/1",
    },
    {
      id: "2",
      title: "Task 2",
      description: "Description 2",
      status: "merged",
      github_link: "https://github.com/cbh123/melty/pull/2",
    },
    {
      id: "3",
      title: "Task 3",
      description: "Description 3",
      status: "pending",
      github_link: "https://github.com/cbh123/melty/pull/3",
    },
  ]);
  return (
    <div className="grid grid-cols-2 gap-6">
      {tasks.map((task) => (
        <Link to="/" className="mr-4">
          <Card key={task.id}>
            <CardHeader>
              <CardTitle>{task.title}</CardTitle>
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
  );
}
