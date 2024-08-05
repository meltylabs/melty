import React from 'react';

interface SearchReplaceBlockProps {
  searchContent: string;
  replaceContent: string;
}

export const SearchReplaceBlock: React.FC<SearchReplaceBlockProps> = ({
  searchContent,
  replaceContent
}) => {
  return (
    <div className="border rounded-md p-2 mb-2 text-xs">
      <div className="mb-2">
        <span className="font-semibold">Search:</span>
        <pre className="bg-gray-100 p-1 rounded mt-1">{searchContent}</pre>
      </div>
      <div>
        <span className="font-semibold">Replace:</span>
        <pre className="bg-gray-100 p-1 rounded mt-1">{replaceContent}</pre>
      </div>
    </div>
  );
};
