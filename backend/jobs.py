import json
import os

import redis
from dotenv import load_dotenv

load_dotenv()

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
JOB_TTL_SECONDS = 3600

_client: redis.Redis | None = None
_raw_client: redis.Redis | None = None


def get_redis() -> redis.Redis:
    global _client
    if _client is None:
        _client = redis.Redis.from_url(REDIS_URL, decode_responses=True)
    return _client


def get_redis_raw() -> redis.Redis:
    """Undecoded client for binary values (uploaded file bytes) — the web and
    worker apps run as separate containers with separate filesystems, so the
    uploaded file can't be handed off as a local path; it's staged here."""
    global _raw_client
    if _raw_client is None:
        _raw_client = redis.Redis.from_url(REDIS_URL, decode_responses=False)
    return _raw_client


def _job_key(job_id: str) -> str:
    return f"ingest:job:{job_id}"


def _file_key(job_id: str) -> str:
    return f"ingest:job:{job_id}:file"


def set_file_bytes(job_id: str, data: bytes) -> None:
    get_redis_raw().set(_file_key(job_id), data, ex=JOB_TTL_SECONDS)


def get_file_bytes(job_id: str) -> bytes | None:
    return get_redis_raw().get(_file_key(job_id))


def delete_file_bytes(job_id: str) -> None:
    get_redis_raw().delete(_file_key(job_id))


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
