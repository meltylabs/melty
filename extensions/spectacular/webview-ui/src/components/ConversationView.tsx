import React, { useState, useEffect, useMemo, useCallback, useRef, memo, useLayoutEffect } from "react";
import { useParams } from "react-router-dom";
import {
	XIcon,
	ArrowUp,
	ArrowLeft,
	ArrowDown,
	LoaderCircle,
} from "lucide-react";
import posthog from "posthog-js";
import { FastFilePicker } from "./FastFilePicker";
import AutoExpandingTextarea from "./AutoExpandingTextarea";
import { Button } from './ui/button'
import { RpcClient } from "@/RpcClient";
import { JouleComponent, IJouleComponentProps } from "./JouleComponent";
import * as strings from "@/utilities/strings";
import { EventManager } from '@/eventManager';
import { DehydratedTask, nextJouleType, Joule } from "@/types";
import { useNavigate } from "react-router-dom";

/**
 * If Joules are not deeply equal, returns false
 * If they are deeply equal, usually returns true (but not guaranteed)
 */
function joulesEq(joule1: Joule, joule2: Joule) {
	if (Object.is(joule1, joule2)) {
		return true;
	} else if (joule1.jouleState !== "partial" && joule2.jouleState !== "partial") {
		return joule1.id == joule2.id;
	} else {
		// they might still be the same
		return false;
	}
}

const MemoizedJouleComponent = memo(JouleComponent,
	(props1: IJouleComponentProps, props2: IJouleComponentProps) => {
		// note coupling to IJouleComponentProps definition
		// using this custom comparator so that we can compare joules by id
		return props1.isLatestCommit == props2.isLatestCommit
			&& props1.isPartial == props2.isPartial
			&& props1.showDiff == props2.showDiff
			&& joulesEq(props1.joule, props2.joule);
	}
);
const rpcClient = RpcClient.getInstance();

export function ConversationView() {
	const { taskId } = useParams<{ taskId: string }>();
	const inputRef = useRef<HTMLTextAreaElement>(null);
	const [meltyFiles, setMeltyFiles] = useState<string[]>([]);
	const [workspaceFiles, setWorkspaceFiles] = useState<string[]>([]);
	const [pickerOpen, setPickerOpen] = useState(false);
	const isInitialRender = useRef(true);
	const [task, setTask] = useState<DehydratedTask | null>(null);
	const [messageText, setMessageText] = useState("");
	const conversationRef = useRef<HTMLDivElement>(null);
	const [latestCommitHash, setLatestCommitHash] = useState<string | null>(null);
	const [isAtBottom, setIsAtBottom] = useState(true);
	const navigate = useNavigate();

	const [nonInitialHumanJouleInFlight, setNonInitialHumanJouleInFlight] =
		useState(false);
	const [statusMessage, setStatusMessage] = useState<string | null>(null);

	/**
	 * Determines whether to show the loading indicator. We show it if
	 * - task itself is unset
	 * - task has no messages (indicates that the initial human message is in flight)
	 * - a non initial human message is in flight
	 * - the last message is a human message
	 * - the last message is a partial joule bot message
	 * note that "non-initial human message in flight" can't be inferred from task state,
	 * so we use separate state to track it.
	 */
	function isLoading() {
		return (
			!task ||
			task.conversation.joules.length === 0 ||
			nonInitialHumanJouleInFlight ||
			task?.conversation.joules[task?.conversation.joules.length - 1].jouleType === "HumanChat" ||
			task?.conversation.joules[task?.conversation.joules.length - 1].jouleState === "partial"
		);
	}

	function conversationState() {
		const lastJoule = task?.conversation.joules[task?.conversation.joules.length - 1];
		return lastJoule ? nextJouleType(lastJoule) : null;
	}

	async function handleAddFile(file: string) {
		const meltyFiles = await rpcClient.run("addMeltyFile", {
			filePath: file,
		});
		setMeltyFiles(meltyFiles);
		setPickerOpen(false);
	}

	async function handleDropFile(file: string) {
		const meltyFiles = await rpcClient.run("dropMeltyFile", {
			filePath: file,
		});
		setMeltyFiles(meltyFiles);
		setPickerOpen(false);
	}

	useLayoutEffect(() => {
		if (isInitialRender.current) {
			inputRef.current?.focus();
			isInitialRender.current = false;
		}
	}, [taskId]);


	const loadTask = useCallback(async (taskId: string) => {
		console.log("loading active task ", taskId);
		const task = await rpcClient.run("getActiveTask", { taskId });
		setTask(task);
	}, [setTask]);

	const loadFiles = useCallback(async () => {
		const meltyFiles = await rpcClient.run("listMeltyFiles");
		setMeltyFiles(meltyFiles);
		const workspaceFiles = await rpcClient.run("listWorkspaceFiles");
		setWorkspaceFiles(workspaceFiles);
	}, [setMeltyFiles, setWorkspaceFiles]);

	function addJouleHumanChat(text: string, taskId: string) {
		setNonInitialHumanJouleInFlight(true);
		const result = posthog.capture("chatmessage_sent", {
			message: text,
			task_id: taskId,
		});
		console.log("posthog event captured!", result);
		(async () => {
			await rpcClient.run("createJouleHumanChat", { text, taskId });
			rpcClient.run("startBotTurn", { taskId });
		})();
	}

	function addJouleHumanConfirmCode(confirmed: boolean, taskId: string) {
		setNonInitialHumanJouleInFlight(true);
		(async () => {
			await rpcClient.run("createJouleHumanConfirmCode", { confirmed, taskId });
			if (confirmed) { // todo this logic should be centralized in nextJouleType
				rpcClient.run("startBotTurn", { taskId });
			}
		})();
	}

	async function handleCreatePR() {
		const result = await rpcClient.run("createPullRequest");
		console.log("PR created", result);
	}

	// TODO Review scroll behavior for overeager effects

	const checkScrollPosition = () => {
		if (conversationRef.current) {
			const { scrollTop, scrollHeight, clientHeight } = conversationRef.current;
			const isNearBottom = scrollHeight - scrollTop - clientHeight < 25;
			setIsAtBottom(isNearBottom);
		}
	};

	const scrollToBottom = useCallback(() => {
		if (conversationRef.current) {
			conversationRef.current.scrollTop = conversationRef.current.scrollHeight;
		}
		checkScrollPosition();
	}, []);

	useEffect(() => {
		if (isAtBottom) {
			scrollToBottom();
		}
	}, [isAtBottom, scrollToBottom]);

	useEffect(() => {
		const conversationElement = conversationRef.current;
		if (conversationElement) {
			conversationElement.addEventListener("scroll", checkScrollPosition);
			return () =>
				conversationElement.removeEventListener("scroll", checkScrollPosition);
		}
	}, []);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if ((event.metaKey || event.ctrlKey) && event.key === "m") {
				event.preventDefault();
				inputRef.current?.focus();
			}
		};

		window.addEventListener("keydown", handleKeyDown);

		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, []);

	const updateTask = useCallback((task: DehydratedTask) => {
		const lastJoule =
			task.conversation.joules.length > 0 ?
				task.conversation.joules[
				task.conversation.joules.length - 1
				] : undefined;
		if (lastJoule && (lastJoule.jouleType === "HumanChat" || lastJoule.jouleType === "HumanConfirmCode")) {
			setNonInitialHumanJouleInFlight(false);
		}
		setTask(task);
	}, []);

	// Initialization. Everything in here must be wrapped in useCallback.
	useEffect(() => {
		loadFiles();
		if (taskId) {
			loadTask(taskId);
		}

		const handleNotification = (event: MessageEvent) => {
			const message = event.data;
			if (message.type === "notification") {
				console.log(
					"[ConversationView.tsx] Webview received notification message",
					message
				);
				switch (message.notificationType) {
					case "updateTask":
						updateTask(message.task);
						return;
					case "updateWorkspaceFiles":
						setWorkspaceFiles(message.files);
						return;
					case "updateMeltyMindFiles":
						setMeltyFiles(message.files);
						return;
					case "updateStatusMessage":
						setStatusMessage(message.statusMessage);
						return;
				}
			}
		};

		EventManager.Instance.addListener('notification', handleNotification);

		return () => {
			EventManager.Instance.removeListener('notification', handleNotification);
		};
	}, [taskId, loadFiles, loadTask, updateTask]);

	const checkIfLatestCommit = useCallback(async () => {
		const result = await rpcClient.run("getLatestCommit", {});
		setLatestCommitHash(result);
	}, []);

	const lastJouleCommit = useMemo(() => {
		if (!task?.conversation.joules.length) return null;
		const lastJoule = task.conversation.joules[task.conversation.joules.length - 1];
		return lastJoule.jouleType === "HumanChat" || lastJoule.jouleType === "BotCode" ? lastJoule.codeInfo?.commit : null;
	}, [task?.conversation.joules]);

	useEffect(() => {
		if (lastJouleCommit !== null) {
			checkIfLatestCommit();
		}
	}, [lastJouleCommit, checkIfLatestCommit]);


	const handleSubmit = (event: React.FormEvent) => {
		event.preventDefault();
		const form = event.target as HTMLFormElement;
		const message = form.message.value;
		addJouleHumanChat(message, taskId!);
		setMessageText("");
		form.reset();
	};

	const handleConfirmCodeYes = useCallback((event?: React.MouseEvent) => {
		event?.preventDefault();
		addJouleHumanConfirmCode(true, taskId!);
	}, [taskId]);

	const handleConfirmCodeNo = useCallback((event?: React.MouseEvent) => {
		event?.preventDefault();
		addJouleHumanConfirmCode(false, taskId!);
	}, [taskId]);

	const handleTextareaKeyDown = useCallback((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (event.key === "Enter" && !event.shiftKey) {
			event.preventDefault();
			if (event.currentTarget && event.currentTarget.value !== undefined) {
				const form = event.currentTarget.form;
				if (form) {
					addJouleHumanChat(event.currentTarget.value, taskId!);
					setMessageText("");
					event.currentTarget.value = "";
				}
			}
		}
	}, [taskId]);

	const handleBack = useCallback(async () => {
		await rpcClient.run("deactivateTask", { taskId });
		navigate("/");
	}, [taskId, navigate]);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if ((event.metaKey || event.ctrlKey) && event.key === '[') {
				event.preventDefault();
				event.stopPropagation();
				handleBack();
			} else if (event.key === 'Tab') {
				if (conversationState() === "HumanConfirmCode") {
					event.preventDefault();
					event.stopPropagation();
					handleConfirmCodeYes();
				}
			} else if ((event.metaKey || event.ctrlKey) && event.key === 'd') {
				if (conversationState() === "HumanConfirmCode") {
					event.preventDefault();
					event.stopPropagation();
					handleConfirmCodeNo();
				}
			}
		};

		window.addEventListener('keydown', handleKeyDown);

		return () => {
			window.removeEventListener('keydown', handleKeyDown);
		};
	}, [handleBack, handleConfirmCodeYes, handleConfirmCodeNo, conversationState]);

	return (
		<div className="flex flex-col h-[calc(100vh-1rem)] overflow-hidden">
			<div className="mt-2 flex flex-col">
				{!isAtBottom && (
					<button
						onClick={scrollToBottom}
						className="fixed bottom-36 right-4 bg-black text-white p-2 rounded-full shadow-lg z-10"
					>
						<ArrowDown className="h-4 w-4" />
					</button>
				)}
				{task && (
					<div className="mb-2 flex items-center">
						<button onClick={handleBack} className="flex items-center">
							<ArrowLeft className="h-4 w-4" />
							<kbd className="ml-1.5 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
								⌘<span className="text-[8px]">[</span>
							</kbd>
						</button>
						<p className="text-sm font-semibold ml-2">{task.name}</p>
						<div className="ml-auto">
							<Button
								variant="outline"
								onClick={handleCreatePR}
							>
								Create PR
							</Button>
						</div>
					</div>
				)}

				<FastFilePicker
					isOpen={pickerOpen}
					setIsOpen={setPickerOpen}
					meltyMindFilePaths={meltyFiles}
					workspaceFilePaths={workspaceFiles}
					onFileSelect={handleAddFile}
					onFileDrop={handleDropFile}
					stopEscapePropagation
				/>
			</div>
			<div
				className="flex-1 mb-4 rounded overflow-y-auto"
				ref={conversationRef}
			>
				<div className="flex flex-col h-full">
					{task?.conversation.joules.map((joule, index) => (
						<MemoizedJouleComponent
							key={index}
							joule={joule}
							isLatestCommit={
								// isLatestCommit checks that we are actually on a commit and that commit actually matches the joule's commit
								latestCommitHash !== undefined && (
									joule.jouleType === "HumanChat" || joule.jouleType === "BotCode"
								) && latestCommitHash === joule.codeInfo?.commit
							}
							isPartial={joule.jouleState === "partial"}
							showDiff={index !== 0} // Hide diff view for the first message
						/>
					))}
					{isLoading() && (
						<div className="flex my-1 p-2" role="status">
							<LoaderCircle className="w-4 h-4 animate-spin text-gray-500" />
							{statusMessage && (
								<p className="inline ml-2">
									{statusMessage}
									<span>
										<span className="animate-typing-dot">.</span>
										<span className="animate-typing-dot animation-delay-200">
											.
										</span>
										<span className="animate-typing-dot animation-delay-400">
											.
										</span>
									</span>
								</p>
							)}
						</div>
					)}
				</div>
			</div>
			<div className="mb-1.5">
				{conversationState() === "HumanConfirmCode" && (
					<div className="mb-4 flex items-center">
						<p className="text-sm font-medium mr-4">Melty wants to make changes</p>
						<Button onClick={handleConfirmCodeYes} className="mr-2 flex items-center">
							Confirm
							<kbd className="ml-1.5 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
								tab
							</kbd>
						</Button>
						<Button variant="outline" onClick={handleConfirmCodeNo} className="flex items-center">
							Cancel
							<kbd className="ml-1.5 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
								⌘D
							</kbd>
						</Button>
					</div>
				)}
				<form onSubmit={handleSubmit}>
					<div className="mt-4 relative">
						<AutoExpandingTextarea
							placeholder="Talk to Melty"
							id="message"
							className="p-3 pr-12 pb-12 focus-visible:ring-1 max-h-[30vh] overflow-y-auto"
							ref={inputRef}
							required
							value={messageText}
							onChange={(e) => setMessageText(e.target.value)}
							onKeyDown={handleTextareaKeyDown}
							autoFocus={true}
						/>

						{messageText.trim() !== "" && (
							<div
								className={`absolute right-2 top-2 transition-opacity duration-300 ${messageText.trim() !== "" ? "opacity-100" : "opacity-0"
									}`}
							>
								<button
									className="bg-black p-2 rounded-lg text-white"
									name="ask"
									type="submit"
								>
									<ArrowUp className="h-3 w-3" />
								</button>
							</div>
						)}

						{task && (
							<div className="absolute left-2 bottom-2 border-gray-300 px-2 py-1 rounded">
								{strings.getTaskModeName(task.taskMode)}
							</div>
						)}

						<div className="absolute right-2 bottom-2">
							<span className="text-xs text-muted-foreground">
								<kbd className="ml-1.5 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
									<span className="text-xs">@</span>
								</kbd>{" "}
								to add a file
							</span>
						</div>
					</div>
				</form>
				<div className="mt-1">
					<div className="flex overflow-x-auto">
						{meltyFiles.map((file, i) => (
							<button
								onClick={() => handleDropFile(file)}
								className="mt-1 text-xs text-muted-foreground mr-2 mb-2 bg-gray-100 px-2 py-1 inline-flex items-center rounded"
								key={`file-${i}`}
							>
								<XIcon className="h-3 w-3 mr-2" />
								{file}
							</button>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
