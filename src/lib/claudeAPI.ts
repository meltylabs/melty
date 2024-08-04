import { Anthropic } from "@anthropic-ai/sdk";
import * as vscode from "vscode";

export type ClaudeMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export async function claude(messages: ClaudeMessage[]): Promise<string> {
  return doClaude(messages);
}

/**
 * DEPRECATED prefer `claude`
 * @param prompt 
 * @returns 
 */
export async function sendToClaudeAPI(prompt: string): Promise<string> {
  const messages: ClaudeMessage[] = [{ role: "user", content: prompt }];
  return doClaude(messages);
}

async function doClaude(messages: ClaudeMessage[]): Promise<string> {
  const config = vscode.workspace.getConfiguration("spectacle");
  const apiKey = config.get<string>("anthropicApiKey");

  if (!apiKey) {
    throw new Error(
      "Anthropic API key is not set. Please configure it in settings."
    );
  }

  const anthropic = new Anthropic({
    apiKey: apiKey,
  });

  try {
    const message = await anthropic.messages.create(
      {
        model: "claude-3-haiku-20240307",
        max_tokens: 4096,
        messages: messages as any,
      },
      {
        headers: {
          "anthropic-beta": "max-tokens-3-5-sonnet-2024-07-15",
        },
      }
    );

    const textContent = message.content.find((block) => "text" in block);
    if (textContent && "text" in textContent) {
      return textContent.text.trim();
    } else {
      throw new Error("No text content found in the response");
    }
  } catch (error) {
    throw new Error(
      `Error communicating with Claude: ${(error as any).message}`
    );
  }
}
