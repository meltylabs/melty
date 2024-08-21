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
 * Applies a change set to disk. No git stuff.
 * @param changeSet The change set to apply
 * @param gitRepo The git repo to apply the change set to
 */
export function applyChangeSet(changeSet: ChangeSet, rootPath: string): void {
  Object.entries(changeSet.filesChanged).forEach(
    ([_path, { original, updated }]) => {
      fs.mkdirSync(path.dirname(files.absolutePath(updated, rootPath)), {
        recursive: true,
      });
      fs.writeFileSync(
        files.absolutePath(updated, rootPath),
        files.contents(updated)
      );
    }
  );
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

  applyChangeSet(changeSet, gitRepo.rootPath);

  await repository.add(
    Object.values(changeSet.filesChanged).map(
      ({ original, updated }) => files.absolutePath(updated, gitRepo.rootPath) // either original or updated works here
    )
  );

  await repository.commit(`[by melty] ${commitMessage}`, {
    empty: true,
  });

  await repository.status();
  const newCommit = repository.state.HEAD!.commit;
  return newCommit;
}
