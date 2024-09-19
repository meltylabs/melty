import * as vscode from "vscode";
import { Joule, Conversation, TaskMode, DehydratedTask, JouleBotCode, nextJouleType } from "../types";
import * as conversations from "./conversations";
import * as joules from "./joules";
import * as utils from "../util/utils";
import { Vanilla } from "./assistants/vanilla";
import { Coder } from "./assistants/coder";
import * as config from "../util/config";
import { FileManager } from "../services/FileManager";
import * as datastores from "./datastores";
import { WebviewNotifier } from "../services/WebviewNotifier";
import { GitManager } from "../services/GitManager";
import { v4 as uuidv4 } from "uuid";
import { BaseAssistant } from 'backend/assistants/baseAssistant';

export function createNewDehydratedTask(name: string, taskMode: TaskMode, files: string[]): DehydratedTask {
	return {
		id: uuidv4(),
		name: name,
		branch: utils.meltyBranchNameFromTaskName(name),
		conversation: conversations.create(),
		createdAt: new Date(),
		updatedAt: new Date(),
		taskMode: taskMode,
		meltyMindFiles: files,
	};
}

/**
 * A Task manages the interaction between a conversation and a git repository
 */
export class Task {
	id: string;
	name: string;
	branch: string;
	conversation: Conversation;
	createdAt: Date;
	updatedAt: Date;
	taskMode: TaskMode;
	savedMeltyMindFiles: string[] = [];
	assistant: BaseAssistant;

	botTurnCancellationTokenSource: vscode.CancellationTokenSource | null = null;

	/**
	 * Private constructor for deserializing or creating new tasks
	 */
	private constructor(
		public dehydratedTask: DehydratedTask,
		private readonly _webviewNotifier: WebviewNotifier = WebviewNotifier.getInstance(),
		private readonly _fileManager: FileManager = FileManager.getInstance(),
		private readonly _gitManager: GitManager = GitManager.getInstance()
	) {
		this.id = dehydratedTask.id;
		this.name = dehydratedTask.name;
		this.branch = dehydratedTask.branch;
		this.conversation = dehydratedTask.conversation;
		this.createdAt = dehydratedTask.createdAt;
		this.updatedAt = dehydratedTask.updatedAt;
		this.taskMode = dehydratedTask.taskMode;
		switch (this.taskMode) {
			case "coder":
				this.assistant = new Coder();
				break;
			case "vanilla":
				this.assistant = new Vanilla();
				break;
			default:
				throw new Error(`Unknown assistant type: ${this.taskMode}`);
		}
	}

	updateLastModified() {
		this.updatedAt = new Date();
	}

	public addErrorJoule(message: string): void {
		// first, remove any bot joules
		const errorJoule = joules.createJouleError(
			`Melty encountered an error: ${message}. Try again?`
		);
		this.conversation = conversations.addJoule(this.conversation, errorJoule);
	}

	/**
	 * Lists Joules in a Task.
	 */
	public listJoules(): readonly Joule[] {
		return this.conversation.joules;
	}

	/**
	 * Adds a human message (and changes) to the conversation.
	 */
	private async respondHuman(message: string): Promise<Joule> {
		let newJoule: Joule;

		if (config.getIsAutocommitMode() && this.taskMode !== "vanilla") {
			// webviewNotifier.updateStatusMessage("Checking repo status");

			this._webviewNotifier.updateStatusMessage("Committing user's changes");
			const codeInfo = await this._gitManager.commitLocalChanges();
			this._webviewNotifier.resetStatusMessage();

			newJoule = joules.createJouleHumanChat(message, codeInfo);
		} else {
			newJoule = joules.createJouleHumanChat(message, null);
		}

		this.conversation = conversations.addJoule(this.conversation, newJoule);
		this.updateLastModified();

		datastores.dumpTaskToDisk(await this.dehydrate());

		this._webviewNotifier.resetStatusMessage();
		return conversations.lastJoule(this.conversation)!;
	}

	// TODO we need to implement something like
	// I think we should split human and bot apart, and so
	// rename startResponse to something else
	// it is a little weird that human response can be async, isn't it?
	// that doesn't fit in the model very well. it means a human joule
	// is not always easily applied. oh, well. I think we ignore that for now.
	// no stopping mid-human commit. that's a sacrifice we can make.

	// or: two-layer system where a joule has a status

	// public async progress() {
	// 	const lastJoule = conversations.lastJoule(this.conversation);
	// 	const jouleState = lastJoule?.jouleState || "complete";
	// 	if (jouleState !== "complete") {
	// 		throw new Error("can't progress incomplete joule");
	// 	}

	// 	const convoState = lastJoule?.convoState || "BotChat"; // as if the bot just sent a message
	// 	// todo: somehow ensure that this corresponds to stateMachineEdges defined in types.ts
	// 	switch (convoState) {
	// 		case "HumanChat":
	// 			botChat(this.conversation);
	// 			break;
	// 		case "HumanConfirmCode":
	// 			botCode(this.conversation);
	// 			break;
	// 		default:
	// 			throw new Error("unrecognized convoState case");
	// 	}
	// }

	public async humanConfirmCode(confirmed: boolean) {
		this.conversation = conversations.addJoule(
			this.conversation,
			joules.createJouleHumanConfirmCode(confirmed)
		);
		await this._webviewNotifier.sendNotification("updateTask", {
			task: this.dehydrateForWire(),
		});
	}

	/**
	 * Executes humanChat synchronously.
	 * New task comes back through notification.
	 */
	public async humanChat(text: string) {
		await this.respondHuman(text);
		await this._webviewNotifier.sendNotification("updateTask", {
			task: this.dehydrateForWire(),
		});
	}

	public startBotTurn(): void {
		const lastJoule = conversations.lastJoule(this.conversation);
		if (!lastJoule) {
			throw new Error("no last joule");
		}
		const jouleState = lastJoule?.jouleState;
		if (jouleState !== "complete") {
			throw new Error("can't progress incomplete joule");
		}

		// todo if multiple bot operations can happen back-to-back,
		// we'll need to add a loop somewhere
		this.startCancelableOperation(async (cancellationToken) => {
			const sendPartialJoule = (partialJoule: Joule) => {
				const dehydratedTask = this.dehydrateForWire();
				dehydratedTask.conversation = conversations.addJoule(this.conversation, partialJoule);
				this._webviewNotifier.sendNotification("updateTask", {
					task: dehydratedTask,
				});
			};

			try {
				const responder = this.assistant.responders.get(nextJouleType(lastJoule));
				if (!responder) {
					throw new Error(`No responder for ${nextJouleType(lastJoule)}`);
				}
				const newJoule = await responder(
					this.conversation,
					await this._fileManager.getContextPaths(),
					sendPartialJoule,
					cancellationToken
				);
				this.conversation = conversations.addJoule(this.conversation, newJoule);
			} catch (e) {
				vscode.window.showErrorMessage(`Error talking to the bot: ${e}`);
				const joule = joules.createJouleError("Error talking to the bot");
				this.conversation = conversations.addJoule(this.conversation, joule);
			}

			this.updateLastModified();

			datastores.dumpTaskToDisk(await this.dehydrate());

			this._webviewNotifier.sendNotification("updateTask", {
				task: this.dehydrateForWire(),
			});
			this._webviewNotifier.resetStatusMessage();

			// end running operation
			this.botTurnCancellationTokenSource = null;
		});
	}

	/**
	 * @returns whether launched successfully or not
	 */
	private startCancelableOperation(operation: (t: vscode.CancellationToken) => Promise<void>): boolean {
		this._webviewNotifier.updateStatusMessage("Starting up");

		if (this.botTurnCancellationTokenSource) {
			console.error("Response is already running");
			return false;
		}
		this.botTurnCancellationTokenSource = new vscode.CancellationTokenSource();
		const cancellationToken = this.botTurnCancellationTokenSource.token;

		operation(cancellationToken);

		return true;
	}

	public stopBotTurn(): void {
		if (this.botTurnCancellationTokenSource) {
			this.botTurnCancellationTokenSource.cancel();
			this.botTurnCancellationTokenSource = null;

			// TODO we need to wait until the operation is ACTUALLY cancelled before returning!
		} else {
			console.error("No response operation to stop");
		}
	}

	/**
	 * Leaves out the melty mind files
	 */
	public dehydrateForWire(): DehydratedTask {
		return {
			id: this.id,
			name: this.name,
			branch: this.branch,
			conversation: this.conversation,
			createdAt: this.createdAt,
			updatedAt: this.updatedAt,
			taskMode: this.taskMode,
			meltyMindFiles: [] // omit for wire
		};
	}

	public async dehydrate(): Promise<DehydratedTask> {
		return {
			id: this.id,
			name: this.name,
			branch: this.branch,
			conversation: this.conversation,
			createdAt: this.createdAt,
			updatedAt: this.updatedAt,
			taskMode: this.taskMode,
			meltyMindFiles: await this._fileManager.getMeltyMindFilesRelative()
		};
	}

	public static hydrate(dehydratedTask: DehydratedTask) {
		return new Task(dehydratedTask);
	}
}
