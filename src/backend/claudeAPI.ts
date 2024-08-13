import { Anthropic } from "@anthropic-ai/sdk";
import * as vscode from "vscode";

import { ClaudeMessage, ClaudeConversation } from "../types";

export enum Models {
  Claude35Sonnet = "claude-3-5-sonnet-20240620",
  Claude3Haiku = "claude-3-haiku-20240307",
}

export async function streamClaude(
  claudeConversation: ClaudeConversation,
  processPartial: (text: string) => void,
  model: Models = Models.Claude35Sonnet
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

  try {
    console.log("waiting for claude...");
    const stream = await anthropic.messages
      .stream(
        {
          model: model,
          max_tokens: 4096,
          messages: claudeConversation.messages as any,
          system: claudeConversation.system,
          stream: true,
        },
        {
          headers: {
            "anthropic-beta": "max-tokens-3-5-sonnet-2024-07-15",
          },
        }
      )
      .on("text", processPartial);

    const final = await stream.finalMessage();
    const textContent = final.content.find((block) => "text" in block);
    if (textContent && "text" in textContent) {
      return textContent.text.trim();
    } else {
      throw new Error("No text content found in the response");
    }
  } catch (error) {
    console.log("Error communicating with Claude: ", error);
    console.log("Messages was: ", claudeConversation.messages);
    console.log("System was: ", claudeConversation.system);
    throw error;
  }
}
