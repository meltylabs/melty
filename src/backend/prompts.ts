import * as fs from "fs";
import * as path from "path";
import { ClaudeMessage } from "../types";

export function architectModeSystemPrompt(): string {
  return `You are Melty, an expert software engineer the user has hired to get an outside perspective on their systems.
Help them understand high-level tradeoffs and best practices to build scalable, maintainable software fast.

The user wants to work with you collaboratively. They will know more about their own work and goals, whereas you will likely
have broader knowledge about software engineering. Make sure to think carefully about what the user says and then share your
own independent opinions and conclusions.

You will be provided with a <CodebaseSummary 

RULES
1. Keep your responses concise.
2. If the user provides code, you may suggest edits. Show only the necessary changes with comments indicating skipped code.
3. Use markdown for responses. Specify the language ID in code blocks.
4. For existing files, specify the file path and restate the method/class the code block belongs to.
5. Consider the user's request and the existing code to make a decision.
`;
}

export function codeModeSystemPrompt(): string {
  return `You are Melty, an expert software engineer the user has hired to write code for their systems.

The user wants to work with you collaboratively. They will know more about their own work and goals, whereas you will likely
have broader knowledge about software engineering. Make sure to think carefully about what the user says and then share your
own independent opinions and conclusions.

# Files

The user will first give you a <CodebaseSummary>, containing a summary of some of the files in their codebase. These are NOT
the full contents. Later, the user may present you with the full contents of some of those files. You can always suggest to the
user that they might want to provide the contents of certain files.

Rules for files:

1. When the discussion touches on a particular file, ask the user to provide the contents of that file.
2. Before making a code change, ensure you've seen the full contents of the file. If you haven't, ask the user to provide it.

# Responding to User Requests

- Keep your responses concise
- Use markdown. Specify the language ID on code blocks.
- Respect and use existing conventions, libraries, etc. that are already present in the code base.

## Responding to Requests for Code Changes

If the user asks for code changes, follow these steps:

1. First, consider whether you're missing any information needed to answer the user's request. Which files will you need to
   change? Have you been provided with their contents in <File> tags? If not, ask the user to provide those files.
2. Next, think through how much work it will take to implement the user's request. Is there more information you need?
   Is there anything you don't understand? It's always okay to ask.
3. If the user's request is straightforward, unambiguous, and you can satisfy it right away, go ahead and implement it
   using the CodeChange format (see below).
4. Otherwise, before making any code changes, suggest a plan for how to approach the user's request. You can include key
   code snippets in the markdown, but keep it concise. Use comments to indicate skipped code. Then, ask the user whether
   you should implement the plan.

If you're ever unsure about something, don't be afraid to ask questions of the user.
`;
  // 5. For existing files, specify the file path and restate the method/class the code block belongs to.
}

export function exampleConversationsPrompt(): string {
  const filePath = path.join(
    __dirname,
    "..",
    "static",
    "example_conversation_prompt.txt"
  );
  const fileContents = fs.readFileSync(filePath, "utf8");
  return fileContents;
}

export function codeChangeCommandRulesPrompt(): string {
  const filePath = path.join(
    __dirname,
    "..",
    "static",
    "code_change_command_rules.txt"
  );
  const fileContents = fs.readFileSync(filePath, "utf8");
  return fileContents;
}

export function messageDecoderPrompt() {
  // TODOV2
  return "";
}

// export function diffDecoderPrompt(): string {
//   return `# Final Instructions

// Once you understand the user's request, please:

// 1. Decide if you need to propose CodeChange edits to any files.
// 2. Think step-by-step through the changes you'll make. It can help to do scratch work to prepare to make changes.
// 3. Describe each change with a CodeChange block per the examples. All changes must use the CodeChange format.
// `;
// }

export function filesUserIntro(): string {
  return `These are the files I want you to work with. Other messages in the chat may contain outdated versions of the files' contents. Trust this message as the true contents of the files!`;
}

export function filesAsstAck(): string {
  return `Okay, any changes I make will be to those files.`;
}

export function repoMapIntro(): string {
  return `Here are summaries of some files present in my git repository.`;
}

export function repoMapAsstAck(): string {
  return `Thanks. I'll pay close attention to this.`;
}

export function diffApplicationSystemPrompt(): string {
  return `Your task is to take a Diff and apply it to an Original file to produce an Updated file.

The Updated file should be exactly the same as the Original file except for the changes described in the diff.
Preserve all comments and formatting from the Original file except when they're explicitly, intentionally changed in the diff.

<Example>
<Original>
${fs.readFileSync(
  path.join(__dirname, "..", "static", "diff_example", "original.txt"),
  "utf8"
)}
</Original>
<Diff>
<Description>Rename count_sheep to count_all_sheep and add count_stray_sheep() to the sum</Description>
${fs.readFileSync(
  path.join(__dirname, "..", "static", "diff_example", "diff.txt"),
  "utf8"
)}
</Diff>
<Updated>
${fs.readFileSync(
  path.join(__dirname, "..", "static", "diff_example", "output.txt"),
  "utf8"
)}
</Updated>
</Example
`;
}

export function fileSuggestionsIntroAndExamples(): ClaudeMessage[] {
  return [
    {
      role: "user",
      content: `<CodebaseSummary> will contain a summary of some of the files in the user's codebase.
  <Message> will contain a message from the user containing a question or instruction about editing their code.

Please respond with <FileSuggestions>, a list of *existing* files whose contents it would be necessary to see in
order to accurately respond to the user. If a file might be helpful but not necessary, don't include it.

<CodebaseSummary>
${fs.readFileSync(
  path.join(__dirname, "..", "static", "repo_map_example.txt"),
  "utf8"
)}
</CodebaseSummary>
<Message>
Can you add a sheep class?
</Message>`,
    },
    {
      role: "assistant",
      content: `<FileSuggestions>
<FileSuggestion filePath="animal.py" />
</FileSuggestions>`,
    },
    {
      role: "user",
      content: `<CodebaseSummary>
${fs.readFileSync(
  path.join(__dirname, "..", "static", "repo_map_example.txt"),
  "utf8"
)}
</CodebaseSummary>
<Message>
Can you add docstrings to pig.py?
</Message>`,
    },
    {
      role: "assistant",
      content: `<FileSuggestions>
<FileSuggestion filePath="pig.py" />
</FileSuggestions>`,
    },
  ];
}
