import { Task } from "./tasks";
import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { resolveTildePath } from "../util/utils";

function getMeltyDir(): string {
  const config = vscode.workspace.getConfiguration('melty');
  const configuredPath = config.get<string>('storageDirectory') || "~/.melty";
  const resolvedPath = resolveTildePath(configuredPath);
  return resolvedPath;
}

export function loadTasksFromDisk(): Map<string, Task> {
  const meltyDir = getMeltyDir();
  if (!fs.existsSync(meltyDir)) {
    return new Map();
  }

  const taskFiles = fs.readdirSync(meltyDir);
  const taskMap = new Map<string, Task>();
  for (const file of taskFiles) {
    const taskData = JSON.parse(
      fs.readFileSync(path.join(meltyDir, file), "utf8")
    );
    const task = Task.deserialize(taskData);

    taskMap.set(task.id, task);
  }
  return taskMap;
}

export async function dumpTaskToDisk(task: Task): Promise<void> {
  const meltyDir = getMeltyDir();
  if (!fs.existsSync(meltyDir)) {
    fs.mkdirSync(meltyDir, { recursive: true });
  }

  const serializableTask = task.serialize();

  const taskPath = path.join(meltyDir, `${task.id}.json`);
  fs.writeFileSync(taskPath, JSON.stringify(serializableTask, null, 2));
}

export async function deleteTaskFromDisk(task: Task): Promise<void> {
  const meltyDir = getMeltyDir();
  const taskPath = path.join(meltyDir, `${task.id}.json`);

  if (fs.existsSync(taskPath)) {
    fs.unlinkSync(taskPath);
    console.log(`Deleted task file for task ${task.id}`);
  } else {
    console.log(`Task file for task ${task.id} not found, skipping deletion`);
  }
}
