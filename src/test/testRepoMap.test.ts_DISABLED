import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { RepoMap } from '../backend/repoMap';

suite('RepoMap', () => {
    let tempDir: string;

    setup(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'repomap-test-'));
    });

    teardown(() => {
        fs.rmdirSync(tempDir, { recursive: true });
    });

    test('get_repo_map should include all test files', () => {
        const testFiles = [
            'test_file1.py',
            'test_file2.py',
            'test_file3.md',
            'test_file4.json',
        ];

        testFiles.forEach(file => {
            fs.writeFileSync(path.join(tempDir, file), '');
        });

        const repoMap = new RepoMap({ root: tempDir });
        const otherFiles = testFiles.map(file => path.join(tempDir, file));
        const result = repoMap.getRepoMap([], otherFiles);

        testFiles.forEach(file => {
            assert.ok(result.includes(file), `Result should contain ${file}`);
        });
    });

    test('get_repo_map_with_identifiers should include expected identifiers', () => {
        const testFile1 = 'test_file_with_identifiers.py';
        const fileContent1 = `
class MyClass:
    def my_method(self, arg1, arg2):
        return arg1 + arg2

def my_function(arg1, arg2):
    return arg1 * arg2
`;

        const testFile2 = 'test_file_import.py';
        const fileContent2 = `
from test_file_with_identifiers import MyClass

obj = MyClass()
print(obj.my_method(1, 2))
print(my_function(3, 4))
`;

        const testFile3 = 'test_file_pass.py';
        const fileContent3 = 'pass';

        fs.writeFileSync(path.join(tempDir, testFile1), fileContent1);
        fs.writeFileSync(path.join(tempDir, testFile2), fileContent2);
        fs.writeFileSync(path.join(tempDir, testFile3), fileContent3);

        const repoMap = new RepoMap({ root: tempDir });
        const otherFiles = [testFile1, testFile2, testFile3].map(file => path.join(tempDir, file));
        const result = repoMap.getRepoMap([], otherFiles);

        const expectedIdentifiers = ['test_file_with_identifiers.py', 'MyClass', 'my_method', 'my_function', 'test_file_pass.py'];
        expectedIdentifiers.forEach(identifier => {
            assert.ok(result.includes(identifier), `Result should contain ${identifier}`);
        });
    });

    test('get_repo_map_all_files should include all file types', () => {
        const testFiles = [
            'test_file0.py',
            'test_file1.txt',
            'test_file2.md',
            'test_file3.json',
            'test_file4.html',
            'test_file5.css',
            'test_file6.js',
        ];

        testFiles.forEach(file => {
            fs.writeFileSync(path.join(tempDir, file), '');
        });

        const repoMap = new RepoMap({ root: tempDir });
        const otherFiles = testFiles.map(file => path.join(tempDir, file));
        const result = repoMap.getRepoMap([], otherFiles);

        testFiles.forEach(file => {
            assert.ok(result.includes(file), `Result should contain ${file}`);
        });
    });

    test('get_repo_map_excludes_added_files should exclude chat files', () => {
        const testFiles = [
            'test_file1.py',
            'test_file2.py',
            'test_file3.md',
            'test_file4.json',
        ];

        testFiles.forEach(file => {
            fs.writeFileSync(path.join(tempDir, file), 'def foo(): pass\n');
        });

        const repoMap = new RepoMap({ root: tempDir });
        const allFiles = testFiles.map(file => path.join(tempDir, file));
        const result = repoMap.getRepoMap(allFiles.slice(0, 2), allFiles.slice(2));

        assert.ok(!result.includes('test_file1.py'), 'Result should not contain test_file1.py');
        assert.ok(!result.includes('test_file2.py'), 'Result should not contain test_file2.py');
        assert.ok(result.includes('test_file3.md'), 'Result should contain test_file3.md');
        assert.ok(result.includes('test_file4.json'), 'Result should contain test_file4.json');
    });
});

suite('RepoMap TypeScript', () => {
    let tempDir: string;

    setup(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'repomap-test-'));
    });

    teardown(() => {
        fs.rmdirSync(tempDir, { recursive: true });
    });

    test('get_repo_map_typescript should include TypeScript-specific identifiers', () => {
        const testFileTs = 'test_file.ts';
        const fileContentTs = `
interface IMyInterface {
    someMethod(): void;
}

type ExampleType = {
    key: string;
    value: number;
};

enum Status {
    New,
    InProgress,
    Completed,
}

export class MyClass {
    constructor(public value: number) {}

    add(input: number): number {
        return this.value + input;
    }
}

export function myFunction(input: number): number {
    return input * 2;
}
`;

        fs.writeFileSync(path.join(tempDir, testFileTs), fileContentTs);

        const repoMap = new RepoMap({ root: tempDir });
        const otherFiles = [path.join(tempDir, testFileTs)];
        const result = repoMap.getRepoMap([], otherFiles);

        const expectedIdentifiers = ['test_file.ts', 'IMyInterface', 'ExampleType', 'Status', 'MyClass', 'add', 'myFunction'];
        expectedIdentifiers.forEach(identifier => {
            assert.ok(result.includes(identifier), `Result should contain ${identifier}`);
        });
    });
});

suite('RepoMap All Languages', () => {
    let tempDir: string;

    setup(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'repomap-test-'));
    });

    teardown(() => {
        fs.rmdirSync(tempDir, { recursive: true });
    });

    test('get_repo_map_all_languages should include files from all languages', () => {
        const languageFiles = {
            c: ['test.c', '#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}\n'],
            csharp: ['test.cs', 'using System;\n\nclass Program {\n    static void Main() {\n        Console.WriteLine("Hello, World!");\n    }\n}\n'],
            cpp: ['test.cpp', '#include <iostream>\n\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}\n'],
            elisp: ['test.el', '(defun greet (name)\n  (message "Hello, %s!" name))\n'],
            elixir: ['test.ex', 'defmodule Greeter do\n  def hello(name) do\n    IO.puts("Hello, #{name}!")\n  end\nend\n'],
            elm: ['test.elm', 'module Main exposing (main)\n\nimport Html exposing (text)\n\nmain =\n    text "Hello, World!"\n'],
            go: ['test.go', 'package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, World!")\n}\n'],
            java: ['Test.java', 'public class Test {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}\n'],
            javascript: ['test.js', 'function greet(name) {\n    console.log(`Hello, ${name}!`);\n}\n'],
            ocaml: ['test.ml', 'let greet name =\n  Printf.printf "Hello, %s!\\n" name\n'],
            php: ['test.php', '<?php\nfunction greet($name) {\n    echo "Hello, $name!";\n}\n?>\n'],
            python: ['test.py', 'def greet(name):\n    print(f"Hello, {name}!")\n'],
            ql: ['test.ql', 'predicate greet(string name) {\n  name = "World"\n}\n'],
            ruby: ['test.rb', 'def greet(name)\n  puts "Hello, #{name}!"\nend\n'],
            rust: ['test.rs', 'fn main() {\n    println!("Hello, World!");\n}\n'],
            typescript: ['test.ts', 'function greet(name: string): void {\n    console.log(`Hello, ${name}!`);\n}\n'],
        };

        Object.entries(languageFiles).forEach(([_, [filename, content]]) => {
            fs.writeFileSync(path.join(tempDir, filename), content);
        });

        const repoMap = new RepoMap({ root: tempDir });
        const otherFiles = Object.values(languageFiles).map(([filename, _]) => path.join(tempDir, filename));
        const result = repoMap.getRepoMap([], otherFiles);

        Object.entries(languageFiles).forEach(([lang, [filename, _]]) => {
            assert.ok(result.includes(filename), `Result should contain ${filename} for ${lang}`);
        });
    });
});