import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "../../lib/utils";

const FileDialog = DialogPrimitive.Root;

const FileDialogTrigger = DialogPrimitive.Trigger;

const FileDialogPortal = DialogPrimitive.Portal;

const FileDialogClose = DialogPrimitive.Close;

const FileDialogOverlay = React.forwardRef<
	React.ElementRef<typeof DialogPrimitive.Overlay>,
	React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
	<DialogPrimitive.Overlay
		ref={ref}
		className={cn(
			"",
			className
		)}
		{...props}
	/>
));
FileDialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const FileDialogContent = React.forwardRef<
	React.ElementRef<typeof DialogPrimitive.Content>,
	React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
	<FileDialogPortal>
		<FileDialogOverlay />
		<DialogPrimitive.Content
			ref={ref}
			className={cn(
				"absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-md z-50 grid w-full max-w-lg gap-4 border bg-background p-2 shadow-lg",
				className
			)}
			{...props}
		>
			{children}
			{/* <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close> */}
		</DialogPrimitive.Content>
	</FileDialogPortal>
));
FileDialogContent.displayName = DialogPrimitive.Content.displayName;

const FileDialogHeader = ({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) => (
	<div
		className={cn(
			"flex flex-col space-y-1.5 text-center sm:text-left",
			className
		)}
		{...props}
	/>
);
FileDialogHeader.displayName = "FileDialogHeader";

const FileDialogFooter = ({
	className,
	...props
}: React.HTMLAttributes<HTMLDivElement>) => (
	<div
		className={cn(
			"flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
			className
		)}
		{...props}
	/>
);
FileDialogFooter.displayName = "FileDialogFooter";

const FileDialogTitle = React.forwardRef<
	React.ElementRef<typeof DialogPrimitive.Title>,
	React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
	<DialogPrimitive.Title
		ref={ref}
		className={cn(
			"text-lg font-semibold leading-none tracking-tight",
			className
		)}
		{...props}
	/>
));
FileDialogTitle.displayName = DialogPrimitive.Title.displayName;

const FileDialogDescription = React.forwardRef<
	React.ElementRef<typeof DialogPrimitive.Description>,
	React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
	<DialogPrimitive.Description
		ref={ref}
		className={cn("text-sm text-muted-foreground", className)}
		{...props}
	/>
));
FileDialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
	FileDialog,
	FileDialogPortal,
	FileDialogOverlay,
	FileDialogClose,
	FileDialogTrigger,
	FileDialogContent,
	FileDialogHeader,
	FileDialogFooter,
	FileDialogTitle,
	FileDialogDescription,
};
