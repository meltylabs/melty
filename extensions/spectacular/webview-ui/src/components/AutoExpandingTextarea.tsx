import React, { forwardRef, useCallback, KeyboardEvent } from "react";
import { Textarea } from "./ui/textarea";
import { FastFilePicker } from "./FastFilePicker";
import { cn } from "../lib/utils";

interface AutoExpandingTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
	value: string;
	onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
	autoFocus?: boolean;
	pickerOpen: boolean;
	setPickerOpen: (open: boolean) => void;
	workspaceFilePaths: string[];
	meltyMindFilePaths: string[];
	handleAddFile: (file: string) => void;
	handleDropFile: (file: string) => void;
}

const AutoExpandingTextarea = forwardRef<HTMLTextAreaElement, AutoExpandingTextareaProps>(
	({ value, onChange, className, autoFocus, pickerOpen, setPickerOpen, workspaceFilePaths, meltyMindFilePaths, handleAddFile, handleDropFile, ...props }, ref) => {
		const adjustHeight = useCallback((element: HTMLTextAreaElement | null) => {
			if (element) {
				element.style.height = "auto";
				element.style.height = `${element.scrollHeight}px`;
			}
		}, []);

		const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
			if (e.key === 'Escape') {
				if (pickerOpen) {
					setPickerOpen(false);
					e.preventDefault(); // Prevent the event from bubbling up
				}
				// If picker is not open, let the event propagate
			}
			// Call the original onKeyDown prop if it exists
			if (props.onKeyDown) {
				props.onKeyDown(e);
			}
		};

		return (
			<div className="relative">
				<FastFilePicker
					isOpen={pickerOpen}
					setIsOpen={setPickerOpen}
					workspaceFilePaths={workspaceFilePaths}
					meltyMindFilePaths={meltyMindFilePaths}
					onFileSelect={handleAddFile}
					onFileDrop={handleDropFile}
					stopEscapePropagation
				/>
				<Textarea
					ref={(node) => {
						adjustHeight(node);
						if (typeof ref === 'function') {
							ref(node);
						} else if (ref) {
							ref.current = node;
						}
					}}
					value={value}
					onChange={(e) => {
						onChange(e);
						adjustHeight(e.target);
					}}
					autoFocus={autoFocus}
					className={cn("resize-none overflow-hidden", className)}
					{...props}
				/>
			</div>
		);
	}
);

export default AutoExpandingTextarea;
