import React, { forwardRef, useCallback } from "react";
import { Textarea } from "./ui/textarea";

interface AutoExpandingTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

const AutoExpandingTextarea = forwardRef<HTMLTextAreaElement, AutoExpandingTextareaProps>(
  ({ value, onChange, ...props }, ref) => {
    const adjustHeight = useCallback((element: HTMLTextAreaElement | null) => {
      if (element) {
        element.style.height = "auto";
        element.style.height = `${element.scrollHeight}px`;
      }
    }, []);

    return (
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
        {...props}
      />
    );
  }
);

export default AutoExpandingTextarea;

