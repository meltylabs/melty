Structure:

`spectacular` contains the vscode extension

`spectacular/aider` contains a fork of aider.

To run aider:

1. cd aider
2. source venv/bin/activate
3. source ../.env
4. python3 -m aider.api
5. curl -X POST http://0.0.0.0:8000/aider -H "Content-Type: application/json" -d '{"files": ["abc.py"], "message": "say hi", "model": "claude-3-5-sonnet-20240620"}'