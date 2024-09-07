export type ConvoStateHuman =
	| "HumanChat"
	| "HumanConfirmCode";
//   | "HumanAddFile"

export type ConvoStateBot =
	| "BotChat"
	| "BotCode";

export type ConvoState = ConvoStateHuman | ConvoStateBot;

export type ConvoEdges = {
	[FromState in ConvoState]?: ConvoState[]
};

// Note that if you want to model the human/AI decision making process
// (and the information we show in the prompt/UI) then it's not a state
// machine, because the transitions depend on entire converstaion trace!
// but if you squint and ignore that part, it's a state machine
const stateMachineEdges: ConvoEdges = {
	"HumanChat": ["BotChat"],
	"HumanConfirmCode": ["BotCode"],
	"BotChat": ["HumanChat"],
	"BotCode": ["HumanChat"],
};

export type Joule = {
	readonly id: string;
	readonly author: "human" | "bot"; // todo deprecate
	readonly convoState: ConvoState;
	readonly jouleState: "complete" | "partial" | "error";
	readonly chatCodeInfo: ChatCodeInfo;
};

export type JouleHuman = Joule & {
	readonly author: "human";
	readonly convoState: ConvoStateHuman;
};

export type JouleBot = Joule & {
	readonly author: "bot";
	readonly convoState: ConvoStateBot;
	readonly botExecInfo: BotExecInfo;
};

export type ChatCodeInfo = {
	readonly message: string;
	readonly commit: string | null;
	readonly diffInfo: DiffInfo | null;
}

// export type JouleHumanChat = JouleHuman & ChatCodeInfo;
// export type JouleHumanConfirmCode = JouleHuman & {
// 	readonly confirmed: boolean;
// };
// export type JouleBotCode = JouleBot & ChatCodeInfo;
// export type JouleBotChat = JouleBot & ChatCodeInfo;

/* ================================================= */

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

export type ContextPaths = {
	readonly paths: string[];
	meltyRoot: string;
};

export type TaskMode = "vanilla" | "coder";

export interface AssistantInfo {
	type: TaskMode;
	description: string;
}

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
	readonly content: string;
};

export type ClaudeConversation = {
	readonly messages: ClaudeMessage[];
	readonly system: string;
};

export type Conversation = {
	readonly joules: ReadonlyArray<Joule>;
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
	// human conversation actions
	| "humanChat"
	// bot conversation action
	| "startBotTurn";
