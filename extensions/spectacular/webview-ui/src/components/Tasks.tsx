import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { RpcClient } from "../RpcClient";
import { Button } from "./ui/button";
import {
	ArrowUp,
	X,
	CheckCircle,
	XCircle,
	LoaderCircle,
	XIcon,
	CircleHelp,
	MessageCircle,
	LightbulbIcon,
} from "lucide-react";
import { MouseEvent, KeyboardEvent } from "react";
import Ascii from "./Ascii";
import OnboardingSection from './OnboardingSection';
import "diff2html/bundles/css/diff2html.min.css";
import { useNavigate } from "react-router-dom";
import AutoExpandingTextarea from "./AutoExpandingTextarea";
import { DehydratedTask, TaskMode, AssistantInfo } from "../types";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "./ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { AddFileButton } from "./AddFileButton";
import * as strings from "@/utilities/strings";
import { FastFilePicker } from "./FastFilePicker";
import { EventManager } from "@/eventManager";

// Utility function to format the date
function formatDate(date: Date): string {
	const now = new Date();
	const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

	if (diffInSeconds < 60) return `${diffInSeconds} second${diffInSeconds !== 1 ? 's' : ''} ago`;
	if (diffInSeconds < 3600) {
		const minutes = Math.floor(diffInSeconds / 60);
		return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
	}
	if (diffInSeconds < 86400) {
		const hours = Math.floor(diffInSeconds / 3600);
		return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
	}
	if (diffInSeconds < 604800) {
		const days = Math.floor(diffInSeconds / 86400);
		return `${days} day${days !== 1 ? 's' : ''} ago`;
	}

	return date.toLocaleDateString();
}

const rpcClient = RpcClient.getInstance();

export function Tasks({
	initialMeltyMindFiles,
}: {
	initialMeltyMindFiles?: string[];
}) {
	const [tasks, setTasks] = useState<DehydratedTask[]>([]);
	const [messageText, setMessageText] = useState("");
	const [gitConfigError, setGitConfigError] = useState<string | null>(null);
	const navigate = useNavigate();
	const [workspaceFilePaths, setWorkspaceFilePaths] = useState<string[]>([]);
	const [meltyMindFilePaths, setMeltyMindFilePaths] = useState<string[]>(
		initialMeltyMindFiles || []
	);
	const [pickerOpen, setPickerOpen] = useState(false);
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const [shouldFocus, setShouldFocus] = useState(false);
	const [currentMode, setCurrentMode] = useState<AssistantInfo>({
		type: "coder",
		description: "",
	});
	const [suggestions, setSuggestions] = useState<string[]>([]);


	useEffect(() => {
		if (shouldFocus) {
			textareaRef.current?.focus();
			setShouldFocus(false);
		}
	}, [shouldFocus]);

	useEffect(() => {
		if (!pickerOpen) {
			setShouldFocus(true);
		}
	}, [pickerOpen]);

	const fetchAssistantDescription = useCallback(
		async (assistantType: TaskMode) => {
			try {
				const description = await rpcClient.run("getAssistantDescription", {
					assistantType,
				});
				setCurrentMode({ type: assistantType, description });
			} catch (error) {
				console.error("Failed to fetch assistant description:", error);
			}
		}, []
	);

	useEffect(() => {
		fetchAssistantDescription("coder");
	}, [fetchAssistantDescription]);

	// TODO we probably want to run this just once, when Melty loads,
	// rather than when the Tasks view loads
	const fetchTasks = useCallback(async () => {
		console.log("fetching tasks");
		const fetchedTasks = (await rpcClient.run("listTaskPreviews")) as DehydratedTask[];
		const sortedTasks = fetchedTasks.sort(
			(a, b) =>
				new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
		);
		setTasks(sortedTasks);
	}, []);

	const checkGitConfig = useCallback(async () => {
		const possibleError = await rpcClient.run("getGitConfigErrors");
		setGitConfigError(possibleError);
	}, []);

	const deleteTask = useCallback(
		async (taskId: string, e: MouseEvent) => {
			e.preventDefault(); // Prevent link navigation
			e.stopPropagation(); // Prevent event bubbling
			try {
				await rpcClient.run("deleteTask", { taskId });
				await fetchTasks();
				console.log("Task deleted successfully");
			} catch (error) {
				console.error("Failed to delete task:", error);
			}
		},
		[fetchTasks]
	);

	const handleSendMessage = useCallback(async (text: string, taskId: string) => {
		await rpcClient.run("createJouleHumanChat", { text, taskId });
		rpcClient.run("startBotTurn", { taskId });
	}, []);

	/* =====================================================
	 * Unwrapped stuff
	 * ===================================================== */
	async function createNewTask(taskName: string, taskMode: TaskMode) {
		console.log(`[Tasks.tsx] creating new task ${taskName}`);
		const newTaskId = (await rpcClient.run("createTask", {
			name: taskName.trim(),
			taskMode: taskMode,
			files: meltyMindFilePaths,
		})) as string;
		console.log(`[Tasks.tsx] created new task ${newTaskId}`);
		return newTaskId;
	};

	async function handleMessageSend() {
		const message = messageText;
		const taskMode = currentMode.type;
		console.log(`[Tasks] to ${taskMode}`);
		let taskName = message.substring(0, 40);
		if (message.length > 40) {
			taskName = taskName + "...";
		}
		const taskId = await createNewTask(taskName, taskMode);

		const didActivate = await rpcClient.run("activateTask", { taskId });
		if (didActivate) {
			handleSendMessage(message, taskId);
			navigate(`/task/${taskId}`);
		}
	}

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault();
		await handleMessageSend();
	};

	const handleKeyDown = async (event: KeyboardEvent<HTMLTextAreaElement>) => {
		if (event.key === "Enter" && !event.shiftKey) {
			event.preventDefault();

			if (event.currentTarget && event.currentTarget.value !== undefined) {
				const form = event.currentTarget.form;
				if (form) {
					handleMessageSend();
				}
			}
		}
	};

	const fetchFilePaths = useCallback(async () => {
		const workspacePaths = await rpcClient.run("listWorkspaceFiles");
		setWorkspaceFilePaths(workspacePaths);

		if (!initialMeltyMindFiles) {
			const meltyMindPaths = await rpcClient.run("listMeltyFiles");
			setMeltyMindFilePaths(meltyMindPaths);
		}
	}, [initialMeltyMindFiles]); // TODO not sure whether this is a problem

	const handleAddFile = useCallback(
		async (filePath: string) => {
			const updatedMeltyFiles = await rpcClient.run("addMeltyFile", {
				filePath,
			});
			setMeltyMindFilePaths(updatedMeltyFiles);
			setPickerOpen(false);
			setShouldFocus(true);
		},
		[]
	);

	const handleDropFile = useCallback(async (file: string) => {
		const meltyFiles = await rpcClient.run("dropMeltyFile", {
			filePath: file,
		});
		setMeltyMindFilePaths(meltyFiles);
		setPickerOpen(false);
		setShouldFocus(true);
	}, []);

	async function activateAndNavigateToTask(taskId: string) {
		const didActivate = await rpcClient.run("activateTask", { taskId });
		if (didActivate) {
			navigate(`/task/${taskId}`);
		}
	}

	const addSuggestion = useCallback(async (suggestion: string) => {
		setSuggestions(prevSuggestions => {
			const newSuggestions = [...prevSuggestions, suggestion];
			return Array.from(new Set(newSuggestions));
		});
	}, []);


	const handleOpenWorkspaceDialog = useCallback(async () => {
		const didOpen = await rpcClient.run("openWorkspaceDialog", {});
		console.log("did open workspace dialog?", didOpen);
		await checkGitConfig();
		await fetchTasks();
	}, [fetchTasks, checkGitConfig]);


	const handleCreateGitRepo = useCallback(async () => {
		const didCreate = await rpcClient.run("createGitRepository", {});
		console.log("did create git repo?", didCreate);
		await checkGitConfig();
	}, [checkGitConfig]);

	const createAndOpenWorkspace = useCallback(async () => {
		try {
			const result = await rpcClient.run("createAndOpenWorkspace", {});
			if (result) {
				// We don't need to call checkGitConfig and fetchTasks here
				// because VS Code will reload the window when opening a new folder
			} else {
				console.log("User cancelled workspace creation or it failed");
				// We don't need to show an error message here as the user might have just cancelled
			}
		} catch (error) {
			console.error("Error creating and opening workspace:", error);
		}
	}, []);

	// initialization
	useEffect(() => {
		console.log("initializing tasks");
		fetchTasks();
		checkGitConfig();
		fetchFilePaths();

		const handleNotification = (event: MessageEvent) => {
			const message = event.data;
			switch (message.type) {
				case "updateTodo":
					addSuggestion(message.todo);
					break;
				case "updateGitConfigError":
					setGitConfigError(message.errors);
					break;
				default:
					break;
			}
		};

		EventManager.Instance.addListener('notification', handleNotification);

		return () => {
			EventManager.Instance.removeListener('notification', handleNotification);
		};
	}, [fetchTasks, fetchFilePaths, checkGitConfig, addSuggestion]); // DO NOT add anything to the initialization dependency array that isn't a constant



	return (
		<div>
			{gitConfigError === null ? (
				<LoaderCircle className="animate-spin text-gray-500 mr-2 h-4 w-4" />
			) : gitConfigError !== "" ? (
				gitConfigError?.includes("Open a workspace folder") ?
					<div className="bg-background text-foreground p-4">
						<div className="text-center">
							<Ascii />

							<h2 className="mt-12 text-lg font-bold">Where should I work?</h2>
							<p>Choose a folder for Melty to work in.</p>

							<div className="space-x-2 mt-4">
								<Button onClick={handleOpenWorkspaceDialog} className="mt-4">Choose folder</Button>
								<Button onClick={createAndOpenWorkspace} variant="secondary" className="mt-4">Create one for me in <span className="font-mono pl-1">~/melty-workspace</span></Button>
							</div>

						</div>
					</div>
					: gitConfigError?.includes("git init") ?
						<div className="bg-background text-foreground p-4">
							<div className="text-center">
								<h2 className="text-lg font-bold">Let's start Melting.</h2>
								<p>Melty needs a git repo in the workspace root folder.</p>
								<Button onClick={handleCreateGitRepo} className="mt-4">Create git repo</Button>
							</div>
						</div>
						:
						<div className="bg-background text-foreground p-4">
							<div className="text-center">
								<h2 className="text-lg font-bold">Git config error</h2>
								<p>Oops! Try restarting Melty?</p>
								<p>{gitConfigError}</p>
							</div>
						</div>
			) : (
				<>
					<FastFilePicker
						isOpen={pickerOpen}
						setIsOpen={setPickerOpen}
						workspaceFilePaths={workspaceFilePaths}
						meltyMindFilePaths={meltyMindFilePaths}
						onFileSelect={handleAddFile}
						onFileDrop={handleDropFile}
					/>
					<form onSubmit={handleSubmit}>
						<div className="mt-4 relative">
							<AutoExpandingTextarea
								placeholder="What are you trying to do?"
								value={messageText}
								onChange={(e) => setMessageText(e.target.value)}
								onKeyDown={handleKeyDown}
								className="flex-grow p-3 pr-12 pb-12 max-h-[30vh] overflow-y-auto"
								ref={textareaRef}
								autoFocus={true}
								required
							/>

							<div className="absolute right-2 top-2 flex gap-2">
								{messageText.trim() !== "" && (
									<button
										className="bg-black p-2 rounded-lg text-white"
										name="ask"
										type="submit"
									>
										<ArrowUp className="h-3 w-3" />
									</button>
								)}
							</div>

							<div className="absolute left-2 bottom-2">
								<Select
									name="taskMode"
									defaultValue="coder"
									onValueChange={(value: TaskMode) =>
										fetchAssistantDescription(value)
									}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select an assistant" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="coder">
											{strings.getTaskModeName("coder")}
										</SelectItem>
										<SelectItem value="vanilla">
											{strings.getTaskModeName("vanilla")}
										</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<div className="absolute right-2 bottom-2">
								<AddFileButton keyboardShortcut="@" />
							</div>
						</div>
					</form>
					<div className="mt-1">
						<div className="max-w-sm">
							<Popover>
								<PopoverTrigger>
									<Button
										variant="ghost"
										size="sm"
										className="text-muted-foreground"
									>
										<CircleHelp className="h-3 w-3 mr-1" />
										What can Melty see?
									</Button>
								</PopoverTrigger>
								<PopoverContent>
									<div className="space-y-2 text-muted-foreground">
										<p>
											Melty is in {currentMode.type} mode. {currentMode.description}
										</p>
										{currentMode.type === "coder" && (
											<>
												<p>
													Melty can see your codebase structure but not the full
													content of your files. Too much context confuses language
													models.
													<b>
														{" "}
														Only add files that are helpful to the current task.
													</b>
												</p>
												{meltyMindFilePaths.length === 0 ? (
													<p>
														<AddFileButton keyboardShortcut="@" />
													</p>
												) : (
													<div>
														<p>Melty can see the full content of these files: </p>
														<ul>
															{meltyMindFilePaths.map((file, i) => (
																<li key={`file-${i}`}>{file}</li>
															))}
														</ul>
													</div>
												)}
											</>
										)}
									</div>
								</PopoverContent>
							</Popover>
						</div>
						<div className="flex overflow-x-auto">
							{meltyMindFilePaths.map((file, i) => (
								<button
									onClick={() => handleDropFile(file)}
									className="mt-1 text-xs text-muted-foreground mr-2 mb-2 bg-muted px-2 py-1 inline-flex items-center rounded"
									key={`file-${i}`}
								>
									<XIcon className="h-3 w-3 mr-2" />
									{file}
								</button>
							))}
						</div>
					</div>

					{tasks.length === 0 &&
						<OnboardingSection setMessageText={setMessageText} />
					}

					{suggestions.length > 0 && (
						<div className="mb-4 mt-4 rounded-md fade-in">
							<h2 className="text-muted-foreground font-semibold mt-6 mb-2 flex items-center">
								<LightbulbIcon className="h-3 w-3 text-muted-foreground mr-1" />
								Ideas
							</h2>
							<div className="gap-2">
								{suggestions.map((suggestion, i) => (
									<Button
										variant="outline"
										onClick={() => setMessageText(suggestion)}
										key={`suggestion-${i}`}
										className="mr-2"
									>
										{suggestion}
									</Button>
								))}
							</div>
						</div>
					)}

					{tasks.length > 0 &&
						<>
							<h2 className="text-muted-foreground font-semibold mt-6 mb-2 flex items-center">
								<MessageCircle className="h-3 w-3 text-muted-foreground mr-1" />
								Chats
							</h2>
							<div className="grid md:grid-cols-3 grid-cols-1 gap-6 mt-4">
								{tasks.length === 0 && <p>No tasks</p>}
								{tasks.map((task) => (
									<div key={task.id} className="relative">
										<button className="text-left w-full" onClick={() => { activateAndNavigateToTask(task.id) }}>
											<Card>
												<CardHeader>
													<CardTitle>{task.name}</CardTitle>
												</CardHeader>
												<CardContent>
													<p className="text-xs text-gray-500 mt-2">
														{formatDate(new Date(task.updatedAt))}
													</p>
												</CardContent>
											</Card>
										</button>
										<Button
											variant="ghost"
											size="sm"
											className="absolute top-2 right-2 p-1"
											onClick={(e) => deleteTask(task.id, e)}
										>
											<X className="text-muted-foreground h-4 w-4" />
										</Button>
									</div>
								))}
							</div>
						</>
					}
					<div className="mt-4 flex items-center">
						<CheckCircle className="text-green-500 mr-2 h-4 w-4" />
						<span>Git configured</span>
					</div>
				</>
			)}
		</div>

	);
}
