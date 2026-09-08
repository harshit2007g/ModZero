import { useState } from "react";
import { useAccount } from "wagmi";
import { useNavigate } from "react-router-dom";
import { registerContent } from "../lib/api";

export default function Upload() {
  const { address, isConnected } = useAccount();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [ensName, setEnsName] = useState("");
  const [status, setStatus] = useState<"idle" | "processing" | "error">("idle");
  const [error, setError] = useState("");

  async function handlePublish() {
    if (!file || !address) return;
    setStatus("processing");
    setError("");
    try {
      const record = await registerContent(file, ensName, address);
      navigate(`/content/${record.contentId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Publish content</h1>
      <p className="mt-2 text-paper-dim">
        Your upload is fingerprinted, invisibly watermarked, and registered on Sepolia with a stake — this
        takes a few seconds since it's a real transaction, not a database write.
      </p>

      <div className="mt-10 space-y-6">
        {!isConnected && (
          <div className="rounded border hairline px-4 py-3 text-sm text-signal-amber">
            Connect your wallet first — it's recorded as the content's creator address.
          </div>
        )}

        <div>
          <label className="block text-sm text-paper-dim mb-2">ENS name</label>
          <input
            value={ensName}
            onChange={(e) => setEnsName(e.target.value)}
            placeholder="alice.eth"
            className="w-full rounded border hairline bg-transparent px-3 py-2 font-mono text-sm focus:outline-none focus:border-gold"
          />
        </div>

        <div>
          <label className="block text-sm text-paper-dim mb-2">Image</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full text-sm file:mr-4 file:rounded file:border-0 file:bg-ink-800 file:px-3 file:py-2 file:text-paper file:text-sm"
          />
        </div>

        {error && <p className="text-sm text-signal-red">{error}</p>}

        <button
          onClick={handlePublish}
          disabled={!file || !isConnected || status === "processing"}
          className="px-5 py-2.5 rounded bg-gold text-ink-950 font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gold-bright transition-colors"
        >
          {status === "processing" ? "Registering on-chain…" : "Publish"}
        </button>
      </div>
    </div>
  );
}