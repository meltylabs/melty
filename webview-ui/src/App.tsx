import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Link,
  Navigate,
} from "react-router-dom";
import { Button } from "./components/ui/button";
import { Tasks } from "./components/Tasks";
import { ConversationView } from "./components/ConversationView";
import { Onboarding } from "./components/Onboarding";
import "./App.css";

function App() {
  return (
    <Router>
      <main className="p-4">
        <nav className="mb-4 flex justify-between">
          <Link to="/">
            <Button variant="ghost" size="sm">
              Home
            </Button>
          </Link>
          <Link to="/onboarding">
            <Button variant="ghost" size="sm">
              Setup
            </Button>
          </Link>
        </nav>

        <Routes>
          <Route path="/task/:taskId" element={<ConversationView />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/" element={<Tasks />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </Router>
  );
}

export default App;
