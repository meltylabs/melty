# spectacular README

Spectacular is a VSCode extension that provides a UI for Aider.

Aider is AI pair programming in your terminal. Aider lets you pair program with LLMs, to edit code in your local git repository. It's written in Python.

## Development

## File Structure

The root directory contains the vscode extension (TypeScript).

`/aider` contains a fork of aider (Python).

## Development Plan

If Aider is started from within the VSCode extension, it won't have permissions to write to the filesystem directly. To get around this,
we'll start out by prototyping a system where the user installs and start the Aider server separately.

Aider is built to interface with the CLI, the filesystem (via `open`), and git (via the `git` module).

### Phase 1: HTTP API Integration

We'll add an HTTP API to Aider that it can use to receive commands as if from the CLI. It will send back messages as if to the CLI.
We'll have Spectacular use this API to send commands to Aider and receive messages back:

```typescript
type AiderInterface = {
  sendCommand: (message: string) => Promise<AiderResponse>;
}

type AiderResponse = {
  message: string;
  status: 'success' | 'error';
  fileChanges?: Array<{filename: string, content: string}>;
}
```

Aider will continue to apply changes to the filesystem, and to interact with git, as usual. The API will include endpoints for:
- Sending commands
- Getting the current status
- Retrieving file changes

### Phase 2: Websocket Integration

We'll use a websocket connection between Spectacular and Aider for real-time communication. On top of that websocket connection, we'll build an API that Aider can use to read or write a file in the VSCode workspace, and to interact with the git repo. E.g.:

```python
SpectacularInterface.read_file(filename)
SpectacularInterface.write_file(filename, content)
SpectacularInterface.repo.commit(message)
SpectacularInterface.repo.is_dirty(message)
# etc.
```

Security considerations:
- Implement authentication for the websocket connection
- Validate and sanitize all inputs
- Limit file access to the current workspace

### Error Handling and Logging

We'll implement robust error handling and logging throughout the integration:
- Log all API requests and responses
- Implement try-catch blocks for all critical operations
- Create custom error types for different scenarios
- Provide meaningful error messages to the user

### Testing

We'll create a comprehensive test suite for the integration:
- Unit tests for individual components
- Integration tests for the API and websocket communication
- End-to-end tests simulating real user scenarios
- Implement continuous integration to run tests automatically

## Running Aider

1. cd aider
2. source venv/bin/activate
3. pip install -r requirements.txt
4. source ../.env
5. python3 -m aider.api
6. curl -X POST http://0.0.0.0:8000/aider -H "Content-Type: application/json" -d '{"files": ["abc.py"], "message": "say hi", "model": "claude-3-5-sonnet-20240620"}'
