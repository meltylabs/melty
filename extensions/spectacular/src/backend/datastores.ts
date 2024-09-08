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

	// remove the images in task conversation as well
	const images = task.conversation.joules.flatMap(j => j.images || []);
	await Promise.allSettled(images.map(async (image) => {
		deleteFromImageCache(image.path);
		if (image.path && (await isFile(image.path)) && isPathInside(image.path, meltyDir)) {
			await fs.unlink(image.path);
		} else {
			console.log(`Skipping deletion of image ${image.path}`);
		}
	}));

	if (await pathExists(taskPath)) {
		await fs.unlink(taskPath);
		console.log(`Deleted task file for task ${task.id}`);
	} else {
		console.log(`Task file for task ${task.id} not found, skipping deletion`);
	}
}

export async function saveJouleImagesToDisk(images: UserAttachedImage[]) {
	const meltyDir = getMeltyDir();
	const imagesDir = path.join(meltyDir, "assets", "images");
	if (!(await pathExists(imagesDir))) {
		await fs.mkdir(imagesDir, { recursive: true });
	}

	const imageData: JouleImage[] = await Promise.all(images.map(async (image) => {
		const imageId = uuidv4();
		const extension = image.mimeType.split("/")[1];
		const base64 = image.base64.replace(/^data:image\/\w+;base64,/, "");
		const buff = Buffer.from(base64, "base64");
		const imagePath = path.join(imagesDir, `${imageId}.${extension}`);
		await fs.writeFile(imagePath, buff);
		return {
			path: imagePath, mimeType: image.mimeType
		};
	}));

	return imageData;
}

const imageCache = new LRUCache<string, Buffer>({ max: MAX_IMAGES_TO_CACHE, ttl: IMAGE_CACHE_TTL_MS });

export async function readImageFromDisk(imagePath: string): Promise<{ buffer: Buffer, exists: boolean; }> {
	try {
		if (imageCache.has(imagePath)) {
			return {
				buffer: imageCache.get(imagePath)!,
				exists: true
			};
		}

		if (!await pathExists(imagePath)) {
			const buffer = Buffer.from('');
			imageCache.set(imagePath, buffer);
			return {
				buffer,
				exists: false,
			};
		}

		const buffer = await fs.readFile(imagePath);
		imageCache.set(imagePath, buffer);
		return {
			buffer,
			exists: true
		};
	} catch (error) {
		console.error(`Failed to read image from disk: ${error}`);
		return {
			buffer: Buffer.from(''),
			exists: false
		};
	}
}

// if imagePath is not provided, clear the entire cache
export function deleteFromImageCache(imagePath: string) {
	return imageCache.delete(imagePath);
}
