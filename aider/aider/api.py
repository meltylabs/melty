import os
import sys
from typing import Dict, List, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from aider.io import InputOutput
from aider.main import main as aider_main

app = FastAPI()

# Global variable to store the Coder instance
coder = None


class AiderRequest(BaseModel):
    message: str


class FileChange(BaseModel):
    filename: str
    content: str


class TokenUsage(BaseModel):
    tokens_sent: int
    tokens_received: int
    cost_call: float
    cost_session: float


class AiderResponse(BaseModel):
    message: str
    status: str
    fileChanges: Optional[List[FileChange]] = None
    usage: Optional[TokenUsage] = None


class StartupRequest(BaseModel):
    root_dir: str


@app.post("/startup")
async def startup(request: StartupRequest):
    global coder
    try:
        os.chdir(request.root_dir)
        io = InputOutput(api_mode=True)
        coder = aider_main([], input=[], output=[], return_coder=True, io=io)
        return {"status": "success", "message": f"Aider started in {request.root_dir}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start Aider: {str(e)}")


@app.on_event("startup")
async def startup_event():
    # This event is now empty as we'll initialize Aider on-demand
    pass


@app.post("/aider/sendCommand", response_model=AiderResponse)
async def send_command(request: AiderRequest):
    global coder
    try:
        coder.io.clear_captured_output()
        result = coder.run(with_message=request.message)
        full_output = coder.io.get_captured_output()

        # Extract token usage information
        usage_info = extract_token_usage(full_output)

        # Remove token usage information from the main message
        main_message = remove_token_usage_info(full_output)

        # Parse the output to extract file changes
        file_changes = []
        edits = coder.get_edits()
        for edit in edits:
            filename, original, updated = edit
            file_changes.append(FileChange(filename=filename, content=updated))

        return AiderResponse(
            message=main_message,
            status="success",
            fileChanges=file_changes,
            usage=usage_info,
        )
    except SystemExit as e:
        # Catch SystemExit and return an appropriate error message
        return AiderResponse(message=f"Invalid arguments: {str(e)}", status="error")
    except Exception as e:
        return AiderResponse(message=f"An error occurred: {str(e)}", status="error")


def extract_token_usage(output: str) -> TokenUsage:
    # Extract token usage information from the output
    # This is a simple implementation and might need to be adjusted based on the exact format of the output
    import re

    tokens_sent = tokens_received = cost_call = cost_session = 0

    match = re.search(
        r"Tokens: (\d+) sent, (\d+) received\. Cost: \$([0-9.]+) request, \$([0-9.]+) session",
        output,
    )
    if match:
        tokens_sent = int(match.group(1))
        tokens_received = int(match.group(2))
        cost_call = float(match.group(3))
        cost_session = float(match.group(4))

    return TokenUsage(
        tokens_sent=tokens_sent,
        tokens_received=tokens_received,
        cost_call=cost_call,
        cost_session=cost_session,
    )


def remove_token_usage_info(output: str) -> str:
    # Remove the token usage information from the output
    import re

    return re.sub(r"\nTokens: .* session\.\n", "", output)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
