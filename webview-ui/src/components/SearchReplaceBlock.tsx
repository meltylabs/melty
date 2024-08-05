import React from 'react';
import { FileIcon, SearchIcon, ReplaceIcon } from "lucide-react";

interface SearchReplaceBlockProps {
  filePath: string;
  searchContent: string;
  replaceContent: string;
}

export const SearchReplaceBlock: React.FC<SearchReplaceBlockProps> = ({
  filePath,
  searchContent,
  replaceContent
}) => {
  return (
    <div className="border rounded-md p-4 mb-4">
      <div className="flex items-center mb-2">
        <FileIcon className="mr-2" size={16} />
        <span className="font-semibold">{filePath}</span>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="flex items-center mb-1">
            <SearchIcon className="mr-2" size={16} />
            <span className="font-semibold">Search</span>
          </div>
          <pre className="bg-gray-100 p-2 rounded text-xs">{searchContent}</pre>
        </div>
        <div>
          <div className="flex items-center mb-1">
            <ReplaceIcon className="mr-2" size={16} />
            <span className="font-semibold">Replace</span>
          </div>
          <pre className="bg-gray-100 p-2 rounded text-xs">{replaceContent}</pre>
        </div>
      </div>
    </div>
  );
};
