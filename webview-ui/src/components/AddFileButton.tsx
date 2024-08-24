export function AddFileButton({
  keyboardShortcut,
}: {
  keyboardShortcut: string;
}) {
  return (
    <span className="text-xs text-muted-foreground">
      <kbd className="ml-1.5 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
        <span className="text-xs">{keyboardShortcut}</span>
      </kbd>{" "}
      to add a file
    </span>
  );
}
