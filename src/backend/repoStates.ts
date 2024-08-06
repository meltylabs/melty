import { Uri } from "vscode";
import { MeltyFile } from "../types";
import * as files from "./meltyFiles";
import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import * as utils from "./utils/utils";

export type RepoState = {
  readonly repo: any;
  readonly workspaceRoot: string;
  impl: RepoStateInMemory | RepoStateCommitted;
};

type RepoStateCommitted = {
  readonly status: "committed";
  readonly commit: string;
};

type RepoStateInMemory = {
  readonly status: "inMemory";
  readonly parentCommit: string;
  readonly filesChanged: { [relativePath: string]: MeltyFile };
};

export function createFromCommit(
  repo: any,
  workspaceRoot: string,
  commit: string
): RepoState {
  return { repo, workspaceRoot, impl: { status: "committed", commit } };
}

export function createFromCommitAndDiff(
  repo: any,
  workspaceRoot: string,
  parentCommit: string,
  filesChanged: { [relativePath: string]: MeltyFile }
): RepoState {
  const repoStateInMemory: RepoStateInMemory = {
    status: "inMemory",
    filesChanged: filesChanged,
    parentCommit: parentCommit,
  };
  return { repo, workspaceRoot, impl: repoStateInMemory };
}

// export function createCopyParent(parentRepoState: RepoState): RepoState {
//     if (parentRepoState.impl.status !== "committed") {
//         throw new Error("not implemented: createCopyParent from uncommitted repostate");
//     }

//     const repoStateInMemory: RepoStateInMemory = {
//         status: "inMemory",
//         filesChanged: {},
//         parentCommit: parentRepoState.impl.commit,
//     };
//     return { workspaceRoot: parentRepoState.workspaceRoot, repo: parentRepoState.repo, impl: repoStateInMemory };
// }

export async function diff(
  repoState: RepoState,
  repository: any
): Promise<string> {
  if (repoState.impl.status === "inMemory") {
    throw new Error("not implemented: getDiff from committed repostate");
  } else {
    const repoStateCommitted = repoState.impl;
    const commit = repoStateCommitted.commit;
    const diff = await repository.diffBetween(commit + "^", commit);
    const udiffs = await Promise.all(
      diff.map(async (change: any) => {
        return await repository.diffBetween(
          commit + "^",
          commit,
          change.uri.fsPath
        );
      })
    );
    return udiffs.join("\n");
  }
}

export function parentCommit(repoState: RepoState): string | undefined {
  if (repoState.impl.status === "inMemory") {
    return repoState.impl.parentCommit;
  } else {
    return undefined;
  }
}

export function commit(repoState: RepoState): string | undefined {
  if (repoState.impl.status === "committed") {
    return repoState.impl.commit;
  } else {
    return undefined;
  }
}

/**
 * Puts files in this repo state onto disk and creates a commit for them if there isn't one yet.
 * Out of caution, it will error if there are uncommitted changes, and it may error
 *   if git is not already on this repoState's parent (only if changes were previously in memory).
 * Returns a new repoState that is guaranteed to track the new commit.
 */
export async function actualize(
  repoState: RepoState,
  repository: any
): Promise<void> {
  await repository.status();
  // check for uncommitted changes
  if (!utils.repoIsClean(repository)) {
    throw new Error("Please commit or stash changes before actualizing");
  }

  if (repoState.impl.status === "committed") {
    utils.ensureRepoIsOnCommit(repository, repoState.impl.commit);
    // no update to repoState needed
  } else {
    const repoStateInMemory = repoState.impl;

    utils.ensureRepoIsOnCommit(repository, repoStateInMemory.parentCommit);

    const filesChanged = repoStateInMemory.filesChanged;
    Object.entries(filesChanged).forEach(([_path, file]) => {
      fs.mkdirSync(path.dirname(files.absolutePath(file)), {
        recursive: true,
      });
      fs.writeFileSync(files.absolutePath(file), files.contents(file));
    });

    await repository.add(
      Object.values(filesChanged).map((file) => files.absolutePath(file))
    );
    await repository.commit("bot changes", { empty: true });

    await repository.status();
    const newCommit = repository.state.HEAD!.commit;
    const repoStateCommitted: RepoStateCommitted = {
      status: "committed",
      commit: newCommit,
    };

    // update repoState in place
    repoState.impl = repoStateCommitted;
  }
}

export function hasFile(repoState: RepoState, filePath: string): boolean {
  if (repoState.impl.status === "inMemory") {
    return filePath in repoState.impl.filesChanged;
  } else {
    utils.ensureRepoIsOnCommit(repoState.repo, repoState.impl.commit);
    return fs.existsSync(path.join(repoState.workspaceRoot, filePath));
  }
}

export function getFileContents(
  repoState: RepoState,
  filePath: string
): string {
  if (repoState.impl.status === "inMemory") {
    return files.contents(repoState.impl.filesChanged[filePath]);
  } else {
    utils.ensureRepoIsOnCommit(repoState.repo, repoState.impl.commit);
    return fs.readFileSync(
      path.join(repoState.workspaceRoot, filePath),
      "utf8"
    );
  }
}

export function upsertFileContents(
  repoState: RepoState,
  path: string,
  contents: string
): RepoState {
  const file = files.create(path, contents, repoState.workspaceRoot);

  let { filesChanged, parentCommit } = (() => {
    if (repoState.impl.status === "inMemory") {
      // another off same parent, updating the list of files changed
      return {
        filesChanged: { ...repoState.impl.filesChanged, [path]: file },
        parentCommit: repoState.impl.parentCommit,
      };
    } else {
      // RepoStateCommitted: use repoState as the parent, start a new list of files changed
      return {
        filesChanged: { [path]: file },
        parentCommit: repoState.impl.commit,
      };
    }
  })();

  return {
    repo: repoState.repo,
    workspaceRoot: repoState.workspaceRoot,
    impl: {
      status: "inMemory",
      parentCommit: parentCommit,
      filesChanged: filesChanged,
    },
  };
}
