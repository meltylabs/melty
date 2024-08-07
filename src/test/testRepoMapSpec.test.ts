import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { RepoMapSpec } from '../backend/repoMapSpec';

suite('RepoMapSpec', () => {
    let tempDir: string;

    setup(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'repomapspec-test-'));
    });

    teardown(() => {
        fs.rmdirSync(tempDir, { recursive: true });
    });

    test('getRepoMap should include all test files', async () => {
        const testFiles = [
            'test_file1.py',
            'test_file2.py',
            'test_file3.md',
            'test_file4.json',
        ];

        testFiles.forEach(file => {
            fs.writeFileSync(path.join(tempDir, file), '');
        });

        const repoMap = new RepoMapSpec({ repository: null, rootPath: tempDir });
        const result = await repoMap.getRepoMap(testFiles);

        testFiles.forEach(file => {
            assert.ok(result.includes(file), `Result should contain ${file}`);
        });
    });

    test('getRepoMap with identifiers should include expected identifiers', async () => {
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

        const repoMap = new RepoMapSpec({ repository: null, rootPath: tempDir });
        const result = await repoMap.getRepoMap([testFile1, testFile2, testFile3]);

        const expectedIdentifiers = ['test_file_with_identifiers.py', 'MyClass', 'my_method', 'my_function', 'test_file_pass.py'];
        expectedIdentifiers.forEach(identifier => {
            assert.ok(result.includes(identifier), `Result should contain ${identifier}`);
        });
    });
});