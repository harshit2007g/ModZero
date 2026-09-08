import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAccount } from "wagmi";

export default function Dashboard() {
  const { address, isConnected } = useAccount();
  const [lookupId, setLookupId] = useState("");
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>

      {isConnected ? (
        <p className="mt-2 text-paper-dim font-mono text-xs">{address}</p>
      ) : (
        <p className="mt-2 text-paper-dim">Connect your wallet to see your content.</p>
      )}

      <div className="mt-10 rounded border hairline border-dashed p-8 text-center text-paper-dim text-sm">
        A list of your registered content will appear here once the backend exposes a
        "content by creator" endpoint.
      </div>

      <div className="mt-10">
        <label className="block text-sm text-paper-dim mb-2">Look up content by ID</label>
        <div className="flex gap-3">
          <input
            value={lookupId}
            onChange={(e) => setLookupId(e.target.value)}
            placeholder="0x…"
            className="flex-1 rounded border hairline bg-transparent px-3 py-2 font-mono text-sm focus:outline-none focus:border-gold"
          />
          <button
            onClick={() => lookupId && navigate(`/content/${lookupId}`)}
            className="px-4 py-2 rounded border hairline hover:border-gold text-sm"
          >
            View
          </button>
        </div>
      </div>
    </div>
  );
}