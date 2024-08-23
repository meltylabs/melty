import * as assert from "assert";
import { applyWithReindent } from "../diffApplication/strategies";
import { SearchReplace } from "../types";

suite("applyWithReindent", () => {
  test("should reindent and apply diff when indentation matches", async () => {
    const originalContents = `
function example() {
    console.log("Hello");
    if (true) {
        console.log("World");
    }
}`;

    const searchReplace: SearchReplace = {
      search: `console.log("Hello");
if (true) {
    console.log("World");`,
      replace: `console.log("Hello, reindented!");
if (true) {
    console.log("Reindented World");`,
      filePath: "test.ts", // filePath is not used in the function, but required by the type
    };

    const result = await applyWithReindent(originalContents, searchReplace);

    const expected = `
function example() {
    console.log("Hello, reindented!");
    if (true) {
        console.log("Reindented World");
    }
}`;

    assert.strictEqual(result, expected);
  });

  test("should return null when no match is found", async () => {
    const originalContents = `
function example() {
    console.log("Hello");
    if (true) {
        console.log("World");
    }
}`;

    const searchReplace: SearchReplace = {
      search: `console.log("Nonexistent");
if (true) {
    console.log("Not here");`,
      replace: `console.log("Won't be replaced");
if (true) {
    console.log("Still not here");`,
      filePath: "test.ts",
    };

    const result = await applyWithReindent(originalContents, searchReplace);

    assert.strictEqual(result, null);
  });

  test("should handle multiple potential matches and choose the correct one", async () => {
    const originalContents = `
function example1() {
    console.log("Hello");
    if (true) {
        console.log("World");
    }
}

function example2() {
    console.log("Hello");
    if (false) {
        console.log("World");
    }
}`;

    const searchReplace: SearchReplace = {
      search: `console.log("Hello");
if (true) {
    console.log("World");`,
      replace: `console.log("Hello, replaced!");
if (true) {
    console.log("Replaced World");`,
      filePath: "test.ts",
    };

    const result = await applyWithReindent(originalContents, searchReplace);

    const expected = `
function example1() {
    console.log("Hello, replaced!");
    if (true) {
        console.log("Replaced World");
    }
}

function example2() {
    console.log("Hello");
    if (false) {
        console.log("World");
    }
}`;

    assert.strictEqual(result, expected);
  });

  test("should handle different indentation levels", async () => {
    const originalContents = `
function example() {
    if (true) {
        console.log("Deeply nested");
        if (false) {
            console.log("Even deeper");
        }
    }
}`;

    const searchReplace: SearchReplace = {
      search: `console.log("Deeply nested");
if (false) {
    console.log("Even deeper");`,
      replace: `console.log("Deeply nested, replaced");
if (false) {
    console.log("Even deeper, also replaced");`,
      filePath: "test.ts",
    };

    const result = await applyWithReindent(originalContents, searchReplace);

    const expected = `
function example() {
    if (true) {
        console.log("Deeply nested, replaced");
        if (false) {
            console.log("Even deeper, also replaced");
        }
    }
}`;

    assert.strictEqual(result, expected);
  });
});

