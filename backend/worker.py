import asyncio
import logging
import os

from arq.connections import RedisSettings
from dotenv import load_dotenv

from ingest import ingest_pdf
from jobs import REDIS_URL, set_status

load_dotenv()

logger = logging.getLogger(__name__)


async def run_ingest(ctx, tmp_path: str, job_id: str, owner: str, document_id: str) -> int:
    try:
        return await asyncio.to_thread(ingest_pdf, tmp_path, owner, job_id, document_id)
    except Exception as e:
        set_status(job_id, "error", message=str(e))
        logger.exception("Ingest job %s failed", job_id)
        # Don't re-raise: the user has already been told it failed via SSE, and
        # LlamaParse is billed per page — arq's default retry would silently
        # re-run and re-charge for a job we've already reported as errored.
        return 0
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


class WorkerSettings:
    functions = [run_ingest]
    redis_settings = RedisSettings.from_dsn(REDIS_URL)
    job_timeout = 600  # large/scanned PDFs can take a while to parse
    max_tries = 1  # never auto-retry a paid parse/embed job
    max_jobs = 4  # cap concurrent CPU-bound embedding jobs on this worker
