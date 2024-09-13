import React, { useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { RpcClient } from "../RpcClient";
import { Joule, JouleHumanChat, JouleBotChat, JouleBotCode } from "../types";
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

	const handleUndo = async () => {
		const jouleBotCode = joule as JouleBotCode;
		setUndoClicked(true);
		await rpcClient.run("undoLatestCommit", {
			commitId: jouleBotCode.codeInfo.commit,
		});
	};

	if (joule.jouleState === "error") {
		return (
			<div className="text-red-800">Oops, something went wrong. Try again?</div>
		);
	}

	const renderMessageContent = (joule: JouleHumanChat | JouleBotChat | JouleBotCode) => (
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

	function shouldShowDiff(joule: Joule) {
		if (joule.jouleType !== 'HumanChat' && joule.jouleType !== 'BotCode') {
			return false;
		}
		return showDiff && joule.codeInfo?.diffInfo?.diffPreview;
	}

	const renderDiffContent = (joule: JouleHumanChat | JouleBotCode) => {
		const diffHtml = joule.codeInfo!.diffInfo!.diffPreview;

		return <DiffContent
			isHuman={joule.jouleType === 'HumanChat'}
			diffHtml={diffHtml}
			jouleCommit={joule.codeInfo!.commit}
			isPartial={isPartial}
			isLatestCommit={isLatestCommit}
			undoClicked={undoClicked}
			handleUndo={handleUndo}
		/>
	};

	const [copiedStates, setCopiedStates] = useState<{ [key: string]: boolean }>({});

	const copyExecInfo = useCallback((joule: JouleBotChat | JouleBotCode) => {
		const execInfoFormat = `
rawInput
======
SYSTEM: ${joule.botExecInfo.rawInput.system}

${joule.botExecInfo.rawInput.messages.map(m => `${m.role}: ${m.content}`).join("\n\n")}
======
rawOutput
======
${joule.botExecInfo.rawOutput}
======`;
		navigator.clipboard.writeText(execInfoFormat).then(() => {
			setCopiedStates(prev => ({ ...prev, [joule.id]: true }));
			setTimeout(() => {
				setCopiedStates(prev => ({ ...prev, [joule.id]: false }));
			}, 2000);
		});
	}, []);

	switch (joule.jouleType) {
		case 'HumanChat':
			return (
				<div className="mb-2 flex">
					{shouldShowDiff(joule) ? (
						<div className="flex flex-col">
							{<div className="w-full mb-2">
								{renderDiffContent(joule)}
							</div>}
							<div className="w-full p-2 bg-gray-50 dark:bg-gray-800 dark:text-white border border-gray-200 rounded-md">
								{renderMessageContent(joule)}
							</div>
						</div>
					) : (
						<div className="w-full p-2 bg-gray-50 dark:bg-gray-800 dark:text-white border border-gray-200 rounded-md">
							{renderMessageContent(joule)}
						</div>
					)}
				</div>
			);

		case 'HumanConfirmCode':
			// Render content for HumanConfirmCode
			return (
				<div className="mb-2">
					{/* Add appropriate content for HumanConfirmCode */}
				</div>
			);

		case 'BotChat':
		case 'BotCode':
			return (
				<div className="mb-2">
					{shouldShowDiff(joule) ? (
						<div className="flex">
							<div className="w-[40%] pr-4 overflow-auto h-full">
								{renderMessageContent(joule)}
							</div>
							<div className="w-[60%] overflow-auto h-full">
								{renderDiffContent(joule as JouleBotCode)}
							</div>
							<button
								onClick={() => copyExecInfo(joule)}
								className={`ml-2 px-3 py-1 text-white rounded transition-colors duration-200 flex items-center ${
									copiedStates[joule.id] ? 'bg-green-500 hover:bg-green-600' : 'bg-blue-500 hover:bg-blue-600'
								}`}
								title="Copy execution information"
							>
								<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
								</svg>
								{copiedStates[joule.id] ? 'Copied!' : 'Copy exec info'}
							</button>
						</div>
					) : (
						<div className="w-full pr-4 overflow-auto h-full">
							{renderMessageContent(joule)}
							<button onClick={() => copyExecInfo(joule)}>Copy exec info</button>
						</div>
					)}
				</div>
			);

		default:
			return null;
	}

}
