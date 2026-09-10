import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Avatar, Card, ErrorNote, Loading, Pill, Row, timeAgo, truncateAddress } from "../components/ui";
import { getClaim } from "../lib/client";
import type { ClaimRecord } from "../lib/api";
import { useSeo } from "../components/seo/Seo";
import Breadcrumbs from "../components/layout/Breadcrumbs";

export default function Claim() {
  useSeo({
    title: "Claim",
    description: "An on-chain provenance claim between two ModZero works.",
    noIndex: true,
  });

  const { id } = useParams<{ id: string }>();
  const [claim, setClaim] = useState<ClaimRecord | null>(null);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    if (id) getClaim(id).then(setClaim).catch(setError);
  }, [id]);

  if (error) return <div className="mx-auto max-w-[760px] px-8 py-20"><ErrorNote error={error} /></div>;
  if (!claim) return <div className="mx-auto max-w-[760px] px-8 py-20"><Loading label="Loading claim" /></div>;

  return (
    <div className="mx-auto max-w-[760px] px-8 py-16">
      <Breadcrumbs items={[{ name: "Feed", path: "/" }, { name: "Claim" }]} />
      <div className="flex flex-wrap items-center gap-5">
        <h1 className="text-[clamp(36px,4.6vw,52px)] font-bold tracking-[-0.03em] text-navy">Claim</h1>
        <Pill tone={claim.state === "OPEN" ? "sun" : "neutral"}>{claim.state}</Pill>
      </div>
      <p className="mt-6 max-w-2xl text-[20px] leading-relaxed text-slate">
        A claim asserts who published first. It is not a ruling on copyright, and opening one
        settles nothing by itself.
      </p>

      <Card className="mt-10 p-8">
        <div className="flex flex-wrap items-center gap-8">
          <div className="flex items-center gap-4">
            <Avatar seed={claim.claimant} size={52} />
            <div>
              <p className="text-[17px] text-muted">Claimant</p>
              <p className="font-mono text-[18px] font-semibold text-navy">
                {truncateAddress(claim.claimant)}
              </p>
            </div>
          </div>
          <span className="text-[18px] text-muted">vs</span>
          <div className="flex items-center gap-4">
            <Avatar seed={claim.subject} size={52} />
            <div>
              <p className="text-[17px] text-muted">Subject</p>
              <p className="font-mono text-[18px] font-semibold text-navy">
                {truncateAddress(claim.subject)}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-6 border-t border-line pt-6 text-[18px]">
          <Link to={`/content/${claim.rootContentId}`} className="font-semibold text-brand hover:underline">
            Original work
          </Link>
          <Link to={`/content/${claim.contentId}`} className="font-semibold text-brand hover:underline">
            Disputed upload
          </Link>
          <span className="text-muted">Opened {timeAgo(claim.createdAt)}</span>
        </div>
      </Card>

      <details className="mt-10 rounded-2xl border border-line px-7 py-5">
        <summary className="cursor-pointer text-[17px] font-semibold text-slate">
          Technical record
        </summary>
        <dl className="mt-4">
          <Row label="Claim ID" value={claim.claimId} mono />
          <Row label="Evidence hash" value={claim.evidenceHash} mono />
          {claim.ethereumTxHash && <Row label="Ethereum transaction" value={claim.ethereumTxHash} mono />}
        </dl>
      </details>
    </div>
  );
}
