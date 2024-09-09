import React from "react";
import { createRoot } from 'react-dom/client';
import App from "./App";
import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";

if (typeof window !== "undefined") {
	// posthog init for frontend
	posthog.init("phc_tvdsIv2ZDXVeJfYm0GTEBFwaPtdmWRa2cNVGCg18Qt6", {
		api_host:
			import.meta.env.VITE_APP_PUBLIC_POSTHOG_HOST || "https://app.posthog.com",
		loaded: (posthog) => {
			if (import.meta.env.NODE_ENV === "development") posthog.debug();
		},
	});
}

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(
	<React.StrictMode>
		<PostHogProvider client={posthog}>
			<App />
		</PostHogProvider>
	</React.StrictMode>
);
