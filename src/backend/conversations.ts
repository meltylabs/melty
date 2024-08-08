import {
  Joule,
  JouleBot,
  Mode,
  ClaudeConversation,
  ClaudeMessage,
  PseudoCommit,
  Conversation,
  GitRepo,
} from "../types";
import * as pseudoCommits from "./pseudoCommits";
import * as joules from "./joules";
import * as prompts from "./prompts";
import * as claudeAPI from "./claudeAPI";
import * as diffApplicatorXml from "./diffApplicatorXml";
import { RepoMapSpec } from "./repoMapSpec";
import * as vscode from "vscode";
import * as path from "path";

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

export function create(): Conversation {
  return { joules: [] };
}

function addJoule(conversation: Conversation, joule: Joule): Conversation {
  return { joules: [...conversation.joules, joule] };
}

export function respondHuman(
  conversation: Conversation,
  message: string,
  pseudoCommit: PseudoCommit
): Conversation {
  const newJoule = joules.createJouleHuman(message, pseudoCommit);
  return addJoule(conversation, newJoule);
}

export async function respondBot(
  conversation: Conversation,
  gitRepo: GitRepo,
  contextPaths: string[],
  mode: Mode,
  processPartial: (partialJoule: Joule) => void
): Promise<Conversation> {
  const currentPseudoCommit = lastJoule(conversation)!.pseudoCommit;
  // TODO 100: Add a loop here to try to correct the response if it's not good yet

  // TODO 300 (abstraction over 100 and 200): Constructing a unit of work might require multiple LLM steps: find context, make diff, make corrections.
  // We can try each step multiple times. All attempts should be represented by a tree. We pick one leaf to respond with.

  const systemPrompt = (() => {
    switch (mode) {
      case "code":
        return (
          prompts.codeModeSystemPrompt() +
          prompts.diffDecoderPrompt() +
          prompts.exampleConversationsPrompt() +
          prompts.codeChangeCommandRulesPrompt()
        );
      case "ask":
        return prompts.askModeSystemPrompt();
    }
  })();

  const claudeConversation: ClaudeConversation = {
    system: systemPrompt,
    messages: [
      // TODOV2 user system info
      ...(await encodeRepoMap(gitRepo, currentPseudoCommit)),
      ...encodeContext(gitRepo, currentPseudoCommit, contextPaths),
      ...encodeMessages(conversation),
    ],
  };

  // TODO 200: get five responses, pick the best one with pickResponse

  // TODOV2 write a claudePlus
  let partialJoule = joules.createJouleBot(
    "",
    mode,
    currentPseudoCommit,
    contextPaths
  );
  const finalResponse = await claudeAPI.streamClaude(
    claudeConversation,
    (responseFragment) => {
      partialJoule = joules.updateMessage(
        partialJoule,
        partialJoule.message + responseFragment
      ) as JouleBot;
      processPartial(partialJoule);
    }
  );
  console.log(finalResponse);

  const { messageChunksList, searchReplaceList } =
    diffApplicatorXml.splitResponse(finalResponse);

  // reset the diff preview
  const pseudoCommitNoDiff =
    pseudoCommits.createFromPrevious(currentPseudoCommit);

  const newPseudoCommit =
    mode === "code"
      ? diffApplicatorXml.applySearchReplaceBlocks(
          gitRepo,
          pseudoCommitNoDiff,
          searchReplaceList
        )
      : pseudoCommitNoDiff;

  const newJoule = joules.createJouleBot(
    messageChunksList.join("\n"),
    mode,
    newPseudoCommit,
    contextPaths
  );
  const newConversation = addJoule(conversation, newJoule);
  return newConversation;
}

/**
 * Encodes files for Claude. Note that we're being loose with the newlines.
 * @returns string encoding the files
 */
function encodeFile(
  gitRepo: GitRepo,
  pseudoCommit: PseudoCommit,
  path: string
) {
  const fileContents = pseudoCommits.getFileContents(
    gitRepo,
    pseudoCommit,
    path
  );
  return `${path}
\`\`\`
${fileContents.endsWith("\n") ? fileContents : fileContents + "\n"}\`\`\``;
}

function encodeContext(
  gitRepo: GitRepo,
  pseudoCommit: PseudoCommit,
  contextPaths: string[]
): ClaudeMessage[] {
  // in the future, this could handle other types of context, like web urls
  const fileEncodings = contextPaths
    .map((path) => encodeFile(gitRepo, pseudoCommit, path))
    .join("\n");

  return fileEncodings.length
    ? [
        {
          role: "user",
          content: `${prompts.filesUserIntro()}

${fileEncodings}`,
        },
        { role: "assistant", content: prompts.filesAsstAck() },
      ]
    : [];
}

async function encodeRepoMap(
  gitRepo: GitRepo,
  pseudoCommit: PseudoCommit
): Promise<ClaudeMessage[]> {
  const repoMap = new RepoMapSpec(gitRepo);

  // TODO this logic is copied from HelloWorldPanel.ts
  const workspaceFileUris = await vscode.workspace.findFiles(
    "**/*",
    "**/node_modules/**"
  );
  const workspaceFilePaths = workspaceFileUris.map((file) => {
    return path.relative(gitRepo.rootPath, file.fsPath);
  });

  const repoMapMessages: ClaudeMessage[] = [
    {
      role: "user",
      content: `${prompts.repoMapIntro()}

      ${await repoMap.getRepoMap(workspaceFilePaths)}`,
    },
    { role: "assistant", content: prompts.repoMapAsstAck() },
  ];
  return repoMapMessages; // [];
}

export function lastJoule(conversation: Conversation): Joule | undefined {
  return conversation.joules.length
    ? conversation.joules[conversation.joules.length - 1]
    : undefined;
}

function encodeMessages(conversation: Conversation): ClaudeMessage[] {
  return conversation.joules.map((joule) => {
    return {
      role: joule.author === "human" ? "user" : "assistant",
      content: joule.message.length ? joule.message : "...", // appease Claude, who demands all messages be non-empty
    };
  });
}
