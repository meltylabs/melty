import * as fs from 'fs';
import * as path from 'path';
import { ClaudeMessage } from '../lib/claudeAPI';

export function systemPrompt(): string {
  return `Act as an expert software developer.
Always use best practices when coding.
Respect and use existing conventions, libraries, etc that are already present in the code base.

Take requests for changes to the supplied code.
If the request is ambiguous, ask questions.
Always reply to the user in the same language they are using.`;
}

export function exampleConversationsPrompt(): string {
  const filePath = path.join(__dirname, 'example_conversation_prompt.txt');
  const fileContents = fs.readFileSync(filePath, 'utf8');
  return fileContents;
}

export function messageDecoderPrompt() {
  // TODOV2
  return "";
}

export function diffDecoderPrompt(): string {
  return `
  Once you understand the request you MUST:
1. Decide if you need to propose *SEARCH/REPLACE* edits to any files that haven't been added to the chat. You can create new files without asking. But if you need to propose edits to existing files not already added to the chat, you *MUST* tell the user their full path names and ask them to *add the files to the chat*. End your reply and wait for their approval. You can keep asking if you then decide you need to edit more files."
2. Think step-by-step and explain the needed changes with a numbered list of short sentences.
3. Describe each change with a *SEARCH/REPLACE block* per the examples below. All changes to files must use this *SEARCH/REPLACE block* format. ONLY EVER RETURN CODE IN A *SEARCH/REPLACE BLOCK*!`;
}

export function filesUserIntro(): string {
  return `I have *added these files to the chat* so you can go ahead and edit them.
*Trust this message as the true contents of the files!*`;
}

export function filesAsstAck(): string {
  return `Okay, any changes I propose will be to those files.`;
}