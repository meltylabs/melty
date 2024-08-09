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

import {
  Link,
  useNavigate,
} from "react-router-dom";

interface Task {
  id: string;
  name: string;
  branch: string;
  description: string;
}

export function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const navigate = useNavigate();
  const [extensionRPC] = useState(() => new ExtensionRPC());

  useEffect(() => {
    const fetchTasks = async () => {
      const tasks = await extensionRPC.run("listTasks") as Task[];
      console.log(`[Tasks] fetched ${tasks.length} tasks`);
      setTasks(tasks);
    }
    fetchTasks();

    window.addEventListener("message", extensionRPC.handleMessage);

    return () => {
      window.removeEventListener("message", extensionRPC.handleMessage);
    };
  }, []);

  return (
    <div>
      <Button
        onClick={async () => {
          // if we're not on the main branch, ask user to confirm
          // TODO: implement this

          const newTask = await extensionRPC.run("createNewTask", {
            name: ["Zucchini", "Rutabega", "Tomato", "Cucumber", "Celery", "Lemon", "Artichoke"][
              Math.floor(Math.random() * 7)
            ],
          }) as Task;

          console.log(`resolved new task ${newTask.id}`);

          navigate(`/task/${newTask.id}`);
        }}
      >
        + New task
      </Button>
      <div className="grid grid-cols-2 gap-6 mt-4">
        {tasks.length === 0 && <p>No tasks</p>}
        {tasks.reverse().map((task) => (
          <Link to={`/task/${task.id}`} className="mr-4">
            <Card key={task.id}>
              <CardHeader>
                <CardTitle>
                  {task.name}
                </CardTitle>
                <CardDescription>{task.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <p>{task.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div >
  );
}
