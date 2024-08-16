import { LoaderCircle } from "lucide-react";
import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { ExtensionRPC } from "../extensionRPC";
import { Joule, PseudoCommitInGit } from "../types";
import CopyButton from "./CopyButton";
import DiffViewer from "./DiffViewer";
import { Button } from "./ui/button";

export function JouleComponent({
  joule,
  isPartial = false,
  latestCommitHash,
}: {
  joule: Joule;
  isPartial?: boolean;
  showUndo?: boolean;
  latestCommitHash?: string;
}) {
  const [extensionRPC] = useState(() => new ExtensionRPC());
  const [undoClicked, setUndoClicked] = useState(false);

  const diffHtml =
    joule.pseudoCommit.impl.status === "committed" &&
    joule.pseudoCommit.impl.udiffPreview
      ? joule.pseudoCommit.impl.udiffPreview
      : null;

  const isLatestCommit =
    latestCommitHash === (joule.pseudoCommit.impl as PseudoCommitInGit).commit;

  const handleUndo = async () => {
    setUndoClicked(true);
    try {
      const result = await extensionRPC.run("undoLatestCommit", {
        commitId: (joule.pseudoCommit.impl as PseudoCommitInGit).commit,
      });
      console.log("Result:", result);
    } catch (error) {
      console.error("Failed to undo commit:", error);
    }
  };

  return (
    <div
      className={`flex mb-2 p-3 rounded ${
        joule.author === "human" ? "bg-gray-50" : "bg-white"
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
                  <div className="relative p-0 max-h-[300px] overflow-y-auto">
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
            <div className="flex mt-4" role="status">
              <LoaderCircle className="w-4 h-4 animate-spin" />
            </div>
          )}
        </div>
      </div>
      <div
        className={`${diffHtml ? "w-[60%]" : "hidden"} overflow-auto h-full`}
      >
        {diffHtml && !isPartial && (
          <>
            <DiffViewer diff={diffHtml} />
            <span className="font-mono text-muted-foreground text-xs">
              {(joule.pseudoCommit.impl as PseudoCommitInGit).commit}
            </span>
            <div className="flex justify-end">
              {joule.author === "bot" &&
                !isPartial &&
                isLatestCommit &&
                !undoClicked && (
                  <Button
                    variant="outline"
                    className="mt-2"
                    onClick={() => {
                      handleUndo();
                    }}
                  >
                    Undo
                  </Button>
                )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
