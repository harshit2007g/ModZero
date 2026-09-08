import { useState } from "react";
import { useParams } from "react-router-dom";
import { useAccount } from "wagmi";
import { requestLicense, type LicenseRecord } from "../lib/api";

export default function LicenseRequest() {
  const { contentId } = useParams<{ contentId: string }>();
  const { address, isConnected } = useAccount();
  const [usage, setUsage] = useState<"commercial" | "nonCommercial">("nonCommercial");
  const [modification, setModification] = useState(false);
  const [status, setStatus] = useState<"idle" | "processing" | "error">("idle");
  const [result, setResult] = useState<LicenseRecord | null>(null);
  const [error, setError] = useState("");

  async function handleRequest() {
    if (!contentId || !address) return;
    setStatus("processing");
    setError("");
    try {
      const license = await requestLicense({
        contentId,
        requester: address,
        usage,
        intendsModification: modification,
      });
      setResult(license);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request was rejected");
      setStatus("error");
    }
  }

  if (result) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16">
        <h1 className="text-3xl font-semibold tracking-tight text-signal-green">License issued</h1>
        <p className="mt-2 text-paper-dim">
          {result.price} {result.currency} · {result.terms.commercial ? "commercial" : "non-commercial"} use
        </p>
        
         <a href={`https://sepolia.etherscan.io/tx/${result.ethereumTxHash}`}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-block text-gold hover:text-gold-bright font-mono text-xs"
        >
          View on Sepolia Etherscan →
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Request a license</h1>
      <p className="mt-2 text-paper-dim font-mono text-xs break-all">{contentId}</p>

      <div className="mt-10 space-y-6">
        {!isConnected && (
          <div className="rounded border hairline px-4 py-3 text-sm text-signal-amber">
            Connect your wallet — the license is issued to your address.
          </div>
        )}

        <div>
          <label className="block text-sm text-paper-dim mb-2">Intended use</label>
          <div className="flex gap-3">
            <button
              onClick={() => setUsage("nonCommercial")}
              className={`px-4 py-2 rounded border text-sm ${
                usage === "nonCommercial" ? "border-gold text-gold" : "hairline text-paper-dim"
              }`}
            >
              Non-commercial
            </button>
            <button
              onClick={() => setUsage("commercial")}
              className={`px-4 py-2 rounded border text-sm ${
                usage === "commercial" ? "border-gold text-gold" : "hairline text-paper-dim"
              }`}
            >
              Commercial
            </button>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-paper-dim">
          <input type="checkbox" checked={modification} onChange={(e) => setModification(e.target.checked)} />
          I intend to modify this content
        </label>

        {error && <p className="text-sm text-signal-red">{error}</p>}

        <button
          onClick={handleRequest}
          disabled={!isConnected || status === "processing"}
          className="px-5 py-2.5 rounded bg-gold text-ink-950 font-medium disabled:opacity-40 hover:bg-gold-bright transition-colors"
        >
          {status === "processing" ? "Evaluating…" : "Request license"}
        </button>
      </div>
    </div>
  );
}