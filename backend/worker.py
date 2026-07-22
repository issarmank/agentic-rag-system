import asyncio
import logging
import os
import tempfile

from arq.connections import RedisSettings
from dotenv import load_dotenv

from ingest import ingest_pdf
from jobs import REDIS_URL, delete_file_bytes, get_file_bytes, set_status

load_dotenv()

logger = logging.getLogger(__name__)


async def run_ingest(ctx, job_id: str, owner: str, document_id: str) -> int:
    # The web app staged the upload in Redis (it runs in a separate container
    # with its own filesystem) — pull the bytes down and write them to a
    # local temp file this process can actually parse.
    data = get_file_bytes(job_id)
    if data is None:
        set_status(job_id, "error", message="Uploaded file expired before processing")
        logger.error("Ingest job %s: no staged file bytes found", job_id)
        return 0

    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            tmp_path = tmp.name
            tmp.write(data)
        return await asyncio.to_thread(ingest_pdf, tmp_path, owner, job_id, document_id)
    except Exception as e:
        set_status(job_id, "error", message=str(e))
        logger.exception("Ingest job %s failed", job_id)
        # Don't re-raise: the user has already been told it failed via SSE, and
        # LlamaParse is billed per page — arq's default retry would silently
        # re-run and re-charge for a job we've already reported as errored.
        return 0
    finally:
        delete_file_bytes(job_id)
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)


class WorkerSettings:
    functions = [run_ingest]
    redis_settings = RedisSettings.from_dsn(REDIS_URL)
    job_timeout = 600  # large/scanned PDFs can take a while to parse
    max_tries = 1  # never auto-retry a paid parse/embed job
    max_jobs = 4  # cap concurrent CPU-bound embedding jobs on this worker
