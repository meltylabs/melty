// implemented by the Task class. this is the UI-facing one
export interface Task {
    id: string;
    name: string;
    branch: string;
    conversation: Conversation;
    gitRepo: GitRepo | null;
}

export type GitRepo = {
    repository: any;
    rootPath: string;
};

export type PseudoCommit = {
    // most operations supported regardless of implementation.
    // implementation can be swapped in place.
    impl: PseudoCommitInMemory | PseudoCommitInGit;
};

export type PseudoCommitInGit = {
    readonly status: "committed";
    readonly commit: string;
    readonly udiffPreview: string; // not guaranteed to be available. may be truncated.
};

export type PseudoCommitInMemory = {
    readonly status: "inMemory";
    readonly parentCommit: string;
    readonly filesChanged: { [relativePath: string]: MeltyFile };
};

// From src/backend/joules.ts
export type AssistantType = "architect" | "coder" | "system";

export type JouleHuman = {
    readonly author: "human";
    readonly id: string;
    readonly mode: null;
    readonly message: string;
    readonly pseudoCommit: PseudoCommit;
    readonly contextPaths: null;
};

export type JouleBot = {
    readonly author: "bot";
    readonly id: string;
    readonly assistantType: AssistantType;
    readonly message: string;
    readonly rawOutput: string;
    readonly pseudoCommit: PseudoCommit;
    readonly contextPaths: ReadonlyArray<string>;
};

export type Joule = JouleHuman | JouleBot;

// From src/backend/searchReplace.ts
export type SearchReplace = {
    readonly filePath: string;
    readonly search: string;
    readonly replace: string;
};

// From src/backend/repoMap.ts
export interface Tag {
    relFname: string;
    fname: string;
    name: string;
    kind: "def" | "ref";
    line: number;
}

// From src/extension.ts
export interface Message {
    text: string;
    sender: "user" | "bot";
    diff?: string;
}

// From src/lib/claudeAPI.ts
export type ClaudeMessage = {
    readonly role: "user" | "assistant";
    readonly content: string;
};

export type ClaudeConversation = {
    readonly messages: ClaudeMessage[];
    readonly system: string;
};

// From webview-ui/src/components/Tasks.tsx
export interface Task {
    id: string;
    title: string;
    description: string;
    status: string;
    github_link: string;
}

// From src/backend/conversations.ts
export type Conversation = {
    readonly joules: ReadonlyArray<Joule>;
};

// From src/backend/meltyFiles.ts
export type MeltyFile = {
    readonly path: string;
    readonly contents: string;
};
