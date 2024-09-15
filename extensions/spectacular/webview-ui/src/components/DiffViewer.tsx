import React, { useEffect, useRef, useState } from "react";
import {
	Diff2HtmlUI,
	Diff2HtmlUIConfig,
} from "diff2html/lib/ui/js/diff2html-ui-slim";
import "diff2html/bundles/css/diff2html.min.css";
import * as Diff2Html from "diff2html";
import "./DiffViewer.css";
import { Toggle } from "./ui/toggle";
import { Columns2 } from "lucide-react";

interface Diff2HtmlProps {
	diff: string;
}

// const dummyDiff =
//   "diff --git a/src/main.py b/src/main.py\nindex 3333333..4444444 100644\n--- a/main.py\n+++ b/main.py\n@@ -1,7 +1,7 @@\n def main():\n     print('Hello, world!')\n\nif __name__ == '__main__':\n    main()\n\ndiff --git a/utils.py b/utils.py\nindex 5555555..6666666 100644\n--- a/utils.py\n+++ b/utils.py\n@@ -1,5 +1,6 @@\n def helper_function():\n     return 'I am a helper'\n+\ndef another_helper():\n+    return 'I am another helper'\n\ndiff --git a/README.md b/README.md\nindex 7777777..8888888 100644\n--- a/README.md\n+++ b/README.md\n@@ -1,3 +1,4 @@\n # My Project\n\n This is a sample project.\n+It now has more files and functionality.";

// const renderDiff2HTML = (diff: string) => {
//   const lines = diff.split("\n");
//   const fileNameLine = lines.find((line) => line.startsWith("diff --git"));
//   let fileName = "";
//   if (fileNameLine) {
//     const match = fileNameLine.match(/diff --git a\/(.*) b\/(.*)/);
//     if (match) {
//       fileName = match[2]; // Use the 'b' file name (new file)
//     }
//   }

//   const customHeader = fileName ? (
//     <div className="diff-header flex items-center space-x-2 p-2 bg-gray-100 rounded-t">
//       <button className="text-blue-600 hover:underline">{fileName}</button>
//     </div>
//   ) : null;

//   return (
//     <>
//       <div
//         className="text-xs font-mono"
//         dangerouslySetInnerHTML={{
//           __html: Diff2Html.html(diff, {
//             drawFileList: true,
//             matching: "lines",
//             outputFormat: "line-by-line",
//           }),
//         }}
//       />
//     </>
//   );
// };

const Diff2HtmlComponent: React.FC<Diff2HtmlProps> = ({ diff }) => {
	const containerRef = useRef<HTMLDivElement>(null);
	const [outputFormat, setOutputFormat] = useState<
		"line-by-line" | "side-by-side"
	>("line-by-line");

	useEffect(() => {
		if (containerRef.current) {
			const configuration = {
				drawFileList: true,
				fileListToggle: true,
				fileListStartVisible: false,
				fileContentToggle: true,
				matching: "lines",
				outputFormat: outputFormat,
				synchronisedScroll: true,
				highlight: true,
				renderNothingWhenEmpty: false,
				colorScheme: "auto"

			};

			const diff2htmlUi = new Diff2HtmlUI(
				containerRef.current,
				diff,
				configuration as Diff2HtmlUIConfig
			);
			diff2htmlUi.draw();
			diff2htmlUi.highlightCode();
		}
	}, [diff, outputFormat]);

	return (
		<div className="sticky text-xs top-0 overflow-y-auto max-h-[calc(100vh-200px)] no-scrollbar">
			<div className="absolute right-0 top-0">
				<Toggle
					pressed={outputFormat === "side-by-side"}
					onPressedChange={(pressed) =>
						setOutputFormat(pressed ? "side-by-side" : "line-by-line")
					}
				>
					<Columns2 className="w-4 h-4" />
				</Toggle>
			</div>
			<div
				ref={containerRef}
				className="diff-container custom-diff-viewer"
			></div>
		</div>
	);
};

export default Diff2HtmlComponent;
