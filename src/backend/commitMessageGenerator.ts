import * as fs from "fs";
import * as path from "path";
import { Anthropic } from "@anthropic-ai/sdk";
import * as vscode from "vscode";
import * as files from "./meltyFiles";
import { GitRepo, ChangeSet } from "../types";

export async function generateCommitMessage(
  udiffPreview: string
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

  const prompt = `You are an expert software engineer.
Review the provided diff which is about to be committed to a git repo.
Review the diff carefully.
Generate a commit message for those changes.
The commit message MUST use the imperative tense.
If the diff contains no files changed, you can just reply with "empty commit".
The commit message should be structured as follows: <type>: <description>
Use these for <type>: fix, feat, build, chore, ci, docs, style, refactor, perf, test
Reply with JUST the commit message, without quotes, comments, questions, etc!

Example:

<CommitMessage>fix: Add logging to foo/bar/baz.py</CommitMessage>

Here is the diff:

<Diff>
${udiffPreview}
</Diff>`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-3-sonnet-20240229",
      max_tokens: 100,
      temperature: 0.7,
      messages: [
        { role: "user", content: prompt },
        { role: "assistant", content: "<CommitMessage>" },
      ],
    });

    const responseText = response.content[0].text.trim();
    const commitMessage = responseText.split("</CommitMessage>")[0].trim();
    return commitMessage;
  } catch (error) {
    console.error("Error generating commit message:", error);
    return "bot changes";
  }
}
