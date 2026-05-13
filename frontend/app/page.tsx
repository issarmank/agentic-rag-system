import ChatWindow from "@/components/ChatWindow";

export default function Home() {
  return (
    <main className="min-h-screen" style={{ background: 'linear-gradient(135deg, #0a1628 0%, #1a2942 100%)' }}>
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-sm bg-[#0a1628]/80 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4a90e2] to-[#6bb6ff] flex items-center justify-center">
              <span className="text-white font-bold text-lg">A</span>
            </div>
            <h1 className="text-xl font-semibold text-white tracking-tight">Agentify</h1>
          </div>
          {/* <div className="flex items-center gap-4">
            <button className="text-sm text-gray-300 hover:text-white transition-colors">
              About
            </button>
            <button className="text-sm text-gray-300 hover:text-white transition-colors">
              Docs
            </button>
          </div> */}
        </div>
      </header>

      {/* Main Content */}
      <div className="pt-20 px-6 max-w-5xl mx-auto">
        <ChatWindow />
      </div>
    </main>
  );
}