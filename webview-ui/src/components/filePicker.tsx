import * as React from "react";
import {
  Calculator,
  Calendar,
  CreditCard,
  Settings,
  Smile,
  User,
  File,
} from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "./ui/command";

const getFileIcon = (filePath: string) => {
  const extension = filePath.split(".").pop()?.toLowerCase();
  if (extension === "ts" || extension === "tsx") {
    return (
      <svg
        fill="none"
        height="512"
        viewBox="0 0 512 512"
        width="512"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect fill="#3178c6" height="512" rx="50" width="512" />
        <rect fill="#3178c6" height="512" rx="50" width="512" />
        <path
          clip-rule="evenodd"
          d="m316.939 407.424v50.061c8.138 4.172 17.763 7.3 28.875 9.386s22.823 3.129 35.135 3.129c11.999 0 23.397-1.147 34.196-3.442 10.799-2.294 20.268-6.075 28.406-11.342 8.138-5.266 14.581-12.15 19.328-20.65s7.121-19.007 7.121-31.522c0-9.074-1.356-17.026-4.069-23.857s-6.625-12.906-11.738-18.225c-5.112-5.319-11.242-10.091-18.389-14.315s-15.207-8.213-24.18-11.967c-6.573-2.712-12.468-5.345-17.685-7.9-5.217-2.556-9.651-5.163-13.303-7.822-3.652-2.66-6.469-5.476-8.451-8.448-1.982-2.973-2.974-6.336-2.974-10.091 0-3.441.887-6.544 2.661-9.308s4.278-5.136 7.512-7.118c3.235-1.981 7.199-3.52 11.894-4.615 4.696-1.095 9.912-1.642 15.651-1.642 4.173 0 8.581.313 13.224.938 4.643.626 9.312 1.591 14.008 2.894 4.695 1.304 9.259 2.947 13.694 4.928 4.434 1.982 8.529 4.276 12.285 6.884v-46.776c-7.616-2.92-15.937-5.084-24.962-6.492s-19.381-2.112-31.066-2.112c-11.895 0-23.163 1.278-33.805 3.833s-20.006 6.544-28.093 11.967c-8.086 5.424-14.476 12.333-19.171 20.729-4.695 8.395-7.043 18.433-7.043 30.114 0 14.914 4.304 27.638 12.912 38.172 8.607 10.533 21.675 19.45 39.204 26.751 6.886 2.816 13.303 5.579 19.25 8.291s11.086 5.528 15.415 8.448c4.33 2.92 7.747 6.101 10.252 9.543 2.504 3.441 3.756 7.352 3.756 11.733 0 3.233-.783 6.231-2.348 8.995s-3.939 5.162-7.121 7.196-7.147 3.624-11.894 4.771c-4.748 1.148-10.303 1.721-16.668 1.721-10.851 0-21.597-1.903-32.24-5.71-10.642-3.806-20.502-9.516-29.579-17.13zm-84.159-123.342h64.22v-41.082h-179v41.082h63.906v182.918h50.874z"
          fill="#fff"
          fill-rule="evenodd"
        />
      </svg>
    );
  } else if (extension === "js") {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 630 630">
        <rect width="630" height="630" fill="#f7df1e" />
        <path d="M423.2 492.19c12.69 20.72 29.2 35.95 58.4 35.95 24.53 0 40.2-12.26 40.2-29.2 0-20.3-16.1-27.49-43.1-39.3l-14.8-6.35c-42.72-18.2-71.1-41-71.1-89.2 0-44.4 33.83-78.2 86.7-78.2 37.64 0 64.7 13.1 84.2 47.4l-46.1 29.6c-10.15-18.2-21.1-25.37-38.1-25.37-17.34 0-28.33 11-28.33 25.37 0 17.76 11 24.95 36.4 35.95l14.8 6.34c50.3 21.57 78.7 43.56 78.7 93 0 53.3-41.87 82.5-98.1 82.5-54.98 0-90.5-26.2-107.88-60.54zm-209.13 5.13c9.3 16.5 17.76 30.45 38.1 30.45 19.45 0 31.72-7.61 31.72-37.2v-201.3h59.2v202.1c0 61.3-35.94 89.2-88.4 89.2-47.4 0-74.85-24.53-88.81-54.075z" />
      </svg>
    );
  } else if (extension === "py") {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <defs>
          <linearGradient id="pyblue" gradientTransform="rotate(45)">
            <stop offset="0%" stop-color="#387EB8" />
            <stop offset="100%" stop-color="#366994" />
          </linearGradient>
          <linearGradient id="pyyellow" gradientTransform="rotate(45)">
            <stop offset="0%" stop-color="#FFC836" />
            <stop offset="100%" stop-color="#FFD750" />
          </linearGradient>
        </defs>
        <path
          d="M50 15c-14.888 0-13.939 6.443-13.939 6.443l.017 6.685h14.187v2.009H27.472S15 28.694 15 43.689c0 14.994 10.861 14.46 10.861 14.46h6.475v-6.953s-.349-10.861 10.687-10.861h18.413s10.343.168 10.343-9.988v-16.8S73.612 15 50 15zm-8.139 4.81a2.654 2.654 0 110 5.308 2.654 2.654 0 010-5.308z"
          fill="url(#pyblue)"
        />
        <path
          d="M50.015 85c14.888 0 13.939-6.443 13.939-6.443l-.017-6.685H49.75v-2.009h22.793S85 71.306 85 56.311c0-14.994-10.861-14.46-10.861-14.46h-6.475v6.953s.349 10.861-10.687 10.861H38.564s-10.343-.168-10.343 9.988v16.8S26.388 85 50.015 85zm8.139-4.81a2.654 2.654 0 110-5.308 2.654 2.654 0 010 5.308z"
          fill="url(#pyyellow)"
        />
      </svg>
    );
  } else if (extension == "txt") {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <rect
          x="10"
          y="5"
          width="80"
          height="90"
          rx="5"
          ry="5"
          fill="#f5f5f5"
          stroke="#999"
          stroke-width="2"
        />
        <path
          d="M25 25h50M25 40h50M25 55h50M25 70h30"
          stroke="#666"
          stroke-width="2"
          stroke-linecap="round"
        />
        <path d="M70 70 L80 80 L70 80 Z" fill="#666" />
        <text
          x="75"
          y="95"
          font-family="Arial, sans-serif"
          font-size="12"
          fill="#333"
          text-anchor="middle"
        >
          TXT
        </text>
      </svg>
    );
  } else if (extension == "ex") {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <defs>
          <linearGradient
            id="elixir-gradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stop-color="#5f3f79" />
            <stop offset="100%" stop-color="#4b2a5e" />
          </linearGradient>
        </defs>
        <path
          d="M50 10
           C 60 25, 80 40, 80 65
           A 30 30 0 1 1 20 65
           C 20 40, 40 25, 50 10 Z"
          fill="url(#elixir-gradient)"
        />
        <path
          d="M30 75
           A 20 20 0 0 0 70 75
           C 70 60, 60 50, 50 40
           C 40 50, 30 60, 30 75 Z"
          fill="#fff"
          fill-opacity="0.3"
        />
      </svg>
    );
  } else if (extension == "md") {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="208"
        height="128"
        viewBox="0 0 208 128"
      >
        <rect
          width="198"
          height="118"
          x="5"
          y="5"
          ry="10"
          stroke="#000"
          stroke-width="10"
          fill="none"
        />
        <path d="M30 98V30h20l20 25 20-25h20v68H90V59L70 84 50 59v39zm125 0l-30-33h20V30h20v35h20z" />
      </svg>
    );
  } else if (extension == "json") {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="160"
        height="160"
        version="1.1"
      >
        <title>JSON logo</title>
        <defs>
          <linearGradient id="linearGradient8385">
            <stop offset="0" />
            <stop stop-color="#fff" offset="1" />
          </linearGradient>
          <linearGradient
            id="linearGradient3002"
            x1="-553.27"
            x2="-666.12"
            y1="525.91"
            y2="413.05"
            gradientTransform="matrix(.99884 0 0 .9987 689.01 -388.84)"
            gradientUnits="userSpaceOnUse"
          />
          <linearGradient
            id="linearGradient3005"
            x1="-666.12"
            x2="-553.27"
            y1="413.04"
            y2="525.91"
            gradientTransform="matrix(.99884 0 0 .9987 689.01 -388.84)"
            gradientUnits="userSpaceOnUse"
          />
        </defs>
        <g fill-rule="evenodd">
          <path
            d="m79.865 119.1c35.398 48.255 70.04-13.469 69.989-50.587-0.0602-43.886-44.541-68.414-70.018-68.414-40.892 0-79.836 33.796-79.836 80.036 0 51.396 44.64 79.865 79.836 79.865-7.9645-1.1468-34.506-6.834-34.863-67.967-0.23987-41.347 13.488-57.866 34.805-50.599 0.47743 0.17707 23.514 9.2645 23.514 38.951 0 29.56-23.427 38.715-23.427 38.715z"
            color="#000000"
            fill="url(#linearGradient3005)"
          />
          <path
            d="m79.823 41.401c-23.39-8.0619-52.043 11.216-52.043 49.829 0 63.048 46.721 68.77 52.384 68.77 40.892 0 79.836-33.796 79.836-80.036 0-51.396-44.64-79.865-79.836-79.865 9.7481-1.35 52.541 10.55 52.541 69.037 0 38.141-31.953 58.905-52.735 50.033-0.47743-0.17707-23.514-9.2645-23.514-38.951 0-29.56 23.367-38.818 23.367-38.818z"
            color="#000000"
            fill="url(#linearGradient3002)"
          />
        </g>
      </svg>
    );
  }
  return <File className="mr-2 h-4 w-4" />;
};

export function FilePicker({
  workspaceFilePaths,
  meltyFilePaths,
  handleAddFile,
  handleDropFile,
}: {
  meltyFilePaths: string[];
  workspaceFilePaths: string[];
  handleAddFile: (filePath: string) => void;
  handleDropFile: (filePath: string) => void;
}) {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Check for Cmd+Shift+m on Mac or Ctrl+Shift+m on Windows/Linux
      if (event.key === "\\") {
        event.preventDefault(); // Prevent default browser behavior
        setOpen(true);
      }
    };

    document.addEventListener("keydown", handleKeyPress);
    return () => document.removeEventListener("keydown", handleKeyPress);
  }, []);

  return (
    <>
      <CommandDialog open={open} onOpenChange={setOpen} key="file-picker">
        <CommandInput id="file" placeholder="Type a filename" />
        <CommandList>
          <CommandEmpty>All files in workspace are in context.</CommandEmpty>
          {/* todo - would be nice to show recent or suggested here */}
          <CommandGroup heading="Current">
            {meltyFilePaths.map((filePath) => (
              <CommandItem
                onSelect={() => handleDropFile(filePath)}
                key={filePath}
              >
                <span className="mr-2">{getFileIcon(filePath)}</span>
                <span>{filePath}</span>
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandGroup heading="Add to context">
            {workspaceFilePaths
              .filter((filePath) => !meltyFilePaths.includes(filePath))
              .map((filePath: string) => (
                <CommandItem
                  onSelect={() => handleAddFile(filePath)}
                  className="data-[disabled]:text-gray-500"
                  key={filePath}
                >
                  <span className="mr-2">{getFileIcon(filePath)}</span>
                  <span>{filePath}</span>
                  <CommandShortcut>+</CommandShortcut>
                </CommandItem>
              ))}
          </CommandGroup>
          <CommandSeparator />
        </CommandList>
        <div className="flex justify-end my-3">
          <p className="flex items-center text-xs pr-4">
            Add/Drop
            <span className="ml-1">⏎</span>
          </p>
        </div>
      </CommandDialog>
    </>
  );
}
