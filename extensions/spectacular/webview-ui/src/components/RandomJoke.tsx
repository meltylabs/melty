import React, { useState } from 'react';
import { Button } from "./ui/button";

const jokes = [
  "Why do programmers prefer dark mode? Because light attracts bugs!",
  "Why did the developer go broke? Because he used up all his cache!",
  "Why do Java developers wear glasses? Because they don't C#!",
  "What's a programmer's favorite hangout spot? The Foo Bar!",
  "Why was the JavaScript developer sad? Because he didn't Node how to Express himself!",
];

export function RandomJoke() {
  const [joke, setJoke] = useState("");

  const getRandomJoke = () => {
    const randomIndex = Math.floor(Math.random() * jokes.length);
    setJoke(jokes[randomIndex]);
  };

  return (
    <div className="mt-4 p-4 bg-muted rounded-md">
      <h3 className="text-lg font-semibold mb-2">Random Coding Joke</h3>
      {joke ? (
        <p className="mb-4">{joke}</p>
      ) : (
        <p className="text-muted-foreground mb-4">Click the button for a joke!</p>
      )}
      <Button onClick={getRandomJoke}>
        {joke ? "Get Another Joke" : "Get a Joke"}
      </Button>
    </div>
  );
}

