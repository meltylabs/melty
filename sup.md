# Sup

This is a new markdown file.

## Welcome

Hello there! This file was created as requested.

## Git Undo Last Commit

To undo the last Git commit while keeping the changes in your working directory, use:

```
git reset --soft HEAD~1
```

This command will undo the last commit, but keep the changes from that commit in your working directory. The changes will be staged and ready to be committed again if you wish.

If you want to completely remove the last commit and all its changes, use:

```
git reset --hard HEAD~1
```

Be cautious with the hard reset as it will permanently delete the changes from the last commit.
