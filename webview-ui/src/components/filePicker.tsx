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

export function FilePicker() {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "j" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <>
      <p className="text-xs text-muted-foreground"></p>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a file name" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Recent">
            <CommandItem>
              <File className="mr-2 h-4 w-4" />
              <span>file1.txt</span>
            </CommandItem>
            <CommandItem>
              <File className="mr-2 h-4 w-4" />
              <span>file2.txt</span>
            </CommandItem>
            <CommandItem>
              <File className="mr-2 h-4 w-4" />
              <span>file3.txt</span>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="All">
            <CommandItem>
              <File className="mr-2 h-4 w-4" />
              <span>file4.txt</span>
            </CommandItem>
            <CommandItem>
              <File className="mr-2 h-4 w-4" />
              <span>file5.txt</span>
            </CommandItem>
            <CommandItem>
              <File className="mr-2 h-4 w-4" />
              <span>file6.txt</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
