
import * as vscode from "vscode";
import { TaskMode, TasksPageRpcMethod, MeltyConfig, MeltyContext, DehydratedTask, RpcMethod } from "../types";
import { createNewDehydratedTask } from "../backend/tasks";
import { WebviewNotifier } from "../services/WebviewNotifier";
import { FileManager } from "../services/FileManager";
import { Coder } from "../backend/assistants/coder";
import { Vanilla } from "../backend/assistants/vanilla";
import { GitManager } from "../services/GitManager";
import { GitHubManager } from '../services/GitHubManager';
import { TaskManager } from '../services/TaskManager';
import { MeltycatService } from '../services/MeltycatService';

/**
 * Do not create an instance of this class until ContextProvider is initialized.
 */
export class TasksPage {
	private static instance: TasksPage | null = null;

	constructor(
		private readonly _gitManager: GitManager = GitManager.getInstance(),
		private readonly _gitHubManager: GitHubManager = GitHubManager.getInstance(),
		private readonly _taskManager: TaskManager = TaskManager.getInstance(),
		private readonly _fileManager: FileManager = FileManager.getInstance(),
		private readonly _webviewNotifier: WebviewNotifier = WebviewNotifier.getInstance(),
		private readonly _meltycatService: MeltycatService = MeltycatService.getInstance()
	) {
		this._taskManager.loadTasks();
		this._meltycatService.start();
	}

	public static getInstance(): TasksPage {
		if (!TasksPage.instance) {
			TasksPage.instance = new TasksPage();
		}
		return TasksPage.instance;
	}

	public async deactivateTasks() {
		const activeTaskId = this._taskManager.getActiveTaskId();
		if (activeTaskId) {
			await this._taskManager.deactivate(activeTaskId);
		}
		await this._taskManager.dumpTasks();
	}

	public async handleRPCCall(method: TasksPageRpcMethod, params: any): Promise<any> {
		try {
			switch (method) {
				case "getActiveTask":
					return await this.rpcGetActiveTask(params.taskId);
				case "listMeltyFiles":
					return await this.rpcListMeltyFiles();
				case "listWorkspaceFiles":
					return await this.rpcListWorkspaceFiles();
				case "addMeltyFile":
					return await this.rpcAddMeltyFile(params.filePath);
				case "dropMeltyFile":
					return await this.rpcDropMeltyFile(params.filePath);
				case "undoLatestCommit":
					return await this.rpcUndoLatestCommit(params.commitId);
				case "getLatestCommit":
					return this.rpcGetLatestCommit();
				case "startBotTurn":
					this.rpcStartBotTurn(
						params.taskId
					);
					return undefined;
				case "createJouleHumanChat":
					return this.rpcJouleHumanChat(params.taskId, params.text);
				case "createJouleHumanConfirmCode":
					return this.rpcJouleHumanConfirmCode(params.taskId, params.confirmed);
				case "createTask":
					return await this.rpcCreateTask(
						params.name,
						params.taskMode,
						params.files
					);
				case "listTaskPreviews":
					return this.rpcListTaskPreviews();
				case "activateTask":
					return await this.rpcActivateTask(params.taskId);
				case "deactivateTask":
					return await this.rpcDeactivateTask(params.taskId);
				case "createPullRequest":
					return await this.rpcCreatePullRequest();
				case "deleteTask":
					return await this.rpcDeleteTask(params.taskId);
				case "getAssistantDescription":
					return await this.rpcGetAssistantDescription(params.assistantType);
				default:
					throw new Error(`Unknown RPC method: ${method}`);
			}
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);

			if (method === "startBotTurn") {
				// TODO revisit error handling for rpcHumanChat
				await this.notifyWebviewOfChatError(params.taskId, errorMessage);
				await this._webviewNotifier.resetStatusMessage();
			}

			throw error;
		}
	}

	private async notifyWebviewOfChatError(taskId: string, message: string) {
		const task = this._taskManager.getActiveTask(taskId)!;
		if (task === null) {
			console.warn(`Couldn't notify webview of error because task ${taskId} was not active`);
		}
		task.addErrorJoule(message);
		await this._webviewNotifier.sendNotification("updateTask", {
			task: task.dehydrateForWire(),
		});
	}

	private async rpcGetAssistantDescription(
		taskMode: TaskMode
	): Promise<string> {
		switch (taskMode) {
			case "coder":
				return Coder.description;
			case "vanilla":
				return Vanilla.description;
			default:
				throw new Error(`Unknown assistant type: ${taskMode}`);
		}
	}

	private async rpcGetActiveTask(taskId: string): Promise<DehydratedTask | undefined> {
		const task = this._taskManager.getActiveTask(taskId);
		if (!task) {
			vscode.window.showErrorMessage(`Failed to get active task ${taskId}`);
		}
		return task!.dehydrate();
	}

	private async rpcListMeltyFiles(): Promise<string[]> {
		const meltyMindFilePaths = this._fileManager!.getMeltyMindFilesRelative();
		return Promise.resolve(meltyMindFilePaths);
	}

	private async rpcListWorkspaceFiles(): Promise<string[]> {
		const workspaceFilePaths =
			await this._fileManager!.getWorkspaceFilesRelative();
		return workspaceFilePaths;
	}

	private async rpcAddMeltyFile(filePath: string): Promise<string[]> {
		await this._fileManager!.addMeltyMindFile(filePath, false);
		console.log(`Added ${filePath} to Melty's Mind`);
		return this._fileManager!.getMeltyMindFilesRelative();
	}

	private async rpcDropMeltyFile(filePath: string): Promise<string[]> {
		this._fileManager!.dropMeltyMindFile(filePath);
		console.log(`Removed ${filePath} from Melty's Mind`);
		return await this._fileManager!.getMeltyMindFilesRelative();
	}

	private async rpcCreateTask(
		name: string,
		taskMode: TaskMode,
		files: string[]
	): Promise<string> {
		const task = await createNewDehydratedTask(name, taskMode, files);
		this._taskManager.add(task);
		return task.id;
	}

	public rpcListTaskPreviews(): DehydratedTask[] {
		return this._taskManager.listInactiveTasks();
	}

	private async rpcCreatePullRequest(): Promise<void> {
		await this._gitHubManager.createPullRequest();
	}

	private async rpcDeleteTask(taskId: string): Promise<void> {
		const err = await this._taskManager.delete(taskId);
		if (err) {
			vscode.window.showErrorMessage("Error deleting task: " + err);
		}
	}

	public rpcGetLatestCommit(): string | undefined {
		return this._gitManager.getLatestCommitHash();
	}

	private async rpcUndoLatestCommit(commitId: string): Promise<void> {
		const errMessage = await this._gitManager.undoLastCommit(commitId);
		if (errMessage === null) {
			vscode.window.showInformationMessage(
				"Last commit has been undone by hard reset."
			);
		} else {
			vscode.window.showErrorMessage(errMessage);
		}
	}

	private async rpcDeactivateTask(taskId: string): Promise<boolean> {
		const errMessage = await this._taskManager.deactivate(taskId);
		if (errMessage) {
			vscode.window.showErrorMessage(`Failed to deactivate task ${taskId}: ${errMessage}`);
			return false;
		}
		return false;
	}

	private async rpcActivateTask(taskId: string): Promise<boolean> {
		const errorMessage = await this._taskManager.activate(taskId);
		if (errorMessage) {
			vscode.window.showErrorMessage(`Failed to activate task ${taskId}: ${errorMessage}`);
			return false;
		}
		return true;
	}

	private async rpcJouleHumanConfirmCode(taskId: string, confirmed: boolean): Promise<void> {
		const task = this._taskManager.getActiveTask(taskId)!;
		if (!task) {
			throw new Error(`Tried to interact with an inactive task ${taskId} (active task is ${this._taskManager.getActiveTaskId()})`);
		}
		await task.humanConfirmCode(confirmed);
	}

	private async rpcJouleHumanChat(taskId: string, text: string): Promise<void> {
		const task = this._taskManager.getActiveTask(taskId)!;
		if (!task) {
			throw new Error(`Tried to chat with an inactive task ${taskId} (active task is ${this._taskManager.getActiveTaskId()})`);
		}
		await task.humanChat(text);
	}

	public rpcStartBotTurn(taskId: string) {
		const task = this._taskManager.getActiveTask(taskId)!;
		if (!task) {
			throw new Error(`Tried to interact with an inactive task ${taskId} (active task is ${this._taskManager.getActiveTaskId()})`);
		}
		task.startBotTurn();
	}

	private async rpcStopResponse(taskId: string): Promise<void> {
		const task = this._taskManager.getActiveTask(taskId)!;
		if (!task) {
			throw new Error(`Tried to stop operation with an inactive task ${taskId}`);
		}
		task.stopBotTurn();
	}
}
