import React, { useState, useEffect, useCallback, createContext, useContext } from "react";
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
import { RpcClient } from "./rpcClient";
import "./App.css";

// Create a context for the theme
const ThemeContext = createContext<'light' | 'dark'>('light');

function AppContent() {
	const navigate = useNavigate();
	const location = useLocation();
	const theme = useContext(ThemeContext);

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
		<main className={theme === 'dark' ? 'dark' : ''}>
			<div className="bg-background text-foreground p-4">
				<Routes>
					<Route path="/task/:taskId" element={<ConversationView />} />
					<Route path="/onboarding" element={<Onboarding />} />
					<Route path="/" element={<Tasks />} />
					<Route path="*" element={<Navigate to="/" replace />} />
				</Routes>
			</div>
		</main>
	);
}

function App() {
	const [theme, setTheme] = useState<'light' | 'dark'>('light');
	const [rpcClient] = useState(() => new RpcClient());

	const initTheme = async () => {
		const theme = await rpcClient.run("getVSCodeTheme", {});
		console.log("theme", theme);
		setTheme(theme);
	};

	useEffect(() => {
		initTheme()

		// Listen for theme changes
		const handleNotification = (event: MessageEvent) => {
			const message = event.data;
			if (message.type === "notification" && message.notificationType === "themeChanged") {
				setTheme(message.theme);
			}
		};

		EventManager.Instance.addListener('notification', handleNotification);

		return () => {
			EventManager.Instance.removeListener('notification', handleNotification);
			EventManager.Instance.cleanup();
		};
	}, [rpcClient]);

	useEffect(() => {
		if (theme === 'dark') {
			document.documentElement.classList.add('dark');
		} else {
			document.documentElement.classList.remove('dark');
		}
	}, [theme]);

	return (
		<Router>
			<ThemeContext.Provider value={theme}>
				<AppContent />
			</ThemeContext.Provider>
		</Router>
	);
}

export default App;
