import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { RpcClient } from "../RpcClient";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
	ArrowUp,
	X,
	CheckCircle,
	EllipsisVertical,
	XCircle,
	LoaderCircle,
	XIcon,
	CircleHelp,
	MessageCircle,
	LightbulbIcon,
	Search,
} from "lucide-react";
import { MouseEvent, KeyboardEvent } from "react";
import OnboardingSection from './OnboardingSection';
import "diff2html/bundles/css/diff2html.min.css";
import { Link, useNavigate } from "react-router-dom";
import AutoExpandingTextarea from "./AutoExpandingTextarea";
import { DehydratedTask, TaskMode, AssistantInfo, MeltyContext } from "../types";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { AddFileButton } from "./AddFileButton";
import { EventManager } from "@/eventManager";
import { FastFilePicker } from './FastFilePicker';

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
	const [tasks, setTasks] = useState<DehydratedTask[] | null>(null);
	const [messageText, setMessageText] = useState("");
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
	const [searchTerm, setSearchTerm] = useState("");


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

	const deleteTask = useCallback(
		async (taskId: string, e: MouseEvent) => {
			e.preventDefault(); // Prevent link navigation
			e.stopPropagation(); // Prevent event bubbling
			try {
				// make the ui change immediately
				setTasks(prevTasks => prevTasks!.filter((task) => task.id !== taskId));

				// try to delete on the backend. if this isn't successful, task will reappear
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

	const filteredTasks = tasks?.filter(task =>
		task.name.toLowerCase().includes(searchTerm.toLowerCase())
	);


	// initialization
	useEffect(() => {
		console.log("initializing tasks");
		fetchTasks();
		fetchFilePaths();

		const handleNotification = (event: MessageEvent) => {
			const message = event.data;
			switch (message.type) {
				case "updateTodo":
					addSuggestion(message.todo);
					break;
				default:
					break;
			}
		};

		EventManager.Instance.addListener('notification', handleNotification);

		return () => {
			EventManager.Instance.removeListener('notification', handleNotification);
		};
	}, [fetchTasks, fetchFilePaths, addSuggestion]); // DO NOT add anything to the initialization dependency array that isn't a constant

	return (
		<div>
			<Link to="/">
				<h1 className="text-3xl font-extrabold tracking-tighter text-center">
					melty
				</h1>
			</Link>

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
					<FastFilePicker
						isOpen={pickerOpen}
						setIsOpen={setPickerOpen}
						workspaceFilePaths={workspaceFilePaths}
						meltyMindFilePaths={meltyMindFilePaths}
						onFileSelect={handleAddFile}
						onFileDrop={handleDropFile}
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

					<div className="absolute right-2 bottom-2">
						<AddFileButton keyboardShortcut="@" />
					</div>
				</div>
			</form>
			<div className="mt-1">
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

			{tasks && tasks.length === 0 &&
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

			{tasks === null &&
				<LoaderCircle className="w-4 h-4 animate-spin text-gray-500" />}
			{tasks && tasks.length > 0 &&
				<>
					<div className="flex items-center justify-between mt-6 mb-2">
						<h2 className="text-muted-foreground font-semibold flex items-center">
							<MessageCircle className="h-3 w-3 text-muted-foreground mr-1" />
							Chats
						</h2>
						<div className="relative w-32">
							<Input
								type="text"
								placeholder="Search..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className="pl-7 py-0.5 text-xs"
							/>
							<Search className="absolute left-1.5 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
						</div>
					</div>
					<div className="grid md:grid-cols-3 grid-cols-1 gap-6 mt-4">
						{filteredTasks?.length === 0 && <p>No tasks found</p>}
						{filteredTasks?.map((task) => (
							<div key={task.id} className="relative">
								<button className="text-left w-full" onClick={() => { activateAndNavigateToTask(task.id) }}>
									<Card className="h-20 flex flex-col justify-between pr-8">
										<CardHeader className="p-2 pb-0">
											<CardTitle className="text-xs line-clamp-2">{task.name}</CardTitle>
										</CardHeader>
										<CardContent className="p-2 pt-0">
											<p className="text-[10px] text-gray-500">
												{formatDate(new Date(task.updatedAt))}
											</p>
										</CardContent>
									</Card>
								</button>
								<div className="absolute top-1 right-1">
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<Button variant="ghost" size="sm" className="p-1 h-auto">
												<EllipsisVertical className="text-muted-foreground h-3 w-3" />
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent>
											<DropdownMenuItem onClick={(e: any) => deleteTask(task.id, e)}>
												Delete
											</DropdownMenuItem>
										</DropdownMenuContent>
									</DropdownMenu>
								</div>
							</div>
						))}
					</div>
				</>
			}
			<div className="mt-4 flex items-center">
				<CheckCircle className="text-green-500 mr-2 h-4 w-4" />
				<span>Melty is configured</span>
			</div>
		</div>
	);
}
