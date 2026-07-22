import { NextRequest } from "next/server";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const sessionId = req.headers.get("x-session-id");
  if (!sessionId) {
    return new Response("Missing session id", { status: 400 });
  }

  const { message, history } = await req.json();
  const res = await fetch(`${process.env.BACKEND_URL}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Session-Id": sessionId,
      "X-App-Secret": process.env.APP_SHARED_SECRET ?? "",
    },
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