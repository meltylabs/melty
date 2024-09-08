import React from "react";
import { Code, FileCode, MessageCircleQuestion } from "lucide-react";

interface OnboardingSectionProps {
	setMessageText: (text: string) => void;
}

const OnboardingSection: React.FC<OnboardingSectionProps> = ({ setMessageText }) => {
	return (
		<div className="my-8">

			<h2 className="text-muted-foreground my-3 font-semibold">Try asking Melty to...</h2>
			<ul className="grid grid-cols-1 md:grid-cols-3 gap-8 list-none p-0 mt-4">
				<li className="flex flex-col">
					<h2 className="text-gray-500 font-semibold mb-2 flex items-center">
						<Code className="h-3 w-3 text-gray-500 mr-1" />
						Code
					</h2>
					<div className="space-y-2">
						<button onClick={() => setMessageText("Make me a flask app that shows air quality in NYC.")} className="w-full text-left px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors">&ldquo;Make me a flask app that shows air quality in NYC.&rdquo;</button>
						<button onClick={() => setMessageText("Make a rust script that lets me play tic tac toe.")} className="w-full text-left px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors">&ldquo;Make a rust script that lets me play tic tac toe.&rdquo;</button>
						<button onClick={() => setMessageText("Can you refactor my main function? It's getting a bit long.")} className="w-full text-left px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors">&ldquo;Can you refactor __? It's getting a bit long.&rdquo;</button>
					</div>
				</li>
				<li className="flex flex-col">
					<h2 className="text-gray-500 font-semibold mb-2 flex items-center">
						<FileCode className="h-3 w-3 text-gray-500 mr-1" />
						Explain
					</h2>
					<button onClick={() => setMessageText("Tell me about my codebase")} className="w-full text-left px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors">&ldquo;Tell me about my codebase&rdquo;</button>
					<p className="text-gray-500 text-xs mt-4">Melty can understand TypeScript and JS codebases. You can also give it specific files to focus on with the `@` command.</p>
				</li>
				<li className="flex flex-col">
					<h2 className="text-gray-500 font-semibold mb-2 flex items-center">
						<MessageCircleQuestion className="h-3 w-3 text-gray-500 mr-1" />
						Ask
					</h2>
					<div className="space-y-2">
						<button onClick={() => setMessageText("What's the bash command for listing files and their sizes?")} className="w-full text-left px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors">&ldquo;bash command for listing files and their sizes&rdquo;</button>
						<button onClick={() => setMessageText("What's the ffmpeg command for converting mp4 to gif?")} className="w-full text-left px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors">&ldquo;ffmpeg command for mp4 to gif&rdquo;</button>
					</div>
				</li>
			</ul>
		</div>
	);
};

export default OnboardingSection;
