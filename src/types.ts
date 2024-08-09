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
export type Mode = "code" | "ask";

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
  readonly mode: Mode;
  readonly message: string;
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

// DUMMY DATA
const dummyPseudoCommit: PseudoCommit = {
  impl: {
    status: "committed",
    commit: "dummy",
    udiffPreview: "",
  },
};

const dummyJouleBot: JouleBot = {
  author: "bot",
  id: "1",
  mode: "code",
  message: `Certainly! I'd be happy to provide you with a boilerplate HTML file. Here's a basic HTML5 template that you can use as a starting point for your web pages:

  \`\`\`html
  <!DOCTYPE html>
  <html lang="en">
  <head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Page Title</title>
  <style>
  /* You can add your CSS styles here */
  </style>
  </head>
  <body>
  <header>
  <h1>Welcome to My Website</h1>
  </header>

  <nav>
  <ul>
  <li><a href="#">Home</a></li>
  <li><a href="#">About</a></li>
  <li><a href="#">Contact</a></li>
  </ul>
  </nav>

  <main>
  <h2>Main Content</h2>
  <p>This is where your main content goes.</p>
  </main>

  <footer>
  <p>&copy; 2023 Your Name. All rights reserved.</p>
  </footer>

  <script>
  // You can add your JavaScript code here
  </script>
  </body>
  </html>
  \`\`\`

  This template includes:

  1. The HTML5 doctype declaration
  2. A \`\`\`<head>\`\`\` section with meta tags for character encoding and viewport, a title tag, and a place for CSS
  3. A \`\`\`<body>\`\`\` section with some basic structure (header, nav, main content area, and footer)
  4. Placeholders for CSS (in the \`\`\`<style>\`\`\` tag) and JavaScript (in the \`\`\`<script>\`\`\` tag)
  `,

  pseudoCommit: dummyPseudoCommit,
  contextPaths: [],
};
