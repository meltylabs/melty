import os
import re
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from aider.capture_output import CaptureOutput
from aider.io import InputOutput
from aider.main import main as aider_main

app = FastAPI()

# Global variable to store the Coder instance
coder = None

# Pydantic models
class AskRequest(BaseModel):
    message: str

class AddRequest(BaseModel):
    files: List[str]

class DropRequest(BaseModel):
    files: List[str]

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

# API routes
@app.post("/startup")
async def startup(request: StartupRequest):
    global coder
    try:
        os.chdir(request.root_dir)
        capture_output = CaptureOutput()
        io = InputOutput(capture_output=capture_output, yes=True)
        coder = aider_main([], input=[], output=[], return_coder=True, io=io)
        return {"status": "success", "message": f"Aider started in {request.root_dir}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start Aider: {str(e)}")

@app.post("/aider/ask", response_model=AiderResponse)
async def ask_command(request: AskRequest):
    return await send_command(command="ask", formatted_command=f"/ask {request.message}")

@app.post("/aider/add", response_model=AiderResponse)
async def add_command(request: AddRequest):
    return await send_command(command="add", formatted_command=f"/add {' '.join(request.files)}")

@app.post("/aider/drop", response_model=AiderResponse)
async def drop_command(request: DropRequest):
    return await send_command(command="drop", formatted_command=f"/drop {' '.join(request.files)}")

@app.post("/aider/diff", response_model=AiderResponse)
async def diff_command():
    return await send_command(command="diff", formatted_command="/diff")

@app.post("/aider/code", response_model=AiderResponse)
async def code_command(request: AskRequest):
    return await send_command(command="code", formatted_command=request.message)

# Helper functions
async def send_command(command: str, formatted_command: str):
    global coder
    if not coder:
        return AiderResponse(message="Aider is not running", status="error")

    try:
        coder.io.capture_output.clear_output()

        if command == "code":
            coder.run(with_message=formatted_command)
        else:
            coder.commands.run(formatted_command)

        full_output = coder.io.capture_output.read_output()
        usage_info = extract_token_usage(full_output)
        main_message = remove_token_usage_info(full_output)

        file_changes = [
            FileChange(filename=filename, content=updated)
            for filename, _, updated in coder.get_edits()
        ]

        return AiderResponse(
            message=main_message,
            status="success",
            fileChanges=file_changes,
            usage=usage_info,
        )
    except SystemExit as e:
        return AiderResponse(message=f"Invalid arguments: {str(e)}", status="error")
    except Exception as e:
        return AiderResponse(message=f"An error occurred: {str(e)}", status="error")

def extract_token_usage(output: str) -> TokenUsage:
    tokens_sent = tokens_received = cost_call = cost_session = 0

    matches = re.findall(
        r"Tokens: ([\d,]+) sent, ([\d,]+) received\. Cost: \$([0-9.]+) request, \$([0-9.]+) session",
        output,
    )
    for match in matches:
        tokens_sent += int(match[0].replace(",", ""))
        tokens_received += int(match[1].replace(",", ""))
        cost_call += float(match[2])
        cost_session += float(match[3])

    return TokenUsage(
        tokens_sent=tokens_sent,
        tokens_received=tokens_received,
        cost_call=cost_call,
        cost_session=cost_session,
    )

def remove_token_usage_info(output: str) -> str:
    return re.sub(r"\nTokens: .* session\.\n", "", output)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
