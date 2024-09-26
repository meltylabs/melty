import React, { useState, useEffect, useCallback, createContext, useContext } from "react";
import {
	BrowserRouter as Router,
	Route,
	Routes,
	Navigate,
	useLocation, useMatch,
} from "react-router-dom";
import { Tasks } from "./components/Tasks";
import { InitPage } from "./components/InitPage";
import { ConversationView } from "./components/ConversationView";
import { Help } from "./components/Help";
import { NavBar } from "./components/NavBar";
import { Onboarding } from "./components/Onboarding";
import { EventCallback, EventManager } from './eventManager';
import { RpcClient } from "./RpcClient";
import { MeltyConfigProvider } from '@/MeltyConfig';
import "./App.css";
import { NotificationMessage } from "./types";

const rpcClient = RpcClient.getInstance();

// Create a context for the theme
const ThemeContext = createContext<'light' | 'dark'>('light');

function AppContent() {
	const theme = useContext(ThemeContext);
	const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);
	const location = useLocation();
	const isTaskRoute = useMatch('/task/:taskId');

	useEffect(() => {
		const checkOnboarding = async () => {
			const onboardingComplete = await rpcClient.run("checkOnboardingComplete", {});
			console.log("onboardingComplete", onboardingComplete);
			setShowOnboarding(!onboardingComplete);
		};

		checkOnboarding();
		return () => EventManager.Instance.cleanup();
	}, []);

	useEffect(() => {
		if (showOnboarding === false && location.pathname === '/onboarding') {
			// Redirect to home page after onboarding is complete
			window.history.pushState(null, '', '/');
		}
	}, [showOnboarding, location.pathname]);

	if (showOnboarding === null) {
		return <div>Loading...</div>;
	}

	if (showOnboarding && location.pathname !== '/onboarding') {
		return <Navigate to="/onboarding" replace />;
	}

	return (
		<MeltyConfigProvider>
			<main className={theme === 'dark' ? 'dark' : ''}>
				<NavBar />
				<div className="bg-background text-foreground px-4 mt-12 max-w-4xl mx-auto">
					<Routes>
						<Route
							path="/onboarding"
							element={
								<Onboarding
									onComplete={() => {
										setShowOnboarding(false);
										rpcClient.run("setOnboardingComplete", {});
									}}
								/>
							}
						/>
						<Route path="/task/:taskId" element={<ConversationView />} />
						<Route path="/" element={<InitPage />} />
						<Route path="/tasks" element={<Tasks />} />
						<Route path="/help" element={<Help />} />
						<Route path="*" element={<Navigate to="/" replace />} />
					</Routes>
				</div>
			</main>
		</MeltyConfigProvider>
	);
}

function App() {
	const [theme, setTheme] = useState<'light' | 'dark'>('light');

	const initTheme = useCallback(async () => {
		const theme = await rpcClient.run("getVSCodeTheme", {});
		console.log("theme", theme);
		setTheme(theme);
	}, []);

	useEffect(() => {
		initTheme()

		// Listen for theme changes
		const handleNotification = (
			(message: NotificationMessage) => {
				if (message.notificationType === "themeChanged") {
					setTheme(message.data.theme);
				}
			}
		) as EventCallback;

		EventManager.Instance.addListener('notification', handleNotification);

		return () => {
			EventManager.Instance.removeListener('notification', handleNotification);
			EventManager.Instance.cleanup();
		};
	}, [initTheme]);

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
