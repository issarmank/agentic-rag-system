import ChatWindow from "@/components/ChatWindow";
import FileUpload from "@/components/FileUpload";

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto pt-8">
        <h1 className="text-2xl text-black font-bold text-center mb-6">Agentify</h1>
        <div className="border rounded-2xl shadow-sm overflow-hidden">
          <FileUpload />
          <ChatWindow />
        </div>
      </div>
    </main>
  );
}