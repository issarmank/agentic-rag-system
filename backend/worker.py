import asyncio
import os

from arq.connections import RedisSettings
from dotenv import load_dotenv

from ingest import ingest_pdf
from jobs import REDIS_URL, set_status

load_dotenv()


async def run_ingest(ctx, tmp_path: str, job_id: str) -> int:
    try:
        return await asyncio.to_thread(ingest_pdf, tmp_path, job_id)
    except Exception as e:
        set_status(job_id, "error", message=str(e))
        raise
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


class WorkerSettings:
    functions = [run_ingest]
    redis_settings = RedisSettings.from_dsn(REDIS_URL)
    job_timeout = 600  # large/scanned PDFs can take a while to parse
