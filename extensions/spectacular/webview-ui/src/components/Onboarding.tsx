import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Checkbox } from "./ui/checkbox";
const checklistItems = [
  {
    id: "welcome",
    title: "Get an Anthropic API key",
    link: {
      text: "Get Anthropic key",
      href: "https://console.anthropic.com/settings/keys",
    },
  },
  {
    id: "welcome",
    title: "Set your Anthropic API key",
    description:
      "Open user settings (CMD+SHIFT+P → Open User Settings), search for Melty, and set the Anthropic key.",
  },
  {
    id: "repo",
    title: "Open a directory that has a git repo in its root",
    description: "Melty uses the repo to commit changes as it goes along.",
  },
  {
    id: "chat",
    title: "Plug into a monitor and make it big!",
    description: "Melty is designed for big screens.",
  },
];
export function Onboarding() {
  return (
    <Card className="w-[400px]">
      <CardHeader>
        <CardTitle>🫠 Welcome to Melty!</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-8">
          {checklistItems.map((item) => (
            <li key={item.id} className="">
              <div className="flex items-center space-x-2">
                <Checkbox id={item.id} />
                <label
                  htmlFor={item.id}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  {item.title}
                </label>
              </div>

              <p className="text-sm mt-2 text-muted-foreground">
                {item.description}
              </p>
              {item.link && (
                <a
                  className="text-sm underline text-muted-foreground"
                  href={item.link.href}
                  target="_blank"
                >
                  {item.link.text} &rarr;
                </a>
              )}
            </li>
          ))}
        </ul>
        <div className="mt-6">
          <Link to="/" className="w-full">
            <Button className="w-full">Start coding with Melty</Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
