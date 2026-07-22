import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const sessionId = req.headers.get("x-session-id");
  if (!sessionId) {
    return NextResponse.json({ detail: "Missing session id" }, { status: 400 });
  }

  const formData = await req.formData();
  const res = await fetch(`${process.env.BACKEND_URL}/ingest`, {
    method: "POST",
    headers: {
      "X-Session-Id": sessionId,
      "X-App-Secret": process.env.APP_SHARED_SECRET ?? "",
    },
    body: formData,   // forward the file directly
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}