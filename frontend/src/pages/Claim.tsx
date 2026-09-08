import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getClaim, type ClaimRecord } from "../lib/api";

const stateColor: Record<string, string> = {
  CREATED: "text-signal-amber",
  EVIDENCE_SUBMITTED: "text-signal-amber",
  RESOLVED_VALID: "text-signal-red",
  RESOLVED_INVALID: "text-signal-green",
};

export default function Claim() {
  const { id } = useParams<{ id: string }>();
  const [claim, setClaim] = useState<ClaimRecord | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    getClaim(id)
      .then(setClaim)
      .catch((err) => setError(err.message));
  }, [id]);

  if (error) return <div className="mx-auto max-w-2xl px-6 py-16 text-signal-red">{error}</div>;
  if (!claim) return <div className="mx-auto max-w-2xl px-6 py-16 text-paper-dim">Loading…</div>;

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Claim</h1>
      <p className={`mt-2 font-mono text-sm ${stateColor[claim.state] ?? "text-paper-dim"}`}>{claim.state}</p>

      <div className="mt-8">
        <div className="flex justify-between py-3 border-b hairline text-sm">
          <span className="text-paper-dim">Claim ID</span>
          <span className="font-mono text-xs break-all text-right">{claim.claimId}</span>
        </div>
        <div className="flex justify-between py-3 border-b hairline text-sm">
          <span className="text-paper-dim">Root content</span>
          <span className="font-mono text-xs break-all text-right">{claim.rootContentId}</span>
        </div>
        <div className="flex justify-between py-3 border-b hairline text-sm">
          <span className="text-paper-dim">Subject</span>
          <span className="font-mono text-xs break-all text-right">{claim.subject}</span>
        </div>
        <div className="flex justify-between py-3 border-b hairline text-sm">
          <span className="text-paper-dim">Claimant</span>
          <span className="font-mono text-xs break-all text-right">{claim.claimant}</span>
        </div>
        <div className="flex justify-between py-3 border-b hairline text-sm">
          <span className="text-paper-dim">Evidence hash</span>
          <span className="font-mono text-xs break-all text-right">{claim.evidenceHash}</span>
        </div>
      </div>

      {claim.ethereumTxHash && (
        
         <a href={`https://sepolia.etherscan.io/tx/${claim.ethereumTxHash}`}
          target="_blank"
          rel="noreferrer"
          className="mt-6 inline-block text-gold hover:text-gold-bright font-mono text-xs"
        >
          View on Sepolia Etherscan →
        </a>
      )}
    </div>
  );
}