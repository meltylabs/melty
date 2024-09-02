import * as vscode from "vscode";
import { Joule, Conversation, TaskMode, DehydratedTask } from "../types";
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

const webviewNotifier = WebviewNotifier.getInstance();

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

	inFlightOperationCancellationTokenSource: vscode.CancellationTokenSource | null = null;

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
	}

	updateLastModified() {
		this.updatedAt = new Date();
	}

	public addErrorJoule(message: string): void {
		// first, remove any bot joules
		this.conversation = conversations.forceReadyForResponseFrom(
			this.conversation,
			"bot"
		);
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
	 * Adds a bot message (and changes) to the conversation.
	 *
	 * @param contextPaths - the paths to the files in the context of which to respond (melty's mind)
	 * @param mode - the mode of the assistant to use
	 * @param processPartial - a function to process the partial joule
	 */
	private async respondBot(
		processPartial: (partialConversation: Conversation) => void,
		cancellationToken?: vscode.CancellationToken,
	): Promise<void> {
		try {
			webviewNotifier.updateStatusMessage("Checking repo status");

			// TODOREFACTOR ensure working directory clean

			webviewNotifier.resetStatusMessage();

			let assistant;
			switch (this.taskMode) {
				case "coder":
					assistant = new Coder();
					break;
				case "vanilla":
					assistant = new Vanilla();
					break;
				default:
					throw new Error(`Unknown assistant type: ${this.taskMode}`);
			}

			const meltyMindFiles =
				await this._fileManager.getMeltyMindFilesRelative();

			// just in case something's gone terribly wrong
			this.conversation = conversations.forceReadyForResponseFrom(
				this.conversation,
				"bot"
			);
			this.conversation = await assistant.respond(
				this.conversation,
				{ // TODOREFACTOR use ContextPaths object up the chain
					paths: meltyMindFiles,
					meltyRoot: this._gitManager.getMeltyRoot()
				},
				processPartial,
				cancellationToken
			);

			webviewNotifier.updateStatusMessage(
				"Adding edited files to Melty's Mind"
			);
			const lastJoule = conversations.lastJoule(this.conversation)!;
			if (lastJoule.diffInfo?.filePathsChanged) {
				// add any edited files to melty's mind
				lastJoule.diffInfo.filePathsChanged.forEach((editedFile) => {
					this._fileManager.addMeltyMindFile(editedFile, true);
				});
			}

			webviewNotifier.updateStatusMessage("Autosaving conversation");
			this.updateLastModified();
			await datastores.dumpTaskToDisk(await this.dehydrate());
		} catch (e) {
			if (config.DEV_MODE) {
				throw e;
			} else {
				vscode.window.showErrorMessage(`Error talking to the bot: ${e}`);
				const message = "[  Error :(  ]";
				const joule = joules.createJouleBot(
					message,
					{
						rawOutput: message,
						contextPaths: { paths: [], meltyRoot: '' },
					},
					"complete"
				);
				this.conversation = conversations.addJoule(this.conversation, joule);
			}
		}
	}

	/**
	 * Adds a human message (and changes) to the conversation.
	 */
	private async respondHuman(message: string): Promise<Joule> {
		this.conversation = conversations.forceReadyForResponseFrom(
			this.conversation,
			"human"
		);

		let newJoule: Joule;

		if (config.getIsAutocommitMode() && this.taskMode !== "vanilla") {
			webviewNotifier.updateStatusMessage("Checking repo status");
			let didCommit = false;
			webviewNotifier.updateStatusMessage("Committing user's changes");
			didCommit = await this._gitManager.commitLocalChanges() > 0;
			webviewNotifier.resetStatusMessage();

			const latestCommit = await this._gitManager.getLatestCommitHash();
			const diffPreview = latestCommit ? await this._gitManager.getUdiffFromCommit(latestCommit) : '';

			const diffInfo = {
				filePathsChanged: null,
				diffPreview: diffPreview || "",
			};

			newJoule = didCommit
				? joules.createJouleHumanWithChanges(message, latestCommit!, diffInfo)
				: joules.createJouleHuman(message);
		} else {
			newJoule = joules.createJouleHuman(message);
		}

		this.conversation = conversations.addJoule(this.conversation, newJoule);
		this.updateLastModified();

		webviewNotifier.updateStatusMessage("Autosaving conversation");
		await datastores.dumpTaskToDisk(await this.dehydrate());

		webviewNotifier.resetStatusMessage();
		return conversations.lastJoule(this.conversation)!;
	}

	/**
	 * @returns whether launched successfully or not
	 */
	public startResponse(text: string): boolean {
		this._webviewNotifier.updateStatusMessage("Starting up");

		if (this.inFlightOperationCancellationTokenSource) {
			console.error("Response is already running");
			return false;
		}
		this.inFlightOperationCancellationTokenSource = new vscode.CancellationTokenSource();
		const cancellationToken = this.inFlightOperationCancellationTokenSource.token;

		(async () => {
			// human response
			await this.respondHuman(text);
			webviewNotifier.sendNotification("updateTask", {
				task: this.dehydrateForWire(),
			});

			// bot response
			const processPartial = (partialConversation: Conversation) => {
				const dehydratedTask = this.dehydrateForWire();
				dehydratedTask.conversation = partialConversation;
				webviewNotifier.sendNotification("updateTask", {
					task: dehydratedTask,
				});
			};
			await this.respondBot(
				processPartial,
				cancellationToken
			);

			webviewNotifier.sendNotification("updateTask", {
				task: this.dehydrateForWire(),
			});
			webviewNotifier.resetStatusMessage();

			// end running operation
			this.inFlightOperationCancellationTokenSource = null;
		})();

		return true;
	}

	public stopResponse(): void {
		if (this.inFlightOperationCancellationTokenSource) {
			this.inFlightOperationCancellationTokenSource.cancel();
			this.inFlightOperationCancellationTokenSource = null;

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
			...this,
			_fileManager: undefined,
			_gitManager: undefined,
			files: null
		};
	}

	public async dehydrate(): Promise<DehydratedTask> {
		return {
			...this,
			_fileManager: undefined,
			_gitManager: undefined,
			meltyMindFiles: await this._fileManager.getMeltyMindFilesRelative()
		};
	}

	public static hydrate(dehydratedTask: DehydratedTask) {
		return new Task(dehydratedTask);
	}
}
