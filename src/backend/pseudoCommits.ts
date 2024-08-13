import {
  PseudoCommit,
  PseudoCommitInGit,
  PseudoCommitInMemory,
  MeltyFile,
  GitRepo,
} from "../types";
import * as files from "./meltyFiles";
import * as fs from "fs";
import * as path from "path";
import * as utils from "../util/utils";

function createFromCommitWithUdiffPreview(
  commit: string,
  preview: string
): PseudoCommit {
  return { impl: { status: "committed", commit, udiffPreview: preview } };
}

export async function createFromCommit(
  commit: string,
  gitRepo: GitRepo,
  associateCommitDiffWithPseudoCommit: boolean
): Promise<PseudoCommit> {
  const udiff = associateCommitDiffWithPseudoCommit
    ? await (async () => {
        const repository = gitRepo?.repository;
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
      })()
    : "";

  return createFromCommitWithUdiffPreview(commit, udiff);
}

export function createFromDiffAndParentCommit(
  parentCommit: string,
  filesChanged: { [relativePath: string]: MeltyFile }
): PseudoCommit {
  const pseudoCommitInMemory: PseudoCommitInMemory = {
    status: "inMemory",
    filesChanged: filesChanged,
    parentCommit: parentCommit,
  };
  return {
    impl: pseudoCommitInMemory,
  };
}

/**
 * Creates a new pseudoCommit that is a copy of the previous one, but with udiff reset.
 */
export function createFromPrevious(
  previousPseudoCommit: PseudoCommit
): PseudoCommit {
  if (previousPseudoCommit.impl.status !== "committed") {
    throw new Error(
      "not implemented: createFromPrevious from uncommitted repostate"
    );
  }

  const pseudoCommitInMemory: PseudoCommitInMemory = {
    status: "inMemory",
    filesChanged: {},
    parentCommit: previousPseudoCommit.impl.commit,
  };
  return { impl: pseudoCommitInMemory };
}

export async function diff(
  pseudoCommit: PseudoCommit,
  repository: any
): Promise<string> {
  if (pseudoCommit.impl.status === "inMemory") {
    throw new Error("not implemented: getDiff from committed repostate");
  } else {
    const pseudoCommitInGit = pseudoCommit.impl;
    const commit = pseudoCommitInGit.commit;
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

export function parentCommit(pseudoCommit: PseudoCommit): string | undefined {
  if (pseudoCommit.impl.status === "inMemory") {
    return pseudoCommit.impl.parentCommit;
  } else {
    return undefined;
  }
}

export function commit(pseudoCommit: PseudoCommit): string | undefined {
  if (pseudoCommit.impl.status === "committed") {
    return pseudoCommit.impl.commit;
  } else {
    return undefined;
  }
}

/**
 * Puts files in this repo state onto disk and creates a commit for them if there isn't one yet.
 * Out of caution, it will error if there are uncommitted changes, and it may error
 *   if git is not already on this pseudoCommit's parent (only if changes were previously in memory).
 * If doCommit is false, it will fudge stuff and not actually create a commit.
 * Returns a new pseudoCommit that is guaranteed to track the new commit.
 */
export async function actualize(
  pseudoCommit: PseudoCommit,
  gitRepo: GitRepo,
  doCommit: boolean
): Promise<void> {
  const repository = gitRepo.repository;

  await repository.status();
  // check for uncommitted changes
  if (!utils.repoIsClean(repository)) {
    utils.handleGitError(
      "Actualizing despite unclean repo. Seems a bit weird..."
    );
  }

  if (pseudoCommit.impl.status === "committed") {
    utils.ensureRepoIsOnCommit(repository, pseudoCommit.impl.commit);
    // no update to pseudoCommit needed
  } else {
    let newPseudoCommit = null;
    if (doCommit) {
      const pseudoCommitInMemory = pseudoCommit.impl;

      utils.ensureRepoIsOnCommit(repository, pseudoCommitInMemory.parentCommit);

      const filesChanged = pseudoCommitInMemory.filesChanged;
      Object.entries(filesChanged).forEach(([_path, file]) => {
        fs.mkdirSync(path.dirname(files.absolutePath(file, gitRepo.rootPath)), {
          recursive: true,
        });
        fs.writeFileSync(
          files.absolutePath(file, gitRepo.rootPath),
          files.contents(file)
        );
      });

      await repository.add(
        Object.values(filesChanged).map((file) =>
          files.absolutePath(file, gitRepo.rootPath)
        )
      );

      await repository.commit("bot changes", { empty: true });

      await repository.status();
      const newCommit = repository.state.HEAD!.commit;
      newPseudoCommit = await createFromCommit(newCommit, gitRepo, true);
    } else {
      // fudge things so that we get a "commited" pseudocommit but without no diff
      // TODO I think this is super hacky
      newPseudoCommit = await createFromCommit(
        pseudoCommit.impl.parentCommit,
        gitRepo,
        false
      );
    }

    // update pseudoCommit in place
    pseudoCommit.impl = newPseudoCommit.impl;
  }
}

export function hasFile(
  gitRepo: GitRepo,
  pseudoCommit: PseudoCommit,
  filePath: string
): boolean {
  const fileIsInMemory =
    pseudoCommit.impl.status === "inMemory"
      ? filePath in pseudoCommit.impl.filesChanged
      : false;
  if (fileIsInMemory) {
    return true;
  }

  const baseCommit =
    pseudoCommit.impl.status === "committed"
      ? pseudoCommit.impl.commit
      : pseudoCommit.impl.parentCommit;
  utils.ensureRepoIsOnCommit(gitRepo.repository, baseCommit);
  return fs.existsSync(path.join(gitRepo.rootPath, filePath));
}

export function getFileContents(
  gitRepo: GitRepo,
  pseudoCommit: PseudoCommit,
  filePath: string
): string {
  if (
    pseudoCommit.impl.status === "inMemory" &&
    filePath in pseudoCommit.impl.filesChanged
  ) {
    return files.contents(pseudoCommit.impl.filesChanged[filePath]);
  } else {
    const baseCommit =
      pseudoCommit.impl.status === "committed"
        ? pseudoCommit.impl.commit
        : pseudoCommit.impl.parentCommit;
    utils.ensureRepoIsOnCommit(gitRepo.repository, baseCommit);
    return fs.readFileSync(path.join(gitRepo.rootPath, filePath), "utf8");
  }
}

export function upsertFileContents(
  pseudoCommit: PseudoCommit,
  path: string,
  contents: string
): PseudoCommit {
  const file = files.create(path, contents);

  let { filesChanged, parentCommit } = (() => {
    if (pseudoCommit.impl.status === "inMemory") {
      // another off same parent, updating the list of files changed
      return {
        filesChanged: {
          ...pseudoCommit.impl.filesChanged,
          [path]: file,
        },
        parentCommit: pseudoCommit.impl.parentCommit,
      };
    } else {
      // PseudoCommitInGit: use pseudoCommit as the parent, start a new list of files changed
      return {
        filesChanged: { [path]: file },
        parentCommit: pseudoCommit.impl.commit,
      };
    }
  })();

  return {
    impl: {
      status: "inMemory",
      parentCommit: parentCommit,
      filesChanged: filesChanged,
    },
  };
}

export function getEditedFiles(pseudoCommit: PseudoCommit): string[] {
  if (pseudoCommit.impl.status === "inMemory") {
    return Object.keys(pseudoCommit.impl.filesChanged);
  } else {
    throw new Error("not implemented: getEditedFiles from committed repostate");
  }
}
