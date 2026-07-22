import { NextRequest } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const res = await fetch(`${process.env.BACKEND_URL}/ingest/status/${jobId}`, {
    headers: { "X-App-Secret": process.env.APP_SHARED_SECRET ?? "" },
  });
  return new Response(res.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}
