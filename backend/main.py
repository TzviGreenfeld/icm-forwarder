import os
from typing import List, Optional
from datetime import datetime
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Depends
import json
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Simple POST endpoint that logs the body


@app.post("/log")
async def log_body(body: dict):
    """Simple endpoint that logs the request body"""
    logger.info(f"Received POST request to /log endpoint")
    logger.info(f"Request body: {json.dumps(body, indent=2)}")

    # Also print to stdout for better visibility in Docker logs
    print(f"\n{'='*50}")
    print(f"POST /log - Request Body:")
    print(f"{json.dumps(body, indent=2)}")
    print(f"{'='*50}\n")

    return {
        "status": "success",
        "message": "Body logged successfully",
        "received_data": body
    }
