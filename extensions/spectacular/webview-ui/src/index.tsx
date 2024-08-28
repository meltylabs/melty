import React from "react";
import ReactDOM from "react-dom";
import App from "./App";
import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";

if (typeof window !== "undefined") {
	// posthog init for frontend
	posthog.init("phc_tvdsIv2ZDXVeJfYm0GTEBFwaPtdmWRa2cNVGCg18Qt6", {
		api_host:
			process.env.REACT_APP_PUBLIC_POSTHOG_HOST || "https://app.posthog.com",
		loaded: (posthog) => {
			if (process.env.NODE_ENV === "development") posthog.debug();
		},
	});
}

ReactDOM.render(
	<React.StrictMode>
		<PostHogProvider client={posthog}>
			<App />
		</PostHogProvider>
	</React.StrictMode>,
	document.getElementById("root")
);
