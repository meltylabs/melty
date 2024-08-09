import { useState } from "react";
import { CopyIcon, CheckIcon } from "lucide-react";
import { Button } from "./ui/button";

const CopyButton = ({ code }: { code: string }) => {
  const [isCopied, setIsCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <button
      onClick={copyToClipboard}
      className="absolute top-2 right-2 bg-gray-800 text-white p-1 rounded-md"
    >
      {isCopied ? (
        <CheckIcon className="h-4 w-4 text-green-500" />
      ) : (
        <CopyIcon className="h-4 w-4" />
      )}
    </button>
  );
};

export default CopyButton;
