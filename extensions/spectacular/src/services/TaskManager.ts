import { Task } from "../backend/tasks";
import { GitManager } from "./GitManager";
import * as datastores from "../backend/datastores";
import { FileManager } from './FileManager';
import { DehydratedTask } from 'types';

export class TaskManager {
	private static instance: TaskManager | null = null;
	private inactiveTasks: Map<string, DehydratedTask> = new Map();
	private activeTask: Task | null = null;

	private constructor(
		private readonly _gitManager: GitManager = GitManager.getInstance(),
		private readonly _fileManager: FileManager = FileManager.getInstance()
	) { }

	public static getInstance(): TaskManager {
		if (!TaskManager.instance) {
			TaskManager.instance = new TaskManager();
		}
		return TaskManager.instance;
	}

	public add(task: DehydratedTask): void {
		this.inactiveTasks.set(task.id, task);
	}

	/**
	 * Activate a task.
	 * @returns an error
	 */
	public async activate(taskId: string): Promise<string | undefined> {
		const dehydratedTask = this.inactiveTasks.get(taskId);

		if (!dehydratedTask) {
			return "Task not found";
		}

		if (this.activeTask) {
			return "Can't switch tasks while a task is active";
		}

		// // put disk in right state
		// this._gitManager.checkoutBranch(dehydratedTask.branch);

		// activate the task
		this.activeTask = Task.hydrate(dehydratedTask);
		this.inactiveTasks.delete(taskId);

		// load meltyMindFiles into file manager
		this._fileManager.loadMeltyMindFiles(dehydratedTask.meltyMindFiles);

		console.log(`[TaskManager] activated task ${taskId}`);
	}

	/**
	 * Load tasks from disk. This should only be called once, when the extension is first loaded.
	 */
	public loadTasks(): boolean {
		if (this.inactiveTasks.size > 0) {
			console.error("Can't load tasks when tasks already exist");
			return false;
		}
		this.inactiveTasks = datastores.loadTasksFromDisk();
		return true;
	}

	/**
	 * Optimization to try to make Tasks page faster
	 */
	public listInactiveTasks(): DehydratedTask[] {
		const tasks = Array.from(this.inactiveTasks.values());
		// for (const task of tasks) {
		// 	task.conversation = { joules: [] };
		// }
		return tasks;
	}

	public getTask(taskId: string): DehydratedTask | undefined {
		return this.inactiveTasks.get(taskId);
	}

	public getActiveTask(taskId: string): Task | null {
		if (taskId !== this.activeTask?.id) {
			return null;
		}
		return this.activeTask;
	}

	public getActiveTaskId(): string | null {
		return this.activeTask?.id || null;
	}

	/**
	 * @returns string = error, undefined = success
	 */
	public async deactivate(taskId: string): Promise<string | undefined> {
		if (!this.activeTask) {
			return "No active task";
		}
		if (this.activeTask.id !== taskId) {
			return "Deactivating inactive task";
		}

		const meltyMindFiles = await this._fileManager.getMeltyMindFilesRelative();
		if (meltyMindFiles) {
			this.activeTask.savedMeltyMindFiles = meltyMindFiles;
		}

		// update the dehydrated representation of the task
		this.inactiveTasks.set(taskId, await this.activeTask.dehydrate());

		this.activeTask = null;
		console.log(`[TaskManager] deactivated task ${taskId}`);
	}

	public async delete(taskId: string): Promise<string | null> {
		const task = this.inactiveTasks.get(taskId);
		if (!task) {
			return `Task with id ${taskId} not found`;
		}

		if (taskId === this.activeTask?.id) {
			await this.deactivate(taskId);
		}

		// Remove the task from the map
		this.inactiveTasks.delete(taskId);

		// Delete the task from disk
		await datastores.deleteTaskFromDisk(task);

		return null;
	}

	public async dumpTasks() {
		if (this.activeTask) {
			console.warn("Dumping while a task is active");
		}
		for (const task of this.inactiveTasks.values()) {
			await datastores.dumpTaskToDisk(task);
		}
	}
}
