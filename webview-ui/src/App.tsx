import { vscode } from "./utilities/vscode";
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react";
import "./App.css";

function App() {
  function handleHowdyClick() {
    vscode.postMessage({
      command: "hello",
      text: "Hey there partner! 🤠",
    });
  }

  return (
    <main className="p-4">
      <h1 className="text-2xl font-bold text-green-500 mb-4">Hello World!</h1>
      <VSCodeButton
        onClick={handleHowdyClick}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      >
        Howdy!
      </VSCodeButton>
    </main>
  );
}

export default App;
