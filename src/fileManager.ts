import * as vscode from "vscode";
import * as config from "./util/config";
import * as path from "path";
import { BridgeToWebview } from "./bridgeToWebview";

/**
 * Handles both workspace files and meltyMind files
 */
export class FileManager {
  private disposables: vscode.Disposable[] = [];
  private initializationPromise: Promise<void> | null = null;
  private bridgeToWebview: BridgeToWebview;
  private meltyRoot: string;

  private workspaceFiles: vscode.Uri[] = [];
  private meltyMindFiles: vscode.Uri[] = [];

  constructor(bridgeToWebview: BridgeToWebview, meltyRoot: string) {
    this.initializationPromise = this.initializeFileList();
    this.registerEventListeners();
    this.bridgeToWebview = bridgeToWebview;
    this.meltyRoot = meltyRoot;
  }

  private async initializeFileList(): Promise<void> {
    this.workspaceFiles = await vscode.workspace.findFiles(
      "**/*",
      config.EXCLUDES_GLOB
    );
  }

  private registerEventListeners(): void {
    this.disposables.push(
      vscode.workspace.onDidCreateFiles(this.handleFilesCreated.bind(this)),
      vscode.workspace.onDidDeleteFiles(this.handleFilesDeleted.bind(this)),
      vscode.workspace.onDidRenameFiles(this.handleFilesRenamed.bind(this))
    );
  }

  private async handleFilesCreated(event: vscode.FileCreateEvent) {
    // add workspace files
    this.workspaceFiles = this.workspaceFiles.concat(event.files);

    this.bridgeToWebview.sendNotification("updateWorkspaceFiles", {
      files: await this.getWorkspaceFilesRelative(),
    });
  }

  private async handleFilesDeleted(event: vscode.FileDeleteEvent) {
    // delete workspace files
    this.workspaceFiles = this.workspaceFiles.filter(
      (file) =>
        !event.files.some((deletedFile) => deletedFile.fsPath === file.fsPath)
    );

    // delete meltymind files
    this.meltyMindFiles = this.meltyMindFiles.filter(
      (file) =>
        !event.files.some((deletedFile) => deletedFile.fsPath === file.fsPath)
    );

    this.bridgeToWebview.sendNotification("updateWorkspaceFiles", {
      files: await this.getWorkspaceFilesRelative(),
    });
    this.bridgeToWebview.sendNotification("updateMeltyMindFiles", {
      files: await this.getMeltyMindFilesRelative(),
    });
  }

  private async handleFilesRenamed(event: vscode.FileRenameEvent) {
    // rename workspace files
    event.files.forEach(({ oldUri, newUri }) => {
      const index = this.workspaceFiles.findIndex(
        (file) => file.fsPath === oldUri.fsPath
      );
      if (index !== -1) {
        this.workspaceFiles[index] = newUri;
      }
    });

    // rename meltymind files
    event.files.forEach(({ oldUri, newUri }) => {
      const index = this.meltyMindFiles.findIndex(
        (file) => file.fsPath === oldUri.fsPath
      );
      if (index !== -1) {
        this.meltyMindFiles[index] = newUri;
      }
    });
    this.bridgeToWebview.sendNotification("updateWorkspaceFiles", {
      files: await this.getWorkspaceFilesRelative(),
    });
    this.bridgeToWebview.sendNotification("updateMeltyMindFiles", {
      files: await this.getMeltyMindFilesRelative(),
    });
  }

  public async getWorkspaceFiles(): Promise<vscode.Uri[]> {
    await this.ensureInitialized();
    return [...this.workspaceFiles];
  }

  public async getWorkspaceFilesRelative(): Promise<string[]> {
    await this.ensureInitialized();
    return this.workspaceFiles.map((file) =>
      path.relative(this.meltyRoot, file.fsPath)
    );
  }

  public async getMeltyMindFilesRelative(): Promise<string[]> {
    await this.ensureInitialized();
    return this.meltyMindFiles.map((file) =>
      path.relative(this.meltyRoot, file.fsPath)
    );
  }

  public async addMeltyMindFile(relPath: string, notify: boolean = false) {
    // TODO: we should probably get rid of the synchronous return and always rely on the
    // notifier?
    const uri = vscode.Uri.file(path.join(this.meltyRoot, relPath));
    this.meltyMindFiles.push(uri);
    if (notify) {
      this.bridgeToWebview.sendNotification("updateMeltyMindFiles", {
        files: await this.getMeltyMindFilesRelative(),
      });
    }
    // this.outputChannel.appendLine(`Added file: ${filePath}`);
  }

  public dropMeltyMindFile(relPath: string) {
    const absPath = path.join(this.meltyRoot, relPath);
    this.meltyMindFiles = this.meltyMindFiles.filter(
      (file) => file.fsPath !== absPath
    );
    // this.outputChannel.appendLine(`Dropped file: ${filePat}`);
  }

  public async refreshFiles(): Promise<void> {
    this.initializationPromise = this.initializeFileList();
    await this.initializationPromise;
  }

  private async ensureInitialized(): Promise<void> {
    if (this.initializationPromise) {
      await this.initializationPromise;
    }
  }

  public dispose(): void {
    this.disposables.forEach((d) => d.dispose());
  }
}
