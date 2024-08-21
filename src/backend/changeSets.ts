import { ChangeSet, GitRepo } from "../types";
import * as utils from "../util/utils";
import fs from "fs";
import path from "path";
import * as files from "./meltyFiles";

export function createEmpty(): ChangeSet {
  return {
    filesChanged: {},
  };
}

export function isEmpty(changeSet: ChangeSet) {
  return Object.keys(changeSet.filesChanged).length === 0;
}

/**
 * Commits changes in a changeset
 * @param changeSet The change set to apply
 * @param gitRepo The git repo to apply the change set to
 * @returns The new commit hash
 */
export async function commitChangeSet(
  changeSet: ChangeSet,
  gitRepo: GitRepo,
  commitMessage: string
) {
  const repository = gitRepo.repository;
  await repository.status();
  // check for uncommitted changes
  if (!utils.repoIsClean(repository)) {
    utils.handleGitError(
      "Actualizing despite unclean repo. Seems a bit weird..."
    );
  }

  Object.entries(changeSet.filesChanged).forEach(([_path, meltyFile]) => {
    fs.mkdirSync(
      path.dirname(files.absolutePath(meltyFile, gitRepo.rootPath)),
      {
        recursive: true,
      }
    );
    fs.writeFileSync(
      files.absolutePath(meltyFile, gitRepo.rootPath),
      files.contents(meltyFile)
    );
  });

  await repository.add(
    Object.values(changeSet.filesChanged).map((file) =>
      files.absolutePath(file, gitRepo.rootPath)
    )
  );

  await repository.commit(`[by melty] ${commitMessage}`, {
    empty: true,
  });

  await repository.status();
  const newCommit = repository.state.HEAD!.commit;
  return newCommit;
}
