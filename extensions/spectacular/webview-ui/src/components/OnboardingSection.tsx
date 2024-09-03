import React from "react";
import { Code, FileCode, MessageCircleQuestion } from "lucide-react";
import { Button } from "./ui/button";

interface OnboardingSectionProps {
	setMessageText: (text: string) => void;
}

const OnboardingSection: React.FC<OnboardingSectionProps> = ({ setMessageText }) => {
	return (
		<div className="my-8">
			<ul className="grid grid-cols-1 md:grid-cols-3 gap-8 list-none p-0">
				<li className="flex flex-col">
					<h2 className="text-muted-foreground font-semibold mb-2 flex items-center">
						<Code className="h-3 w-3 text-muted-foreground mr-1" />
						Code
					</h2>
					<div className="space-y-2">
						<Button onClick={() => setMessageText("Make me a flask app that shows air quality in NYC.")} variant="outline" className="w-full justify-start">&ldquo;Make me a flask app that shows air quality in NYC.&rdquo;</Button>
						<Button onClick={() => setMessageText("Make a rust script that lets me play tic tac toe.")} variant="outline" className="w-full justify-start">&ldquo;Make a rust script that lets me play tic tac toe.&rdquo;</Button>
						<Button onClick={() => setMessageText("Can you refactor my main function? It's getting a bit long.")} variant="outline" className="w-full justify-start">&ldquo;Can you refactor __? It's getting a bit long.&rdquo;</Button>
					</div>
				</li>
				<li className="flex flex-col">
					<h2 className="text-muted-foreground font-semibold mb-2 flex items-center">
						<FileCode className="h-3 w-3 text-muted-foreground mr-1" />
						Explain
					</h2>
					<Button onClick={() => setMessageText("Tell me about my codebase")} variant="outline" className="w-full justify-start">&ldquo;Tell me about my codebase&rdquo;</Button>
					<p className="text-gray-500 text-xs mt-4">Melty can understand TypeScript and JS codebases. You can also give it specific files to focus on with the `@` command.</p>
				</li>
				<li className="flex flex-col">
					<h2 className="text-muted-foreground font-semibold mb-2 flex items-center">
						<MessageCircleQuestion className="h-3 w-3 text-muted-foreground mr-1" />
						Ask
					</h2>
					<div className="space-y-2">
						<Button onClick={() => setMessageText("What's the bash command for listing files and their sizes?")} variant="outline" className="w-full justify-start">&ldquo;bash command for listing files and their sizes&rdquo;</Button>
						<Button onClick={() => setMessageText("What's the ffmpeg command for converting mp4 to gif?")} variant="outline" className="w-full justify-start">&ldquo;ffmpeg command for mp4 to gif&rdquo;</Button>
					</div>
				</li>
			</ul>
		</div>
	);
};

export default OnboardingSection;
