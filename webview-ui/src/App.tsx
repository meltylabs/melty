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
import "./App.css";
import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";

if (typeof window !== "undefined") {
  posthog.init("phc_tvdsIv2ZDXVeJfYm0GTEBFwaPtdmWRa2cNVGCg18Qt6", {
    api_host:
      process.env.REACT_APP_PUBLIC_POSTHOG_HOST || "https://app.posthog.com",
    loaded: (posthog) => {
      if (process.env.NODE_ENV === "development") posthog.debug();
    },
  });
}

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
          <Link to="/">
            <Button variant="ghost" size="sm">
              Melty
            </Button>
          </Link>
          <Link to="/onboarding">
            <Button variant="ghost" size="sm">
              Setup
            </Button>
          </Link>
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
  return (
    <React.StrictMode>
      <PostHogProvider client={posthog}>
        <Router>
          <AppContent />
        </Router>
      </PostHogProvider>
    </React.StrictMode>
  );
}

export default App;
