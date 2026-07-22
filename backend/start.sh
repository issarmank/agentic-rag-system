#!/bin/sh
set -e

# The arq worker runs in-process inside main.py's lifespan on Render (see
# main.py) instead of as a second `arq` OS process here — that used to double
# the embedding model's memory footprint and OOM-kill the container.
# --proxy-headers makes uvicorn trust X-Forwarded-For from Azure Container
# Apps' ingress and rewrite request.client to the real caller IP — without
# it every request looks like it comes from the ingress's internal address,
# which would collapse IP-based rate limiting onto one shared bucket for
# all users. Container Apps ingress always proxies to the container (no
# direct internet exposure), so trusting that hop is safe.
exec uvicorn main:app --host 0.0.0.0 --port "${PORT:-8000}" --proxy-headers --forwarded-allow-ips='*'
