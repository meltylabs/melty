import { MessageEvent } from "./task";
import * as vscode from "vscode";
import * as dotenv from "dotenv";
import { Util } from "../util/util";
import { sendToClaudeAPI } from "./claudeAPI";
import * as fs from "fs";
import * as path from "path";

dotenv.config();

const CONTENT_TAG_NAME = "UserFileContents";

export interface ClaudeResponse {
  message: string;
  workspaceEdit: vscode.WorkspaceEdit;
}

export interface ClaudeEditResponse {
  message: string;
  workspaceEdit: vscode.WorkspaceEdit;
  editStatus: string;
}

function logToFile(content: string, prefix: string, contextRoot: string): void {
  const logDir = path.join(contextRoot, ".claude_log");
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
  }
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `${prefix}_${timestamp}.log`;
  const filePath = path.join(logDir, fileName);
  fs.writeFileSync(filePath, content);
}

export async function askClaudeAndEdit(
  prompt: string,
  contextRoot: string
): Promise<ClaudeEditResponse> {
  const { message, workspaceEdit } = await askClaude(prompt, contextRoot);
  let editStatus = "none";

  // @ts-ignore
  if (!workspaceEdit["c"]) {
    throw new Error("WorkspaceEdit internal api has changed");
  }

  // @ts-ignore
  if (workspaceEdit["c"].length > 0) {
    const editSucceeded = await vscode.workspace.applyEdit(workspaceEdit);
    editStatus = editSucceeded ? "success" : "failure";

    if (!editSucceeded) {
      vscode.window.showErrorMessage("Failed to apply specification updates");
    }
  }

  console.log("Edit status: ", editStatus);

  return {
    message: message,
    workspaceEdit: workspaceEdit,
    editStatus: editStatus,
  };
}

export async function askClaude(
  prompt: string,
  contextRoot: string
): Promise<ClaudeResponse> {
  console.log("Prompting claude with prompt: ", prompt);
  logToFile(prompt, "prompt", contextRoot);
  const response = await sendToClaudeAPI(prompt);
  console.log("Raw Claude response: ", response);
  logToFile(response, "response", contextRoot);
  const finalClaudeResponse = await parseClaudeResponse(response, contextRoot);
  console.log("Final Claude response: ", finalClaudeResponse);
  return finalClaudeResponse;
}

export class PromptFormatter {
  static formatTextDocuments(
    workspaceTextDocuments: readonly vscode.TextDocument[],
    contextRoot: string
  ): string {
    let prompt = "<Workspace>";
    workspaceTextDocuments.forEach((document) => {
      const filePath = Util.makeUriRelativetoContextRoot(
        document.uri,
        contextRoot
      ).fsPath;
      prompt += `
    <File>
        <Path>${filePath}</Path>
        <Content>${document.getText()}</Content>
    </File>`;
    });
    prompt += "\n</Workspace>";
    return prompt;
  }

  static formatMessage(message: string): string {
    return `<Message>${message}</Message>`;
  }

  static formatDiff(path: string, diff: string): string {
    // TODO standardize with promptFormatEdits
    return `<FileDiff>
        <Path>${path}</Path>
        <Diff>${diff}</Diff>
    </FileDiff>`;
  }

  static formatEdits(
    editsInCurrentTask: vscode.WorkspaceEdit,
    workspaceTextDocuments: readonly vscode.TextDocument[],
    contextRoot: string
  ): string {
    let editsXml = "<EditsInCurrentTask>";
    for (const [uri, edits] of editsInCurrentTask.entries()) {
      const filePath = Util.makeUriRelativetoContextRoot(
        uri,
        contextRoot
      ).fsPath;
      editsXml += `
    <File>
        <Path>${filePath}</Path>
        <Edits>`;
      for (const edit of edits) {
        const document = workspaceTextDocuments.find(
          (doc) => doc.uri.toString() === uri.toString()
        );
        const oldText = document?.getText(edit.range) || "";
        editsXml += `
            <Edit>
                <Range>${edit.range.start.line},${edit.range.start.character},${edit.range.end.line},${edit.range.end.character}</Range>
                <OldText>${oldText}</OldText>
                <NewText>${edit.newText}</NewText>
            </Edit>`;
      }
      editsXml += `
        </Edits>
    </File>`;
    }
    editsXml += "\n</EditsInCurrentTask>";
    return editsXml;
  }

  static formatMessageHistory(messages: MessageEvent[]): string {
    let historyXml = "<MessageHistory>";
    messages.forEach((message) => {
      historyXml += `<Message>
    <Author>${message.author}</Author>
    <Text>${message.text}</Text>
</Message>`;
    });
    historyXml += "\n</MessageHistory>";
    return historyXml;
  }

  static writeIntroToSpecs(): string {
    return `You are an expert programmer. You write TypeScript code based on .spec files. .spec files are TypeScript files where method bodies are replaced by {} and private methods in a class are omitted.
        Usually, only method class definitions, signatures, and JSDoc are allowed in a .spec file, although you may sometimes see imports as well.`;
  }

  static writeOutputInstructions(multipleFiles: boolean = true): string {
    return `Please provide your response in XML format, following this example.
- If you revise a file, provide it in its entirety.
- You can also add new files if needed.
- Don't worry about escaping file contents.

<Response>
    <Message>Okay, I made those changes.</Message>
    <RevisedFiles>
        <File>
            <Path>/file1.txt</Path>
            <${CONTENT_TAG_NAME}>new file contents 1></${CONTENT_TAG_NAME}>
        </File>
        ${
          multipleFiles
            ? `<File>
            <Path>/file2.txt</Path>
            <${CONTENT_TAG_NAME}>new file contents 2></${CONTENT_TAG_NAME}>
        </File>`
            : ""
        }
    </RevisedFiles>
</Response>`;
  }
}

// Helper functions (you may want to move these to a separate utility file)

async function parseClaudeResponse(
  response: string,
  contextRoot: string
): Promise<ClaudeResponse> {
  // this is async because it relies on current workspace state to turn the response
  // into a workspaceEdit
  const messageContent = extractXmlContent(response, "Message")[0] || "";
  const workspaceEdit = new vscode.WorkspaceEdit();
  const fileContents = extractXmlContent(response, "File");

  for (const fileContent of fileContents) {
    const path = extractXmlContent(fileContent, "Path")[0] || "";
    const absolutePath = Util.makeUriAbsolute(
      vscode.Uri.file(path),
      contextRoot
    ).fsPath;
    const content = extractXmlContent(fileContent, CONTENT_TAG_NAME)[0] || "";
    const uri = vscode.Uri.file(absolutePath);

    const fileExists = await fileExistsInWorkspace(uri);

    if (fileExists) {
      // File exists, use replace
      const fullRange = new vscode.Range(
        new vscode.Position(0, 0),
        new vscode.Position(Number.MAX_VALUE, Number.MAX_VALUE)
      );
      workspaceEdit.replace(uri, fullRange, content);
    } else {
      // File doesn't exist, use createFile
      workspaceEdit.createFile(uri, {
        overwrite: true,
        contents: Buffer.from(content),
      });
    }
  }

  return {
    message: messageContent,
    workspaceEdit: workspaceEdit,
  };
}

async function fileExistsInWorkspace(uri: vscode.Uri): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(uri);
    return true;
  } catch {
    return false;
  }
}

function extractXmlContent(xml: string, tag: string): string[] {
  const regex = new RegExp(`<${tag}>(.*?)<\/${tag}>`, "gs");
  const matches = xml.match(regex);
  return matches
    ? matches.map((match) =>
        match.replace(new RegExp(`</?${tag}>`, "g"), "").trim()
      )
    : [];
}

function extractXmlCdataContent(xml: string, tag: string): string[] {
  const regex = new RegExp(`<${tag}><![CDATA[(.*?)]]><\/${tag}>`, "gs");
  const matches = xml.match(regex);
  return matches
    ? matches.map((match) =>
        match.replace(new RegExp(`</?${tag}>`, "g"), "").trim()
      )
    : [];
}
