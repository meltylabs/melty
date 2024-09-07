#!/bin/bash

# Define the Melty function
read -r -d '' MELTY_FUNCTION << EOM
function melty {
    if [[ \$# = 0 ]]
    then
        open -a "Melty"
    else
        local argPath="\$1"
        [[ \$1 = /* ]] && argPath="\$1" || argPath="\$PWD/\${1#./}"
        open -a "Melty" "\$argPath"
    fi
}
EOM

# Determine the user's default shell
USER_SHELL=$(basename "$SHELL")

# Determine the shell configuration file
case "$USER_SHELL" in
    zsh)
        SHELL_CONFIG="$HOME/.zshrc"
        ;;
    bash)
        SHELL_CONFIG="$HOME/.bash_profile"
        ;;
    *)
        echo "Unsupported shell: $USER_SHELL. Please add the function manually to your shell configuration file."
        exit 1
        ;;
esac

# Check if the function already exists in the config file
if grep -q "function melty" "$SHELL_CONFIG"; then
    echo "Melty function already exists in $SHELL_CONFIG. Skipping installation."
else
    # Add the function to the shell configuration file
    echo "" >> "$SHELL_CONFIG"
    echo "# Melty function" >> "$SHELL_CONFIG"
    echo "$MELTY_FUNCTION" >> "$SHELL_CONFIG"
    echo "Melty function added to $SHELL_CONFIG"
fi

# Remind the user to source their configuration file
echo "Please run 'source $SHELL_CONFIG' or start a new terminal session to use the melty function."
