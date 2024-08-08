export function repoIsClean(repository: any) {
    return (!repository.state.workingTreeChanges.length &&
        !repository.state.indexChanges.length &&
        !repository.state.mergeChanges.length);
}

export function ensureRepoIsOnCommit(repo: any, commit: string) {
    // if (repo.state.HEAD?.commit !== commit) {
    //     throw new Error(`Expected repo to be on commit ${commit} but found ${repo.state.HEAD?.commit}`);
    // }
}