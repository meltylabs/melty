import * as React from "react";
import {
  Calculator,
  Calendar,
  CreditCard,
  Settings,
  Smile,
  User,
  File,
} from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "./ui/command";

// Add this helper function
const getFileIcon = (filePath: string) => {
  const extension = filePath.split('.').pop()?.toLowerCase();
  if (extension === 'ts' || extension === 'tsx') {
    return <img src="/typescript-logo.svg" alt="TypeScript" className="mr-2 h-4 w-4" />;
  }
  return <File className="mr-2 h-4 w-4" />;
};

export function FilePicker({
  workspaceFilePaths,
  meltyFilePaths,
  handleAddFile,
}: {
  meltyFilePaths: string[];
  workspaceFilePaths: string[];
  handleAddFile: (filePath: string) => void;
}) {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Check for Cmd+Shift+m on Mac or Ctrl+Shift+m on Windows/Linux
      if (event.key === "\\") {
        event.preventDefault(); // Prevent default browser behavior
        setOpen(true);
      }
    };

    document.addEventListener("keydown", handleKeyPress);
    return () => document.removeEventListener("keydown", handleKeyPress);
  }, []);

  return (
    <>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput id="file" placeholder="Type a file name" />
        <CommandList>
          <CommandEmpty>All files in workspace are in context.</CommandEmpty>
          {/* todo - would be nice to show recent or suggested here */}
          <CommandGroup heading="Files">
            {workspaceFilePaths
              .filter((filePath) => !meltyFilePaths.includes(filePath))
              .map((filePath: string) => (
                <CommandItem
                  onSelect={() => handleAddFile(filePath)}
                  key={filePath}
                >
                  {getFileIcon(filePath)}
                  <span>{filePath}</span>
                </CommandItem>
              ))}
          </CommandGroup>
          <CommandSeparator />
        </CommandList>
      </CommandDialog>
    </>
  );
}
