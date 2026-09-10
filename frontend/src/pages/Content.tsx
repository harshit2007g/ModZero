import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button, Card, ErrorNote, Loading, Pill, Row, timeAgo, truncateAddress } from "../components/ui";
import { getContent, imageFor } from "../lib/client";
import type { ContentRecord } from "../lib/api";
import { useSeo } from "../components/seo/Seo";
import Breadcrumbs from "../components/layout/Breadcrumbs";

export default function Content() {
  useSeo({
    title: "Provenance record",
    description: "The registered fingerprint, watermark and consensus timestamp for a work on ModZero.",
    noIndex: true,
  });

  const { id } = useParams<{ id: string }>();
  const [record, setRecord] = useState<ContentRecord | null>(null);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    if (id) getContent(id).then(setRecord).catch(setError);
  }, [id]);

  if (error) return <div className="mx-auto max-w-[860px] px-8 py-20"><ErrorNote error={error} /></div>;
  if (!record) return <div className="mx-auto max-w-[860px] px-8 py-20"><Loading label="Loading provenance" /></div>;

  return (
    <div className="mx-auto max-w-[860px] px-8 py-14">
      <Breadcrumbs
        items={[
          { name: "Feed", path: "/" },
          { name: "Provenance", path: undefined },
          { name: record.contentId.slice(0, 12) },
        ]}
      />
      <Card className="overflow-hidden">
        <img
          src={imageFor(record, record.contentId) ?? ""}
          alt={`Registered work ${record.contentId} by ${record.ensName ?? truncateAddress(record.creatorAddress)}`}
          className="w-full object-cover"
        />
      </Card>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-5">
        <div>
          <p className="text-[17px] text-muted">Registered {timeAgo(record.createdAt)} by</p>
          <p className="text-[26px] font-semibold tracking-tight text-navy">
            {record.ensName ?? truncateAddress(record.creatorAddress)}
          </p>
        </div>
        <Link to={`/license/${record.contentId}`}>
          <Button>Request a licence</Button>
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Pill tone={record.parentContentId ? "sky" : "brand"}>
          {record.parentContentId ? "Derivative" : "Original work"}
        </Pill>
        {record.licenseStatus === "LICENSED" && <Pill tone="mint">Licensed</Pill>}
        {record.claimStatus !== "NONE" && <Pill tone="flag">Claim: {record.claimStatus}</Pill>}
      </div>

      {record.parentContentId && (
        <p className="mt-6 text-[18px] text-slate">
          Derived from{" "}
          <Link to={`/content/${record.parentContentId}`} className="font-semibold text-brand hover:underline">
            the original work
          </Link>
          .
        </p>
      )}

      <details className="mt-10 rounded-2xl border border-line px-7 py-5">
        <summary className="cursor-pointer text-[17px] font-semibold text-slate">
          Technical record
        </summary>
        <dl className="mt-4">
          <Row label="Content ID" value={record.contentId} mono />
          <Row label="Creator address" value={record.creatorAddress} mono />
          <Row label="Fingerprint" value={record.fingerprint} mono />
          <Row label="Algorithm" value={record.fingerprintAlgorithm} />
          <Row label="Watermark" value={record.watermarkIdentifier} mono />
          <Row label="Commitment" value={record.commitment} mono />
          <Row label="Hedera sequence" value={record.hederaSequence ? `#${record.hederaSequence}` : "—"} mono />
          <Row label="Ethereum transaction" value={record.ethereumTxHash} mono />
        </dl>
      </details>
    </div>
  );
}
