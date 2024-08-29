import React, { useState, useEffect, useCallback } from "react";
import {
	BrowserRouter as Router,
	Route,
	Routes,
	Navigate,
	useNavigate,
	useLocation,
} from "react-router-dom";
import { Tasks } from "./components/Tasks";
import { ConversationView } from "./components/ConversationView";
import { Onboarding } from "./components/Onboarding";
import { EventManager } from './eventManager';
import "./App.css";

function AppContent() {
	const navigate = useNavigate();
	const location = useLocation();

	const handleKeyDown = useCallback(
		(event: KeyboardEvent) => {
			if ((event.metaKey || event.ctrlKey) && event.key === "[") {
				event.preventDefault();
				if (location.pathname !== "/") {
					navigate("/");
				}
			}
		},
		[navigate, location]
	);

	useEffect(() => {
		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [handleKeyDown]);

	return (
		<main className="">
			{/* <nav className="mb-4 flex justify-between">


        </nav> */}

			<Routes>
				<Route path="/task/:taskId" element={<ConversationView />} />
				<Route path="/onboarding" element={<Onboarding />} />
				<Route path="/" element={<Tasks />} />
				<Route path="*" element={<Navigate to="/" replace />} />
			</Routes>
		</main>
	);
}

function App() {
	useEffect(() => {
		return () => EventManager.Instance.cleanup();
	}, []);
	return (
		<Router>
			<AppContent />
		</Router>
	);
}

export default App;
