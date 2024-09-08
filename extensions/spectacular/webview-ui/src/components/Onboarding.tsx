import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from './ui/button';
import Ascii from './Ascii';

export function Onboarding({ onComplete }: { onComplete: () => void }) {

	const [keyPressed, setKeyPressed] = useState(false);
	const [cmdPressed, setCmdPressed] = useState(false);
	const [mPressed, setMPressed] = useState(false);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.metaKey || event.ctrlKey) {
				setCmdPressed(true);
			}
			if (event.key === "m") {
				setMPressed(true);
			}
			if ((event.metaKey || event.ctrlKey) && event.key === "m") {
				setKeyPressed(true);
				onComplete();
			}
			if (keyPressed && event.key === "Enter") {
				onComplete();
			}
		};

		const handleKeyUp = (event: KeyboardEvent) => {
			if (!(event.metaKey || event.ctrlKey)) {
				setCmdPressed(false);
			}
			if (event.key === "m") {
				setMPressed(false);
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		window.addEventListener("keyup", handleKeyUp);

		return () => {
			window.removeEventListener("keydown", handleKeyDown);
			window.removeEventListener("keyup", handleKeyUp);
		};
	}, [])

	return (
		<div className="text-center">
			<Ascii />
			<h1 className="text-2xl font-bold mb-4 mt-12">Hi, human.</h1>
			<p>Melty is a new kind of IDE that writes code for you.</p>
			<p>First things first — to open and close me press ⌘ + m. Try it now.</p>

			<div className="mt-6">
				<kbd className={`ml-1.5 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border ${!keyPressed && cmdPressed ? 'bg-green-50' : 'bg-muted'} px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100`}>
					<span className="text-xs">⌘</span>
				</kbd>{" "}
				<kbd className={`ml-1.5 pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border ${!keyPressed && mPressed ? 'bg-green-50' : 'bg-muted'} px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100`}>
					<span className="text-xs">m</span>
				</kbd>
			</div>
			<div className="mt-6">
				{keyPressed && <Link to="/" className="hover:text-white"><Button>Wow, you're pretty smart for a human.
					Next &rarr;</Button></Link>}
			</div>
		</div>
	);
};
