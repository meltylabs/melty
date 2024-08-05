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
      // Check for Cmd+Shift+C on Mac or Ctrl+Shift+C on Windows/Linux
      if (
        (event.metaKey || event.ctrlKey) &&
        event.shiftKey &&
        event.key === "C"
      ) {
        event.preventDefault(); // Prevent default browser behavior
        setOpen(true);
      }
    };

    document.addEventListener("keydown", handleKeyPress);
    return () => document.removeEventListener("keydown", handleKeyPress);
  }, []);

  return (
    <>
      <p className="text-xs text-muted-foreground"></p>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput id="file" placeholder="Type a file name" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {/* todo - would be nice to show recent or suggested here */}
          <CommandGroup heading="All">
            {workspaceFilePaths
              .filter((filePath) => !meltyFilePaths.includes(filePath))
              .map((filePath: string) => (
                <CommandItem
                  onSelect={() => handleAddFile(filePath)}
                  key={filePath}
                >
                  <File className="mr-2 h-4 w-4" />
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
