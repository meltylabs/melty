import React, { useState, useContext } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { RpcClient } from "../RpcClient";
import { Joule, JouleHumanChat, JouleBotChat, JouleBotCode } from "../types";
import CopyButton from "./CopyButton";
import DiffContent from "./DiffContent";
import { MeltyConfigContext } from '@/MeltyConfig';

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
	const meltyConfig = useContext(MeltyConfigContext);

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

	function copyExecInfo(joule: JouleBotChat | JouleBotCode) {
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
		navigator.clipboard.writeText(execInfoFormat)
	}

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
								{meltyConfig.debugMode &&
									<button onClick={() => copyExecInfo(joule)}>Copy exec info</button>}
							</div>
							<div className="w-[60%] overflow-auto h-full">
								{renderDiffContent(joule as JouleBotCode)}
							</div>
						</div>
					) : (
						<div className="w-full pr-4 overflow-auto h-full">
							{renderMessageContent(joule)}
							{meltyConfig.debugMode &&
								<button onClick={() => copyExecInfo(joule)}>Copy exec info</button>}
						</div>
					)}
				</div>
			);

		default:
			return null;
	}

}
