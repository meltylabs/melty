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
  const filePath = path.join(__dirname, '..', 'static', 'example_conversation_prompt.txt');
  const fileContents = fs.readFileSync(filePath, 'utf8');
  return fileContents;
}

export function codeChangeCommandRulesPrompt(): string {
  const filePath = path.join(__dirname, '..', 'static', 'code_change_command_rules.txt');
  const fileContents = fs.readFileSync(filePath, 'utf8');
  return fileContents;
}

export function messageDecoderPrompt() {
  // TODOV2
  return "";
}

export function diffDecoderPrompt(): string {
  return `
  Once you understand the request, please:
1. Decide if you need to propose CodeChange edits to any files.
2. Think step-by-step through the changes you'll make. It can help to do scratch work to prepare to make changes.
3. Describe each change with a CodeChange block per the examples below. All changes to files must use this format.`;
}

export function filesUserIntro(): string {
  return `These are the files I want you to work with. They may have changed since you last saw them -- if so, trust this message as the true contents of the files!`;
}

export function filesAsstAck(): string {
  return `Okay, any changes I make will be to those files.`;
}