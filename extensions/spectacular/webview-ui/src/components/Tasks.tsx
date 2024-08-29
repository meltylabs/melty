import { useState, useEffect, useCallback, useRef, useId } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { RpcClient } from "../rpcClient";
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
	PlayCircle,
	PlayIcon,
	LightbulbIcon,
} from "lucide-react";
import { FilePicker } from "./FilePicker";
import { MouseEvent, KeyboardEvent } from "react";
import "diff2html/bundles/css/diff2html.min.css";
import { Link, useNavigate } from "react-router-dom";
import AutoExpandingTextarea from "./AutoExpandingTextarea";
import { Task, TaskMode, AssistantInfo } from "../types";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "./ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { AddFileButton } from "./AddFileButton";
import * as strings from "../utilities/strings";
import { FastFilePicker } from "./FastFilePicker";

// Utility function to format the date
function formatDate(date: Date): string {
	const now = new Date();
	const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

	if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
	if (diffInSeconds < 3600)
		return `${Math.floor(diffInSeconds / 60)} minutes ago`;
	if (diffInSeconds < 86400)
		return `${Math.floor(diffInSeconds / 3600)} hours ago`;
	if (diffInSeconds < 604800)
		return `${Math.floor(diffInSeconds / 86400)} days ago`;

	return date.toLocaleDateString();
}

export function Tasks({
	initialMeltyMindFiles,
}: {
	initialMeltyMindFiles?: string[];
}) {
	const [rpcClient] = useState(() => new RpcClient());
	const [tasks, setTasks] = useState<Task[]>([]);
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
		},
		[rpcClient]
	);

	useEffect(() => {
		fetchAssistantDescription("coder");
	}, [fetchAssistantDescription]);

	const fetchTasks = useCallback(async () => {
		const fetchedTasks = (await rpcClient.run("listTasks")) as Task[];
		console.log(`[Tasks] fetched ${fetchedTasks.length} tasks`);
		const sortedTasks = fetchedTasks.sort(
			(a, b) =>
				new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
		);
		setTasks(sortedTasks);
	}, [rpcClient]);

	const checkGitConfig = useCallback(async () => {
		const possibleError = await rpcClient.run("getGitConfigErrors");
		setGitConfigError(possibleError);
	}, [rpcClient]);

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
		[fetchTasks, rpcClient]
	);

	const createNewTask = async (taskName: string, taskMode: TaskMode) => {
		console.log(`[Tasks] creating new task ${taskName}`);
		const newTaskId = (await rpcClient.run("createAndSwitchToTask", {
			name: taskName.trim(),
			taskMode: taskMode,
			files: meltyMindFilePaths,
		})) as string;
		console.log(`[Tasks] created new task ${newTaskId}`);
		return newTaskId;
	};

	function handleSendMessage(text: string, taskId: string) {
		rpcClient.run("chatMessage", { text, taskId });
	}

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault();
		const message = messageText;
		const taskMode = currentMode.type;
		console.log(`[Tasks] to ${taskMode}`);
		let taskName = message.substring(0, 40);
		if (message.length > 40) {
			taskName = taskName + "...";
		}
		const newTaskId = await createNewTask(taskName, taskMode);
		handleSendMessage(message, newTaskId);
		setMessageText("");
		navigate(`/task/${newTaskId}`);
	};

	const handleKeyDown = async (event: KeyboardEvent<HTMLTextAreaElement>) => {
		if (event.key === "Enter" && !event.shiftKey) {
			event.preventDefault();

			if (event.currentTarget && event.currentTarget.value !== undefined) {
				const form = event.currentTarget.form;
				if (form) {
					const taskMode = form.taskMode.value as TaskMode;
					console.log(`[Tasks] to ${taskMode}`);
					let taskName = messageText.substring(0, 40);
					if (messageText.length > 40) {
						taskName = taskName + "...";
					}
					const newTaskId = await createNewTask(taskName, taskMode);
					handleSendMessage(messageText, newTaskId);
					setMessageText("");
					navigate(`/task/${newTaskId}`);
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
	}, [rpcClient, initialMeltyMindFiles]);

	const handleAddFile = useCallback(
		async (filePath: string) => {
			const updatedMeltyFiles = await rpcClient.run("addMeltyFile", {
				filePath,
			});
			setMeltyMindFilePaths(updatedMeltyFiles);
			setPickerOpen(false);
			setShouldFocus(true);
		},
		[rpcClient]
	);

	async function handleDropFile(file: string) {
		const meltyFiles = await rpcClient.run("dropMeltyFile", {
			filePath: file,
		});
		setMeltyMindFilePaths(meltyFiles);
		setPickerOpen(false);
		setShouldFocus(true);
	}

	useEffect(() => {
		fetchTasks();
		checkGitConfig();
		fetchFilePaths();

		const handleMessage = (event: MessageEvent) => {
			const message = event.data;
			switch (message.type) {
				case "updateTodo":
					// add suggestion if it's not already a suggestion
					const newSuggestions = [...suggestions, message.todo];
					const uniqueSuggestions = new Set(newSuggestions);
					const newUniqueSuggestions = Array.from(uniqueSuggestions);
					setSuggestions(newUniqueSuggestions);

					break;
			}
		};

		window.addEventListener("message", rpcClient.handleMessage);
		window.addEventListener("message", handleMessage);

		return () => {
			window.removeEventListener("message", rpcClient.handleMessage);
			window.addEventListener("message", handleMessage);
		};
	}, [fetchTasks, fetchFilePaths, checkGitConfig, suggestions, rpcClient]);

	return (
		<div>
			<h1 className="text-3xl font-extrabold tracking-tighter mb-6 mt-4 text-center">
				melty
			</h1>
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
						className="flex-grow p-3 pr-12 pb-12"
						ref={textareaRef}
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

			<h2 className="text-muted-foreground font-semibold mt-6 mb-2 flex items-center">
				<MessageCircle className="h-3 w-3 text-muted-foreground mr-1" />
				Chats
			</h2>
			<div className="grid md:grid-cols-3 grid-cols-1 gap-6 mt-4">
				{tasks.length === 0 && <p>No tasks</p>}
				{tasks.map((task) => (
					<div key={task.id} className="relative">
						<Link to={`/task/${task.id}`}>
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
						</Link>
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

			<div className="mt-4 flex items-center">
				{gitConfigError === null ? (
					<>
						<LoaderCircle className="animate-spin text-gray-500 mr-2 h-4 w-4" />
						<span>Checking Git configuration...</span>
					</>
				) : gitConfigError === "" ? (
					<>
						<CheckCircle className="text-green-500 mr-2 h-4 w-4" />
						<span>Git configured</span>
					</>
				) : (
					<>
						<XCircle className="text-red-500 mr-2 h-4 w-4" />
						<span>Git configuration error: {gitConfigError}</span>
					</>
				)}
			</div>
		</div>
	);
}
