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
import Ascii from "./Ascii";
import "diff2html/bundles/css/diff2html.min.css";
import { useNavigate } from "react-router-dom";
import { EventManager, EventCallback } from "@/eventManager";
import { MeltyContext, NotificationMessage } from "../types";

const rpcClient = RpcClient.getInstance();

export function InitPage({ }: {}) {
	const [meltyContextError, setMeltyContextError] = useState<string | undefined>();
	const navigate = useNavigate();

	const getMeltyContextError = useCallback(async () => {
		const meltyContextError = await rpcClient.run("getMeltyContextError");
		setMeltyContextError(meltyContextError);
		console.log("got error", meltyContextError);

		if (meltyContextError === "") {
			console.log("redirecting");
			// must run goToTasksPage before navigating!
			await rpcClient.run("goToTasksPage");
			navigate(`/tasks`);
		}
	}, []);

	const handleOpenWorkspaceDialog = useCallback(async () => {
		const didOpen = await rpcClient.run("openWorkspaceDialog", {});
		console.log("did open workspace dialog?", didOpen);
		await getMeltyContextError();
	}, [getMeltyContextError]);

	const handleCreateGitRepo = useCallback(async () => {
		const didCreate = await rpcClient.run("createGitRepository", {});
		console.log("did create git repo?", didCreate);
		await getMeltyContextError();
	}, [getMeltyContextError]);

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
		getMeltyContextError();
	}, [getMeltyContextError]);

	return (
		<div>
			{meltyContextError === undefined ? (
				<LoaderCircle className="animate-spin text-gray-500 mr-2 h-4 w-4" />
			) : meltyContextError !== "" ? (
				meltyContextError?.includes("Open a workspace folder") ?
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
					: meltyContextError?.includes("git init") ?
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
								<p>{meltyContextError}</p>
							</div>
						</div>
			) : <p>Redirecting...</p>}
		</div>
	);
}
