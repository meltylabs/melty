import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { RpcClient } from "../rpcClient";
import { Joule } from "../types";
import CopyButton from "./CopyButton";
import DiffViewer from "./DiffViewer";
import { Button } from "./ui/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "./ui/collapsible";
import { CodeXmlIcon } from "lucide-react";

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
		</div>
	);

	const DiffContent = ({ isHuman }: { isHuman: boolean }) =>
		isHuman ? (
			<Collapsible className="bg-white border border-gray-200 rounded-md">
				<CollapsibleTrigger className="flex items-center text-xs justify-between w-full p-2 bg-white hover:bg-gray-100 rounded-t-md">
					<span className="flex items-center italic">
						<CodeXmlIcon className="h-4 w-4 mr-2" />
						Human wrote some code...
					</span>
					<span className="font-mono text-muted-foreground text-xs">
						{joule.commit?.substring(0, 7)}
					</span>
				</CollapsibleTrigger>
				<CollapsibleContent className="p-2">
					<DiffViewer diff={diffHtml!} />
				</CollapsibleContent>
			</Collapsible>
		) : (
			<>
				<DiffViewer diff={diffHtml!} />
				{!isPartial && isLatestCommit && !undoClicked && (
					<div className="mt-2">
						<Button variant="outline" size="sm" onClick={handleUndo}>
							Undo commit
						</Button>
					</div>
				)}
			</>
		);

	return (
		<div className="mb-2">
			{joule.author === "human" && diffHtml ? (
				<div className="flex flex-col">
					<div className="w-full mb-2">
						<DiffContent isHuman={true} />
					</div>
					<div className="w-full p-2 bg-gray-50 border border-gray-200 rounded-md">
						<MessageContent />
					</div>
				</div>
			) : (
				<div
					className={`flex p-2 rounded-md ${joule.author === "human" ? "bg-gray-50 border border-gray-200" : ""
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
							<DiffContent isHuman={false} />
						</div>
					)}
				</div>
			)}
		</div>
	);
}
