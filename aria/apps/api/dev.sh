#!/bin/bash
uv run uvicorn aria.main:app --reload --reload-dir aria --port 8000
