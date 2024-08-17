import * as fs from "fs";
import * as path from "path";
import { Anthropic } from "@anthropic-ai/sdk";
import * as vscode from "vscode";

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

  const fileContents = changedFiles.map(file => {
    const filePath = path.join(rootPath, file);
    return `${file}:\n${fs.readFileSync(filePath, 'utf-8')}`;
  }).join('\n\n');

  const prompt = `Generate a concise and descriptive Git commit message for the following changes. The message should be in the present tense, imperative mood, and not exceed 50 characters for the summary line. Do not include any explanatory text, just the commit message itself:\n\n${fileContents}`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-3-sonnet-20240229",
      max_tokens: 100,
      temperature: 0.7,
      messages: [{ role: "user", content: prompt }],
    });

    const textContent = response.content[0].text;
    // Extract the first line of the response as the commit message
    const commitMessage = textContent.split('\n')[0].trim();
    return commitMessage || "Update code";
  } catch (error) {
    console.error("Error generating commit message:", error);
    return "Update code";
  }
}

