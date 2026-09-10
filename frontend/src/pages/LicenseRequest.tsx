import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useIdentity } from "../components/layout/Shell";
import { Avatar, Button, Card, ErrorNote, Pill, Row, truncateAddress } from "../components/ui";
import { getContent, imageFor, requestLicense } from "../lib/client";
import type { ContentRecord, LicenseRecord } from "../lib/api";
import { useSeo } from "../components/seo/Seo";

const USAGE = [
  { key: "commercial" as const, label: "Commercial", price: "0.02 ETH", hint: "Resale, advertising, paid work" },
  { key: "nonCommercial" as const, label: "Non-commercial", price: "0.002 ETH", hint: "Personal or editorial" },
];

export default function LicenseRequest() {
  useSeo({
    title: "Request a licence",
    description: "Ask a creator’s agent for a licence. It answers automatically from a published policy and writes the licence on-chain.",
    noIndex: true,
  });

  const { contentId } = useParams<{ contentId: string }>();
  const { address, isConnected } = useIdentity();

  const [content, setContent] = useState<ContentRecord | null>(null);
  const [usage, setUsage] = useState<"commercial" | "nonCommercial">("commercial");
  const [modification, setModification] = useState(true);
  const [political, setPolitical] = useState(false);
  const [license, setLicense] = useState<LicenseRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    if (contentId) getContent(contentId).then(setContent).catch(() => {});
  }, [contentId]);

  async function submit() {
    if (!contentId || !address) return;
    setBusy(true);
    setError(null);
    try {
      setLicense(
        await requestLicense({
          contentId,
          requester: address,
          usage,
          intendsModification: modification,
          intendsPoliticalUse: political,
        }),
      );
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-[860px] px-8 py-16">
      <h1 className="text-[clamp(38px,5vw,58px)] font-bold leading-tight tracking-[-0.03em] text-navy">
        Request a licence
      </h1>
      <p className="mt-6 max-w-xl text-[20px] leading-relaxed text-slate">
        The creator&apos;s agent answers automatically — it quotes a price or refuses, in seconds.
      </p>

      <div className="mt-12 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-8">
          <p className="text-[19px] font-semibold text-navy">How will you use it?</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {USAGE.map((o) => (
              <button
                key={o.key}
                onClick={() => setUsage(o.key)}
                className={`rounded-2xl border p-6 text-left transition-colors ${
                  usage === o.key ? "border-brand bg-brand-soft" : "border-line hover:border-muted"
                }`}
              >
                <span className="block text-[20px] font-semibold text-navy">{o.label}</span>
                <span className="mt-1 block text-[17px] text-slate">{o.hint}</span>
                <span className="mt-3 block text-[20px] font-bold text-brand">{o.price}</span>
              </button>
            ))}
          </div>

          <div className="mt-8 space-y-4">
            <label className="flex items-center gap-4 text-[18px] text-navy">
              <input
                type="checkbox"
                checked={modification}
                onChange={(e) => setModification(e.target.checked)}
                className="h-5 w-5 accent-[#635bff]"
              />
              I intend to modify the work
            </label>
            <label className="flex items-center gap-4 text-[18px] text-navy">
              <input
                type="checkbox"
                checked={political}
                onChange={(e) => setPolitical(e.target.checked)}
                className="h-5 w-5 accent-[#635bff]"
              />
              I intend political use
            </label>
          </div>

          <div className="mt-9">
            {isConnected ? (
              <Button size="lg" onClick={submit} disabled={busy}>
                {busy ? "Asking the agent…" : "Request licence"}
              </Button>
            ) : (
              <p className="text-[18px] text-slate">Connect a wallet to continue.</p>
            )}
          </div>

          {error ? <div className="mt-6"><ErrorNote error={error} /></div> : null}

          {license && (
            <Card className="mt-8 border-[#c8ebdd] bg-[#f4fbf8] p-7">
              <div className="flex flex-wrap items-center gap-4">
                <Pill tone="mint">Licence issued</Pill>
                <span className="text-[22px] font-bold text-navy">{license.price}</span>
              </div>
              <p className="mt-4 text-[18px] text-slate">
                {license.terms.commercial ? "Commercial use" : "Non-commercial use"} ·{" "}
                {license.terms.modification ? "modification allowed" : "no modification"} ·{" "}
                {license.terms.attribution ? "attribution required" : "no attribution"}
              </p>
              <details className="mt-5">
                <summary className="cursor-pointer text-[16px] font-semibold text-muted">
                  Technical record
                </summary>
                <dl className="mt-3">
                  <Row label="Licence ID" value={license.licenseId} mono />
                  <Row label="Terms hash" value={license.termsHash} mono />
                  <Row label="Ethereum transaction" value={license.ethereumTxHash} mono />
                </dl>
              </details>
            </Card>
          )}
        </Card>

        {content && (
          <Card className="h-fit overflow-hidden">
            <img
              src={imageFor(content, content.contentId) ?? ""}
              alt={`The work you are requesting a licence for, by ${content.ensName ?? truncateAddress(content.creatorAddress)}`}
              className="aspect-[4/3] w-full object-cover"
            />
            <div className="flex items-center gap-4 p-6">
              <Avatar seed={content.ensName ?? content.creatorAddress} size={44} />
              <div className="min-w-0">
                <p className="text-[17px] text-muted">Creator</p>
                <Link
                  to={`/content/${content.contentId}`}
                  className="block truncate text-[19px] font-semibold text-navy hover:text-brand"
                >
                  {content.ensName ?? truncateAddress(content.creatorAddress)}
                </Link>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
