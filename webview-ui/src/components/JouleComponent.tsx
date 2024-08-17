import { LoaderCircle } from "lucide-react";
import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { RpcClient } from "../rpcClient";
import { Joule } from "../types";
import CopyButton from "./CopyButton";
import DiffViewer from "./DiffViewer";
import { Button } from "./ui/button";

export function JouleComponent({
  joule,
  isPartial = false,
  latestCommitHash,
  showDiff = true,
}: {
  joule: Joule;
  isPartial?: boolean;
  showUndo?: boolean;
  latestCommitHash?: string;
  showDiff?: boolean;
}) {
  const [rpcClient] = useState(() => new RpcClient());
  const [undoClicked, setUndoClicked] = useState(false);

  const diffHtml =
    showDiff && joule.diffInfo?.diffPreview ? joule.diffInfo.diffPreview : null;

  const isLatestCommit = latestCommitHash === joule.commit;

  const handleUndo = async () => {
    setUndoClicked(true);
    try {
      const result = await rpcClient.run("undoLatestCommit", {
        commitId: joule.commit,
      });
      console.log("Result:", result);
    } catch (error) {
      console.error("Failed to undo commit:", error);
    }
  };

  return (
    <div
      className={`flex mb-2 p-2 rounded-md ${
        joule.author === "human"
          ? "bg-gray-50 border border-gray-200"
          : "bg-white"
      }`}
    >
      <div
        className={`${
          diffHtml ? "w-[40%]" : "w-full"
        } pr-4 overflow-auto h-full`}
      >
        <div className="text-xs prose">
          <ReactMarkdown
            components={{
              code({ node, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || "");
                if (match && match[1] === "codechange") {
                  return (
                    <details>
                      <summary>Writing code...</summary>
                      <pre
                        {...(props as React.DetailedHTMLProps<
                          React.HTMLAttributes<HTMLPreElement>,
                          HTMLPreElement
                        >)}
                      >
                        <code className={className}>{children}</code>
                      </pre>
                    </details>
                  );
                }
                return match ? (
                  <div className="relative p-0 max-h-[300px] overflow-y-auto no-scrollbar">
                    {!isPartial && (
                      <CopyButton code={String(children).replace(/\n$/, "")} />
                    )}
                    <SyntaxHighlighter
                      language={match[1]}
                      style={vscDarkPlus}
                      PreTag="div"
                      children={String(children).replace(/\n$/, "")}
                    />
                  </div>
                ) : (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              },
            }}
          >
            {joule.message}
          </ReactMarkdown>
          {isPartial && (
            <div className="flex my-3" role="status">
              <LoaderCircle className="w-4 h-4 animate-spin" />
            </div>
          )}
        </div>
      </div>
      {showDiff && (
        <div
          className={`${diffHtml ? "w-[60%]" : "hidden"} overflow-auto h-full`}
        >
          {diffHtml && !isPartial && (
            <>
              <DiffViewer diff={diffHtml} />
              <div className="flex justify-between items-center mt-1">
                <span className="font-mono text-muted-foreground text-xs">
                  {joule.commit?.substring(0, 7)}
                </span>
                {joule.author === "bot" &&
                  !isPartial &&
                  isLatestCommit &&
                  !undoClicked && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        handleUndo();
                      }}
                    >
                      Undo commit
                    </Button>
                  )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
