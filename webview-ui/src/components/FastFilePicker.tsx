import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogTrigger } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { FixedSizeList as List } from "react-window";

interface PopoverSearchProps {
  workspaceFilePaths: string[];
  meltyMindFilePaths: string[];
  onFileSelect: (file: string) => void;
  onFileDrop: (file: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export const FastFilePicker: React.FC<PopoverSearchProps> = ({
  workspaceFilePaths,
  meltyMindFilePaths,
  onFileSelect,
  onFileDrop,
  isOpen,
  setIsOpen,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredFiles, setFilteredFiles] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<List>(null);

  useEffect(() => {
    const filtered = workspaceFilePaths.filter((file) =>
      file.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredFiles(filtered);
    setSelectedIndex(0);
  }, [searchQuery, workspaceFilePaths]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, filteredFiles.length - 1));
      listRef.current?.scrollToItem(selectedIndex + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
      listRef.current?.scrollToItem(selectedIndex - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredFiles[selectedIndex]) {
        onFileSelect(filteredFiles[selectedIndex]);
        setIsOpen(false);
      }
    }
  };

  const Row = ({
    index,
    style,
  }: {
    index: number;
    style: React.CSSProperties;
  }) => {
    const file = filteredFiles[index];
    const isInMeltyMind = meltyMindFilePaths.includes(file);
    return (
      <div
        style={{
          ...style,
          display: "flex",
          alignItems: "center",
          padding: "0 8px",
        }}
        className={`cursor-pointer rounded-md ${
          index === selectedIndex ? "bg-gray-100" : ""
        } ${isInMeltyMind ? "bg-blue-50" : ""}`}
        onClick={() => {
          isInMeltyMind ? onFileDrop(file) : onFileSelect(file);
          setIsOpen(false);
        }}
      >
        <div
          className={`truncate ${
            isInMeltyMind ? "font-bold text-blue-600" : ""
          }`}
          title={file}
        >
          {file}
        </div>
      </div>
    );
  };

  React.useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === "\\") {
        event.preventDefault();
        setIsOpen(!isOpen);
      }
    };

    document.addEventListener("keydown", handleKeyPress);
    return () => document.removeEventListener("keydown", handleKeyPress);
  }, [isOpen, setIsOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {/* <DialogTrigger asChild>
        <Button variant="outline" onClick={() => setIsOpen(true)}>
          Search Files
        </Button>
      </DialogTrigger> */}
      <DialogContent className="sm:max-w-[425px]">
        <div className="p-0">
          <Input
            ref={inputRef}
            placeholder="Type a filename..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        {filteredFiles.length > 0 ? (
          <List
            ref={listRef}
            height={300}
            itemCount={filteredFiles.length}
            itemSize={28}
            width={"100%"}
          >
            {Row}
          </List>
        ) : (
          <div className="p-4 text-center text-gray-500">No files found</div>
        )}
      </DialogContent>
    </Dialog>
  );
};
