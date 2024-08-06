// From src/backend/repoStates.ts
export type RepoState = {
  readonly repo: any;
  readonly workspaceRoot: string;
  impl: RepoStateInMemory | RepoStateCommitted;
};

export type RepoStateCommitted = {
  readonly status: "committed";
  readonly commit: string;
};

export type RepoStateInMemory = {
  readonly status: "inMemory";
  readonly parentCommit: string;
  readonly filesChanged: { [relativePath: string]: MeltyFile };
};

// From src/backend/joules.ts
export type Mode = "code" | "ask";

export type JouleHuman = {
  readonly author: "human";
  readonly id: string;
  readonly mode: null;
  readonly message: string;
  readonly repoState: RepoState;
  readonly contextPaths: null;
};

export type JouleBot = {
  readonly author: "bot";
  readonly id: string;
  readonly mode: Mode;
  readonly message: string;
  readonly repoState: RepoState;
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
  readonly workspaceRoot: string;
};
