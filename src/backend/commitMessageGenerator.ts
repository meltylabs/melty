import * as fs from "fs";
import * as path from "path";
import { Anthropic } from "@anthropic-ai/sdk";
import * as vscode from "vscode";
import { commit } from "./pseudoCommits";

export async function generateCommitMessage(
  changedFiles: string[],
  rootPath: string
): Promise<string> {
  const config = vscode.workspace.getConfiguration("melty");
  const apiKey = config.get<string>("anthropicApiKey");

  if (!apiKey) {
    throw new Error(
      "Anthropic API key is not set. Please configure it in settings."
    );
  }

  const anthropic = new Anthropic({
    apiKey: apiKey,
  });

  // const fileContents = changedFiles
  //   .map((file) => {
  //     const filePath = path.join(rootPath, file);
  //     return `${file}:\n${fs.readFileSync(filePath, "utf-8")}`;
  //   })
  //   .join("\n\n");

  const fileContents = "";

  const prompt = `You are an expert software engineer.
Review the provided context and diffs which are about to be committed to a git repo.
Review the diffs carefully.
Generate a commit message for those changes.
The commit message MUST use the imperative tense.
The commit message should be structured as follows: <type>: <description>
Use these for <type>: fix, feat, build, chore, ci, docs, style, refactor, perf, test
Reply with JUST the commit message, without quotes, comments, questions, etc!

Changes to be committed:

${fileContents}`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-3-sonnet-20240229",
      max_tokens: 100,
      temperature: 0.7,
      messages: [{ role: "user", content: prompt }],
    });

    const commitMessage = response.content[0].text.trim();
    return commitMessage;
  } catch (error) {
    console.error("Error generating commit message:", error);
    return "bot changes";
  }
}
