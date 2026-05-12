import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const res = await fetch(`${process.env.BACKEND_URL}/ingest`, {
    method: "POST",
    body: formData,   // forward the file directly
  });
  const data = await res.json();
  return NextResponse.json(data);
}