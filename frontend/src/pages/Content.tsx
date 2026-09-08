import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getContent, type ContentRecord } from "../lib/api";

function Row({ label, value, mono = false }: { label: string; value: string | number | null; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-6 py-3 border-b hairline text-sm">
      <span className="text-paper-dim">{label}</span>
      <span className={`text-right break-all ${mono ? "font-mono text-xs" : ""}`}>{value ?? "—"}</span>
    </div>
  );
}

export default function Content() {
  const { id } = useParams<{ id: string }>();
  const [record, setRecord] = useState<ContentRecord | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    getContent(id)
      .then(setRecord)
      .catch((err) => setError(err.message));
  }, [id]);

  if (error) {
    return <div className="mx-auto max-w-2xl px-6 py-16 text-signal-red">{error}</div>;
  }
  if (!record) {
    return <div className="mx-auto max-w-2xl px-6 py-16 text-paper-dim">Loading…</div>;
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Content record</h1>
      <p className="mt-2 text-paper-dim">{record.ensName ?? "Unknown creator"}</p>

      <div className="mt-8">
        <Row label="Content ID" value={record.contentId} mono />
        <Row label="Creator" value={record.creatorAddress} mono />
        <Row label="Parent" value={record.parentContentId} mono />
        <Row label="Fingerprint" value={record.fingerprint} mono />
        <Row label="Commitment" value={record.commitment} mono />
        <Row label="Registered" value={new Date(record.createdAt).toLocaleString()} />
        <Row label="License status" value={record.licenseStatus} />
        <Row label="Claim status" value={record.claimStatus} />
        {record.ethereumTxHash && (
          <div className="py-3 text-sm">
            
              <a href={`https://sepolia.etherscan.io/tx/${record.ethereumTxHash}`}
              target="_blank"
              rel="noreferrer"
              className="text-gold hover:text-gold-bright font-mono text-xs"
            >
              View registration on Sepolia Etherscan →
            </a>
          </div>
        )}
      </div>

      <div className="mt-10 rounded border hairline border-dashed p-8 text-center text-paper-dim text-sm">
        Propagation graph goes here
      </div>

      <div className="mt-8 flex gap-4">
        <Link to={`/license/${record.contentId}`} className="text-gold hover:text-gold-bright text-sm">
          Request a license →
        </Link>
      </div>
    </div>
  );
}[]