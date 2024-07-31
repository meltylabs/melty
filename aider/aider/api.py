import io
import sys
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from aider.main import main as aider_main

app = FastAPI()


class AiderRequest(BaseModel):
    message: str


class FileChange(BaseModel):
    filename: str
    content: str


class AiderResponse(BaseModel):
    message: str
    status: str
    fileChanges: Optional[List[FileChange]] = None


@app.post("/aider/sendCommand", response_model=AiderResponse)
async def send_command(request: AiderRequest):
    try:
        # Capture stdout
        old_stdout = sys.stdout
        sys.stdout = io.StringIO()

        try:
            result = aider_main(["--message", request.message], input=[], output=[])
            output = sys.stdout.getvalue()
        finally:
            sys.stdout = old_stdout

        # Parse the output to extract file changes
        file_changes = []
        # TODO: Implement logic to parse output and extract file changes

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
