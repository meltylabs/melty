import { Task } from "./tasks";
import * as fs from "fs";
import * as path from "path";

export function loadTasksFromDisk(gitRepoRoot: string): Map<string, Task> {
    const meltyDir = path.join(gitRepoRoot, ".melty");
    if (!fs.existsSync(meltyDir)) {
        return new Map();
    }

    const taskFiles = fs.readdirSync(meltyDir);
    const taskMap = new Map<string, Task>();
    for (const file of taskFiles) {
        // strip extension from file
        const taskId = path.parse(file).name;
        const conversation = JSON.parse(fs.readFileSync(path.join(meltyDir, file), "utf8"));
        const task = new Task(taskId, taskId); // TODO for now, use the id as the branch

        // hack in the conversation
        task.conversation = conversation;

        // add to map
        taskMap.set(task.id, task);
    }
    return taskMap;
}

export async function writeTaskToDisk(task: Task): Promise<void> {
    if (!task.gitRepo) {
        // this will occur if the task was never loaded. it's expected.
        console.log(`Not saving task ${task.id} to disk, no git repo found`);
        return;
    }

    // create a .melty directory in the repo root, if it doesn't exist
    const meltyDir = path.join(task.gitRepo!.rootPath, ".melty");
    if (!fs.existsSync(meltyDir)) {
        fs.mkdirSync(meltyDir);
    }

    // write the conversation there
    const conversationPath = path.join(meltyDir, `${task.id}.json`);
    fs.writeFileSync(conversationPath, JSON.stringify(task.conversation, null, 2));
}