#!/bin/sh
set -e

# Free-tier Render only gives us one web service, so the arq worker runs
# alongside uvicorn in the same container instead of as its own service.
arq worker.WorkerSettings &

exec uvicorn main:app --host 0.0.0.0 --port "${PORT:-8000}"
