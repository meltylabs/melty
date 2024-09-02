import React, { useState, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { RpcClient } from "../RpcClient";
import { Joule } from "../types";
import CopyButton from "./CopyButton";
import DiffContent from "./DiffContent";

export function JouleComponent({
	joule,
	isPartial = false,
	isLatestCommit,
	showDiff = true,
}: {
	joule: Joule;
	isPartial?: boolean;
	isLatestCommit: boolean;
	showUndo?: boolean;
	showDiff?: boolean;
}) {
	const rpcClient = RpcClient.getInstance();

	const [undoClicked, setUndoClicked] = useState(false);

	const diffHtml =
		showDiff && joule.diffInfo?.diffPreview ? joule.diffInfo.diffPreview : null;

	const handleUndo = async () => {
		setUndoClicked(true);
		await rpcClient.run("undoLatestCommit", {
			commitId: joule.commit,
		});
	};

	if (joule.state === "error") {
		return (
			<div className="text-red-800">Oops, something went wrong. Try again?</div>
		);
	}

	const MessageContent = () => (
		<div className="text-xs prose dark:prose-invert">
			<ReactMarkdown
				components={{
					code({ node, className, children, ...props }) {
						const match = /language-(\w+)/.exec(className || "");
						if (match && match[1] === "codechange") {
							return (
								<details>
									<summary className='py-2'>Writing code...</summary>
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
		</div>
	);

	return (
		<div className="mb-2">
			{joule.author === "human" && diffHtml ? (
				<div className="flex flex-col">
					<div className="w-full mb-2">
						<DiffContent
							isHuman={true}
							diffHtml={diffHtml}
							jouleCommit={joule.commit}
							isPartial={isPartial}
							isLatestCommit={isLatestCommit}
							undoClicked={undoClicked}
							handleUndo={handleUndo}
						/>
					</div>
					<div className="w-full p-2 bg-gray-50 dark:bg-gray-800 dark:text-white border border-gray-200 rounded-md">
						<MessageContent />
					</div>
				</div>
			) : (
				<div
					className={`flex p-2 rounded-md ${joule.author === "human" ? "bg-gray-50 dark:bg-gray-800 dark:text-white border border-gray-200" : ""
						}`}
				>
					<div
						className={`${diffHtml ? "w-[40%]" : "w-full"
							} pr-4 overflow-auto h-full`}
					>
						<MessageContent />
					</div>
					{showDiff && diffHtml && (
						<div className="w-[60%] overflow-auto h-full">
							<DiffContent
								isHuman={false}
								diffHtml={diffHtml}
								jouleCommit={joule.commit}
								isPartial={isPartial}
								isLatestCommit={isLatestCommit}
								undoClicked={undoClicked}
								handleUndo={handleUndo}
							/>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
