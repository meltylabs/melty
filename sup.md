# Sup

This is a new markdown file.

## Welcome

Hello there! This file was created as requested.

## Git Undo Last Commit

To undo the last Git commit while keeping the changes in your working directory, use:

```python
import subprocess

def undo_last_commit(hard=False):
    command = ["git", "reset", "--hard" if hard else "--soft", "HEAD~1"]
    result = subprocess.run(command, capture_output=True, text=True)
    if result.returncode == 0:
        print("Last commit undone successfully.")
        if not hard:
            print("Changes from the last commit are now staged.")
    else:
        print(f"Error undoing last commit: {result.stderr}")

# Usage:
# undo_last_commit()  # For soft reset
# undo_last_commit(hard=True)  # For hard reset
```

This Python function uses the `subprocess` module to run Git commands. It provides a programmatic way to undo the last commit, with an option for both soft and hard resets.

Be cautious with the hard reset as it will permanently delete the changes from the last commit.
