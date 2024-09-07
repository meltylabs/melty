#!/bin/bash

# Source and destination directories
SRC_DIR="/Users/charlieholtz/Library/Application Support/Code/User"
DEST_DIR="/Users/charlieholtz/Library/Application Support/melty/User"

# Files to copy
FILES=("keybindings.json" "settings.json")

# Create destination directory if it doesn't exist
mkdir -p "$DEST_DIR"

# Copy each file
for file in "${FILES[@]}"; do
    if [ -f "$SRC_DIR/$file" ]; then
        cp "$SRC_DIR/$file" "$DEST_DIR/$file"
        echo "Copied $file to $DEST_DIR"
    else
        echo "Warning: $file not found in $SRC_DIR"
    fi
done

# Verify the copy operation
echo "Verifying copied files..."
for file in "${FILES[@]}"; do
    if [ -f "$DEST_DIR/$file" ]; then
        echo "$file successfully copied to Melty configuration directory"
    else
        echo "Error: $file was not copied successfully"
    fi
done

echo "Done!"
