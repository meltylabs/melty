import io
import sys
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from aider.main import main as aider_main

app = FastAPI()


class AiderRequest(BaseModel):
    files: List[str]
    message: Optional[str] = None
    model: Optional[str] = None


class AiderResponse(BaseModel):
    result: str


@app.post("/aider", response_model=AiderResponse)
async def run_aider(request: AiderRequest):
    try:
        args = []
        if request.files:
            args.extend(request.files)
        if request.message:
            args.extend(["--message", request.message])
        if request.model:
            args.extend(["--model", request.model])

        # Capture stdout
        old_stdout = sys.stdout
        sys.stdout = io.StringIO()

        try:
            result = aider_main(args, input=[], output=[])
            output = sys.stdout.getvalue()
        finally:
            sys.stdout = old_stdout

        return AiderResponse(result=output + "\n" + str(result))

        return AiderResponse(result=output)
    except SystemExit as e:
        # Catch SystemExit and return an appropriate error message
        raise HTTPException(status_code=400, detail=f"Invalid arguments: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
