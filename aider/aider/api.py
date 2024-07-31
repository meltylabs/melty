import sys
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from aider.main import main as aider_main
from aider.io import InputOutput

app = FastAPI()

# Global variable to store the Coder instance
coder = None

class AiderRequest(BaseModel):
    message: str

class FileChange(BaseModel):
    filename: str
    content: str

class AiderResponse(BaseModel):
    message: str
    status: str
    fileChanges: Optional[List[FileChange]] = None

@app.on_event("startup")
async def startup_event():
    global coder
    # Initialize the Coder instance with custom InputOutput
    io = InputOutput(api_mode=True)
    coder = aider_main([], input=[], output=[], return_coder=True, io=io)

@app.post("/aider/sendCommand", response_model=AiderResponse)
async def send_command(request: AiderRequest):
    global coder
    try:
        coder.io.clear_captured_output()
        result = coder.run(with_message=request.message)
        output = coder.io.get_captured_output()

        # Parse the output to extract file changes
        file_changes = []
        edits = coder.get_edits()
        for edit in edits:
            filename, original, updated = edit
            file_changes.append(FileChange(filename=filename, content=updated))

        return AiderResponse(
            message=output,
            status="success",
            fileChanges=file_changes
        )
    except SystemExit as e:
        # Catch SystemExit and return an appropriate error message
        return AiderResponse(
            message=f"Invalid arguments: {str(e)}",
            status="error"
        )
    except Exception as e:
        return AiderResponse(
            message=f"An error occurred: {str(e)}",
            status="error"
        )

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
