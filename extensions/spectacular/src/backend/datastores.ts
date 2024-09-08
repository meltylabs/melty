import fs from "fs/promises";
import * as path from "path";
import * as vscode from "vscode";
import { isPathInside, resolveTildePath, isDirectory, isFile, pathExists } from "../util/utils";
import { DehydratedTask, JouleImage, UserAttachedImage } from "types";
import { v4 as uuidv4 } from "uuid";
import { LRUCache } from 'lru-cache';
import { IMAGE_CACHE_TTL_MS, MAX_IMAGES_TO_CACHE } from '../constants';

function getMeltyDir(): string {
	const config = vscode.workspace.getConfiguration('melty');
	const configuredPath = config.get<string>('storageDirectory') || "~/.melty";
	const resolvedPath = resolveTildePath(configuredPath);
	return resolvedPath;
}

export async function loadTasksFromDisk(): Promise<Map<string, DehydratedTask>> {
	const meltyDir = getMeltyDir();
	if (!(await pathExists(meltyDir))) {
		return new Map();
	}

	const taskFiles = await fs.readdir(meltyDir);
	const taskMap = new Map<string, DehydratedTask>();
	await Promise.all(taskFiles.map(async (file) => {
		const filePath = path.join(meltyDir, file);
		if ((await isDirectory(filePath))) {
			return;
		}

		const rawTask = JSON.parse(
			await fs.readFile(filePath, "utf8")
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
	}));

	return taskMap;
}

export async function dumpTaskToDisk(task: DehydratedTask): Promise<void> {
	const meltyDir = getMeltyDir();
	if (!(await pathExists(meltyDir))) {
		await fs.mkdir(meltyDir, { recursive: true });
	}

	const taskPath = path.join(meltyDir, `${task.id}.json`);
	await fs.writeFile(taskPath, JSON.stringify(task, null, 2));
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
