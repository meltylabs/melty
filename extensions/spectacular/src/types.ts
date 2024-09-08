import Anthropic from '@anthropic-ai/sdk';

// implemented by the Task class. this is the UI-facing one
// note that datastores.ts has an independent list of properties
// that will get loaded from disk
export type DehydratedTask = {
	id: string;
	name: string;
	conversation: Conversation;
	branch: string;
	createdAt: Date;
	updatedAt: Date;
	taskMode: TaskMode;
	meltyMindFiles: string[];
};

export type DehydratedTaskWithDehydratedConversation = Omit<DehydratedTask, 'conversation'> & {
	conversation: DehydratedConversation;
};

export type ContextPaths = {
	readonly paths: string[];
	meltyRoot: string;
};

export type TaskMode = "vanilla" | "coder";

export interface AssistantInfo {
	type: TaskMode;
	description: string;
}

export type AllowedMimeTypes = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

export type UserAttachedImage = {
	mimeType: AllowedMimeTypes;
	base64: string;
};

export type JouleImage = {
	readonly path: string;
	mimeType: AllowedMimeTypes;
};

export type Joule = {
	readonly id: string;
	readonly author: "human" | "bot";
	readonly state: "complete" | "partial" | "error";
	readonly message: string;
	readonly images?: JouleImage[];
	readonly commit: string | null;
	readonly diffInfo: DiffInfo | null;
};

export type DehydratedJoule = Omit<Joule, 'images'> & {
	readonly images?: UserAttachedImage[];
};

export type JouleHuman = Joule & {
	readonly author: "human";
};

export type JouleBot = Joule & {
	readonly author: "bot";
	readonly botExecInfo: BotExecInfo;
};

export type DiffInfo = {
	readonly filePathsChanged: ReadonlyArray<string> | null;
	readonly diffPreview: string;
};

export type BotExecInfo = {
	readonly rawOutput: string;
	readonly contextPaths: ContextPaths;
};

export type SearchReplace = {
	readonly filePath: string;
	readonly search: string;
	readonly replace: string;
};

export interface Tag {
	relFname: string;
	fname: string;
	name: string;
	kind: "def" | "ref";
	line: number;
}

export interface Message {
	text: string;
	sender: "user" | "bot";
	diff?: string;
}

export type ClaudeMessage = {
	readonly role: "user" | "assistant";
	readonly content: Anthropic.Messages.MessageParam['content'];
};

export type ClaudeConversation = {
	readonly messages: ClaudeMessage[];
	readonly system: string;
};

export type Conversation = {
	readonly joules: ReadonlyArray<Joule>;
};

export type DehydratedConversation = {
	readonly joules: ReadonlyArray<DehydratedJoule>;
};

export type MeltyFile = {
	readonly relPath: string;
	readonly contents: string;
};

export type ChangeSet = {
	readonly filesChanged: {
		[relPath: string]: { original: MeltyFile; updated: MeltyFile };
	};
};

export type RpcMethod =
	| "listMeltyFiles"
	| "listWorkspaceFiles"
	| "getActiveTask"
	| "listTaskPreviews"
	| "createTask"
	| "activateTask"
	| "deactivateTask"
	| "addMeltyFile"
	| "dropMeltyFile"
	| "chatMessage"
	| "createPullRequest"
	| "deleteTask"
	| "undoLatestCommit"
	| "getLatestCommit"
	| "getGitConfigErrors"
	| "getAssistantDescription"
	| "getVSCodeTheme"
	| "openWorkspaceDialog"
	| "createGitRepository"
	| "createAndOpenWorkspace"
	| "checkOnboardingComplete"
	| "setOnboardingComplete"
	| "showNotification";
