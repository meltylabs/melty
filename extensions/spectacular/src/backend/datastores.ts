import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { resolveTildePath } from "../util/utils";
import { DehydratedTask } from "types";

function getMeltyDir(): string {
	const config = vscode.workspace.getConfiguration('melty');
	const configuredPath = config.get<string>('storageDirectory') || "~/.melty";
	const resolvedPath = resolveTildePath(configuredPath);
	return resolvedPath;
}

export function loadTasksFromDisk(): Map<string, DehydratedTask> {
	const meltyDir = getMeltyDir();
	if (!fs.existsSync(meltyDir)) {
		return new Map();
	}

	const taskFiles = fs.readdirSync(meltyDir);
	const taskMap = new Map<string, DehydratedTask>();
	for (const file of taskFiles) {
		try {
			const rawTask = JSON.parse(
				fs.readFileSync(path.join(meltyDir, file), "utf8")
			);
			const task = Object.fromEntries(
				Object.entries(rawTask).filter(([key]) => [
					"id",
					"name",
					"branch",
					"conversation",
					"createdAt",
					"updatedAt",
					"taskMode",
					"meltyMindFiles"
				].includes(key))
			) as DehydratedTask;
			taskMap.set(task.id, task);
		} catch (e) {
			console.warn(`Error parsing task ${file}: ${e}`);
		}
	}
	return taskMap;
}

export async function dumpTaskToDisk(task: DehydratedTask): Promise<void> {
	const meltyDir = getMeltyDir();
	if (!fs.existsSync(meltyDir)) {
		fs.mkdirSync(meltyDir, { recursive: true });
	}

	const taskPath = path.join(meltyDir, `${task.id}.json`);
	fs.writeFileSync(taskPath, JSON.stringify(task, null, 2))
}

export async function deleteTaskFromDisk(task: DehydratedTask): Promise<void> {
	const meltyDir = getMeltyDir();
	const taskPath = path.join(meltyDir, `${task.id}.json`);

	if (fs.existsSync(taskPath)) {
		fs.unlinkSync(taskPath);
		console.log(`Deleted task file for task ${task.id}`);
	} else {
		console.log(`Task file for task ${task.id} not found, skipping deletion`);
	}
}
