import { NextRequest } from "next/server";

export const dynamic = 'force-dynamic';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const { message, history } = await req.json();
  const res = await fetch(`${process.env.BACKEND_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history: history ?? [] }),
  });
  return new Response(res.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}