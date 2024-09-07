#!/bin/bash

# Source and destination directories
SRC_DIR="$HOME/.vscode/extensions"
DEST_DIR="$HOME/.meltycode/extensions"

# Check if source directory exists
if [ ! -d "$SRC_DIR" ]; then
    echo "Error: VS Code extensions directory not found at $SRC_DIR"
    exit 1
fi

# Create destination directory if it doesn't exist
mkdir -p "$DEST_DIR"

# Copy files
echo "Copying VS Code extensions to Melty..."
cp -R "$SRC_DIR"/* "$DEST_DIR"

# Check if copy was successful
if [ $? -eq 0 ]; then
    echo "Successfully copied VS Code extensions to $DEST_DIR"
else
    echo "Error occurred while copying extensions"
    exit 1
fi

# Count number of copied extensions
NUM_EXTENSIONS=$(ls -1 "$DEST_DIR" | wc -l)
echo "Copied $NUM_EXTENSIONS extension(s)"

echo "Done!"

