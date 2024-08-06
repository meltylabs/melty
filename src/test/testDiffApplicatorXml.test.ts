import * as assert from 'assert';
import { PseudoCommit } from '../backend/pseudoCommits';
import * as pseudoCommits from '../backend/pseudoCommits';
import { SearchReplace } from 'backend/searchReplace';
import { splitResponse, applySearchReplaceBlocks } from '../backend/diffApplicatorXml';
import * as meltyFiles from '../backend/meltyFiles';

suite('find search replace blocks', () => {
    test('should find original update blocks', () => {
        const edit = `
Here's the change:

<CodeChange file="foo.txt">
<<<<<<< SEARCH
Two
=======
Tooooo
>>>>>>> REPLACE
\`\`\`
</CodeChange>

Hope you like it!
`;

        const { searchReplaceList } = splitResponse(edit);
        assert.deepStrictEqual(searchReplaceList, [{ filePath: "foo.txt", search: "Two\n", replace: "Tooooo\n" }]);
    });


    test('should find multiple update blocks', () => {
        const edit = `
Here's the change:

<CodeChange file="foo.txt">
<<<<<<< SEARCH
Two
=======
Tooooo
>>>>>>> REPLACE
\`\`\`
<<<<<<< SEARCH
Three
=======
Threeeeeee
>>>>>>> REPLACE
\`\`\`


</CodeChange>

Hope you like it!
`;

        const { searchReplaceList } = splitResponse(edit);
        assert.deepStrictEqual(searchReplaceList, [
            { filePath: "foo.txt", search: "Two\n", replace: "Tooooo\n" },
            { filePath: "foo.txt", search: "Three\n", replace: "Threeeeeee\n" }
        ]);
    });

    test('should throw error for unclosed block', () => {
        const edit = `
Here's the change:

<CodeChange file="foo.txt">
<<<<<<< SEARCH
Two
=======
Tooooo
</CodeChange>


oops!
`;

        assert.throws(() => {
            splitResponse(edit);
        }, /Unexpected next section/);
    });

    test('should throw error for missing filename', () => {
        const edit = `
Here's the change:

<CodeChange>
<<<<<<< SEARCH
Two
=======
Tooooo
>>>>>>> REPLACE
</CodeChange>

oops!
`;

        assert.throws(() => {
            splitResponse(edit);
        }, /filename/);
    });

    test('should handle blocks with no final newline', () => {
        const edit = `
<CodeChange file="aider/coder.py">
<<<<<<< SEARCH
            self.console.print("[red]^C again to quit")
=======
            self.io.tool_error("^C again to quit")
>>>>>>> REPLACE
</CodeChange>

<CodeChange file="aider/coder.py">
<<<<<<< SEARCH
            self.io.tool_error("Malformed ORIGINAL/UPDATE blocks, retrying...")
            self.io.tool_error(err)
=======
            self.io.tool_error("Malformed ORIGINAL/UPDATE blocks, retrying...")
            self.io.tool_error(str(err))
>>>>>>> REPLACE
</CodeChange>

<CodeChange file="aider/coder.py">
<<<<<<< SEARCH
            self.console.print("[red]Unable to get commit message from gpt-3.5-turbo. Use /commit to try again.\\n")
=======
            self.io.tool_error("Unable to get commit message from gpt-3.5-turbo. Use /commit to try again.")
>>>>>>> REPLACE
</CodeChange>

<CodeChange file="aider/coder.py">
<<<<<<< SEARCH
            self.console.print("[red]Skipped commmit.")
=======
            self.io.tool_error("Skipped commmit.")
>>>>>>> REPLACE
</CodeChange>`;

        // Should not throw an error
        assert.doesNotThrow(() => {
            splitResponse(edit);
        });
    });
});

suite('applySearchReplaceBlocks', () => {
    test('should apply search and replace correctly', () => {
        const initialState: PseudoCommit = pseudoCommits.createFromDiffAndParentCommit({
            'test.txt': meltyFiles.create('test.txt', 'Hello, world!\nThis is a test.')
        }, "");
        const searchReplace: SearchReplace = {
            filePath: 'test.txt',
            search: 'world',
            replace: 'universe'
        };

        const newState = applySearchReplaceBlocks(initialState, [searchReplace]);

        assert.strictEqual(pseudoCommits.getFileContents(newState, 'test.txt'), 'Hello, universe!\nThis is a test.');
    });

    test('should throw error if search text not found', () => {
        const initialState: PseudoCommit = pseudoCommits.createFromDiffAndParentCommit({
            'test.txt': meltyFiles.create('test.txt', 'Hello, world!\nThis is a test.')
        }, "");
        const searchReplace: SearchReplace = {
            filePath: 'test.txt',
            search: 'universe',
            replace: 'world'
        };

        assert.throws(() => {
            applySearchReplaceBlocks(initialState, [searchReplace]);
        }, /Search text universe not found in test.txt/);
    });

    test('should create new file if it doesn\'t exist', () => {
        const initialState: PseudoCommit = pseudoCommits.createFromDiffAndParentCommit({}, undefined, "");
        const searchReplace: SearchReplace = {
            filePath: 'new.txt',
            search: '',
            replace: 'New content'
        };

        const newState = applySearchReplaceBlocks(initialState, [searchReplace]);

        assert.strictEqual(pseudoCommits.getFileContents(newState, 'new.txt'), 'New content');
    });
});