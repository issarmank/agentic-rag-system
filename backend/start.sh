#!/bin/sh
set -e

# The arq worker runs in-process inside main.py's lifespan on Render (see
# main.py) instead of as a second `arq` OS process here — that used to double
# the embedding model's memory footprint and OOM-kill the container.
exec uvicorn main:app --host 0.0.0.0 --port "${PORT:-8000}"
