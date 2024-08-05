export function repoIsClean(repository: any) {
    return (repository.state.workingTreeChanges.length > 0 ||
        repository.state.indexChanges.length > 0 ||
        repository.state.mergeChanges.length > 0);
}