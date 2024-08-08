import { Anthropic } from "@anthropic-ai/sdk";
import * as vscode from "vscode";

import { ClaudeMessage, ClaudeConversation } from '../types';

export async function claude(conversation: ClaudeConversation): Promise<string> {
  return doClaude(conversation);
}

async function doClaude(conversation: ClaudeConversation): Promise<string> {
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
        messages: conversation.messages as any,
        system: conversation.system
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


export async function streamClaude(
  claudeConversation: ClaudeConversation,
  processPartial: (text: string) => void,
): Promise<any> {
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
    console.log('waiting for claude...');
    const stream = await anthropic.messages.stream(
      {
        model: "claude-3-5-sonnet-20240620",
        max_tokens: 4096,
        messages: claudeConversation.messages as any,
        system: claudeConversation.system,
        stream: true
      },
      {
        headers: {
          "anthropic-beta": "max-tokens-3-5-sonnet-2024-07-15",
        },
      }
    ).on('text', processPartial);

    const final = await stream.finalMessage();
    const textContent = final.content.find((block) => "text" in block);
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

// // example
// const stream = streamClaude(messages, system
//   (partialText) => { partialText + "hi!" },
// )
//   .on('text', (text) => {
//     console.log(text);
//   });

// const message = await stream.finalMessage();
// console.log(message);
