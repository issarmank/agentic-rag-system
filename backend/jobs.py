import json
import os

import redis
from dotenv import load_dotenv

load_dotenv()

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
JOB_TTL_SECONDS = 3600

_client: redis.Redis | None = None


def get_redis() -> redis.Redis:
    global _client
    if _client is None:
        _client = redis.Redis.from_url(REDIS_URL, decode_responses=True)
    return _client


def _job_key(job_id: str) -> str:
    return f"ingest:job:{job_id}"


def job_channel(job_id: str) -> str:
    return f"ingest:job:{job_id}:events"


def set_status(job_id: str, stage: str, **extra) -> None:
    payload = {"stage": stage, **extra}
    raw = json.dumps(payload)
    pipe = get_redis().pipeline()
    pipe.set(_job_key(job_id), raw, ex=JOB_TTL_SECONDS)
    pipe.publish(job_channel(job_id), raw)
    pipe.execute()


def get_status(job_id: str) -> dict | None:
    raw = get_redis().get(_job_key(job_id))
    return json.loads(raw) if raw else None
