import React from "react";
import ReactMarkdown from "react-markdown";
import { Joule } from "../types";
import CopyButton from "./CopyButton";
import DiffViewer from "./DiffViewer";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

export function JouleComponent({
  joule,
  isPartial = false,
}: {
  joule: Joule;
  isPartial?: boolean;
}) {
  const diffHtml =
    joule.pseudoCommit.impl.status === "committed" &&
    joule.pseudoCommit.impl.udiffPreview
      ? joule.pseudoCommit.impl.udiffPreview
      : null;

  return (
    <div
      className={`flex mb-2 p-3 rounded ${
        joule.author === "human" ? "bg-gray-50" : "bg-white"
      }`}
    >
      <div className="w-[40%] pr-4 overflow-auto h-full">
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
          {isPartial && <span className="animate-pulse">▋</span>}
        </div>
      </div>
      <div className="w-[60%] overflow-auto h-full">
        {diffHtml && !isPartial && <DiffViewer diff={diffHtml} />}
      </div>
    </div>
  );
}
