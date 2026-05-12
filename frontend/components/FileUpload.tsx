"use client";
import { useState } from "react";

export default function FileUpload() {
  const [status, setStatus] = useState("");
  const [uploading, setUploading] = useState(false);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setStatus("Uploading...");

    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/ingest", { method: "POST", body: form });
    const data = await res.json();

    setStatus(data.message || data.detail || "Done");
    setUploading(false);
  }

  return (
    <div className="flex items-center gap-3 p-4 border-b">
      <label className="cursor-pointer bg-white hover:bg-blue-200 rounded-lg px-4 py-2 text-sm text-black font-medium">
        {uploading ? "Uploading..." : "📎 Upload PDF"}
        <input type="file" accept=".pdf" className="hidden" onChange={handleUpload} />
      </label>
      {status && <span className="text-sm text-gray-500">{status}</span>}
    </div>
  );
}