import * as vscode from "vscode";
import * as config from "./util/config";
import * as path from "path";
import { WebviewNotifier } from "./webviewNotifier";

/**
 * Handles both workspace files and meltyMind files
 */
export class FileManager {
  private disposables: vscode.Disposable[] = [];
  private initializationPromise: Promise<void> | null = null;
  private webviewNotifier: WebviewNotifier;
  private meltyRoot: string;

  private workspaceFiles: vscode.Uri[] = [];
  private meltyMindFiles: Set<string> = new Set();

  constructor(bridgeToWebview: WebviewNotifier, meltyRoot: string) {
    this.initializationPromise = this.initializeFileList();
    this.registerEventListeners();
    this.webviewNotifier = bridgeToWebview;
    this.meltyRoot = meltyRoot;
  }

  public loadMeltyMindFiles(relPaths: string[]) {
    this.meltyMindFiles = new Set(relPaths);
    this.webviewNotifier.sendNotification("updateMeltyMindFiles", {
      files: relPaths,
    });
  }

  public dumpMeltyMindFiles(): string[] {
    return Array.from(this.meltyMindFiles);
  }

  private async initializeFileList(): Promise<void> {
    this.workspaceFiles = await vscode.workspace.findFiles(
      "**/*",
      config.getExcludesGlob()
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

    this.webviewNotifier.sendNotification("updateWorkspaceFiles", {
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
    event.files.forEach((deletedFile) => {
      const relPath = path.relative(this.meltyRoot, deletedFile.fsPath);
      this.meltyMindFiles.delete(relPath);
    });

    this.webviewNotifier.sendNotification("updateWorkspaceFiles", {
      files: await this.getWorkspaceFilesRelative(),
    });
    this.webviewNotifier.sendNotification("updateMeltyMindFiles", {
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
      const oldRelPath = path.relative(this.meltyRoot, oldUri.fsPath);
      const newRelPath = path.relative(this.meltyRoot, newUri.fsPath);
      if (this.meltyMindFiles.has(oldRelPath)) {
        this.meltyMindFiles.delete(oldRelPath);
        this.meltyMindFiles.add(newRelPath);
      }
    });
    this.webviewNotifier.sendNotification("updateWorkspaceFiles", {
      files: await this.getWorkspaceFilesRelative(),
    });
    this.webviewNotifier.sendNotification("updateMeltyMindFiles", {
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
    return Array.from(this.meltyMindFiles);
  }

  public async addMeltyMindFile(relPath: string, notify: boolean = false) {
    // TODO: we should probably get rid of the synchronous return and always rely on the
    // notifier?
    const absPath = path.join(this.meltyRoot, relPath);

    // first, add to workspace files if needed
    // (we call this method on file creation)
    if (!this.workspaceFiles.find((file) => file.fsPath === absPath)) {
      this.workspaceFiles.push(vscode.Uri.file(absPath));
      this.webviewNotifier.sendNotification("updateWorkspaceFiles", {
        files: await this.getWorkspaceFilesRelative(),
      });
    }

    this.meltyMindFiles.add(relPath);
    if (notify) {
      this.webviewNotifier.sendNotification("updateMeltyMindFiles", {
        files: await this.getMeltyMindFilesRelative(),
      });
    }
  }

  public dropMeltyMindFile(relPath: string) {
    this.meltyMindFiles.delete(relPath);
    // this.outputChannel.appendLine(`Dropped file: ${relPath}`);
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
