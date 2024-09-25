import React, { forwardRef, useCallback } from "react";
import { Textarea } from "./ui/textarea";
import { FastFilePicker } from "./FastFilePicker";
import { cn } from "../lib/utils";

interface AutoExpandingTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
	value: string;
	onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
	autoFocus?: boolean;
}

const AutoExpandingTextarea = forwardRef<HTMLTextAreaElement, AutoExpandingTextareaProps>(
	({ value, onChange, className, autoFocus, ...props }, ref) => {
		const adjustHeight = useCallback((element: HTMLTextAreaElement | null) => {
			if (element) {
				element.style.height = "auto";
				element.style.height = `${element.scrollHeight}px`;
			}
		}, []);

		return (
			<div className="relative">
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
