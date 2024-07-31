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

Phase 1a:

We'll add an HTTP API to Aider that it can use to receive commands as if from the CLI. It will send back messages as if to the CLI.

Phase 1b:

We'll have Spectacular use this API to send commands to Aider and receive messages back, like so:

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

Throughout Phase 1, Aider will continue to apply changes to the filesystem, and to interact with git, as usual.

### Phase 2: Websocket Integration

We'll use a websocket connection between Spectacular and Aider for real-time communication. On top of that websocket connection, we'll build an API that Aider can use to read or write a file in the VSCode workspace, and to interact with the git repo. E.g.:

```python
SpectacularInterface.read_file(filename)
SpectacularInterface.write_file(filename, content)
SpectacularInterface.repo.commit(message)
SpectacularInterface.repo.is_dirty(message)
# etc.
```

## Running Aider

1. cd aider
2. source venv/bin/activate
3. source ../.env
4. python3 -m aider.api
5. Go to http://0.0.0.0:8000/docs and click "Send Request" or curl -X POST http://0.0.0.0:8000/aider -H "Content-Type: application/json" -d '{"files": ["abc.py"], "message": "say hi", "model": "claude-3-5-sonnet-20240620"}'
