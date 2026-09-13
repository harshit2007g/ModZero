import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useConnect } from "wagmi";
import { useIdentity } from "../components/layout/Shell";
import { Avatar, Button, Card, ErrorNote, Pill, Row, truncateAddress } from "../components/ui";
import { getContent, imageFor } from "../lib/client";
import type { ContentRecord } from "../lib/api";
import { useSeo } from "../components/seo/Seo";
import { useDisplayName } from "../lib/identity";
import { LICENSE_STATUS_COPY, PurchaseError, useLicensePurchase } from "../lib/useLicensePurchase";

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
  const { connectors, isPending: connectPending, connectAsync } = useConnect();

  const [content, setContent] = useState<ContentRecord | null>(null);
  const [usage, setUsage] = useState<"commercial" | "nonCommercial">("commercial");
  const [modification, setModification] = useState(true);
  const [political, setPolitical] = useState(false);
  const [error, setError] = useState<unknown>(null);

  // Wallet-native purchase: no transaction hash is ever typed or pasted.
  const purchase = useLicensePurchase({
    contentId: contentId ?? "",
    usage,
    intendsModification: modification,
    intendsPoliticalUse: political,
  });

  // Resolve the creator of the CONTENT being licensed — never the requester.
  const creatorName =
    useDisplayName(content?.creatorAddress ?? "") ?? content?.ensName ?? truncateAddress(content?.creatorAddress ?? "");

  useEffect(() => {
    if (contentId) getContent(contentId).then(setContent).catch(() => {});
  }, [contentId]);

  async function handleRequest() {
    if (!contentId || !address) return;
    setError(null);
    try {
      await purchase.start();
    } catch (e) {
      if (e instanceof PurchaseError && e.status !== "cancelled") {
        setError(new Error(LICENSE_STATUS_COPY[e.status]));
      }
    }
  }

  const showForm = !purchase.busy && !purchase.license;
  const finished = ["cancelled", "failed", "verification-failed"].includes(purchase.status);
  const connectButton = () => {
    const connector = connectors[0];
    if (connector) connectAsync({ connector }).catch(() => {});
  };

  return (
    <div className="mx-auto max-w-[860px] px-8 py-16">
      <h1 className="text-[clamp(38px,5vw,58px)] font-bold leading-tight tracking-[-0.03em] text-navy">
        Request a licence
      </h1>
      <p className="mt-6 max-w-xl text-[20px] leading-relaxed text-slate">
        The creator&apos;s agent answers automatically — it quotes a price or refuses, in seconds. Your wallet pays
        directly, and the payment is verified on-chain before the licence is issued.
      </p>

      <div className="mt-12 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <Card className="p-8">
          {showForm && (
            <>
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
                  <Button size="lg" onClick={handleRequest} disabled={purchase.busy}>
                    {purchase.busy ? LICENSE_STATUS_COPY[purchase.status] : "Pay and get licence"}
                  </Button>
                ) : (
                  <>
                    <Button size="lg" onClick={connectButton} disabled={connectPending || !connectors.length}>
                      {connectPending ? "Connecting…" : "Connect wallet"}
                    </Button>
                    <p className="mt-3 text-[17px] text-slate">Connect a wallet to pay for the licence.</p>
                  </>
                )}
              </div>

              {purchase.status !== "idle" && (
                <p className="mt-5 text-[16px] leading-relaxed text-slate">{LICENSE_STATUS_COPY[purchase.status]}</p>
              )}

              {error ? <div className="mt-6"><ErrorNote error={error} /></div> : null}
            </>
          )}

          {!showForm && !purchase.license && (
            <div className="mt-2">
              <p className="text-[19px] font-semibold text-navy">Paying for your licence…</p>
              <p className="mt-3 text-[17px] leading-relaxed text-slate">
                {LICENSE_STATUS_COPY[purchase.status]}
              </p>
              {purchase.payment && purchase.status === "awaiting-approval" && (
                <dl className="mt-5">
                  <Row label="Pay to" value={purchase.payment.payTo} mono />
                  <Row label={`Amount (${purchase.payment.currency})`} value={purchase.payment.amountWei} mono />
                </dl>
              )}
              {finished && (
                <div className="mt-6 flex flex-wrap gap-4">
                  <Button size="lg" onClick={handleRequest} disabled={purchase.busy}>
                    Try again
                  </Button>
                </div>
              )}
              {error ? <div className="mt-6"><ErrorNote error={error} /></div> : null}
            </div>
          )}

          {purchase.license && (
            <Card className="border-[#c8ebdd] bg-[#f4fbf8] p-7">
              <div className="flex flex-wrap items-center gap-4">
                <Pill tone="mint">Licence issued</Pill>
                <span className="text-[22px] font-bold text-navy">{purchase.license.price}</span>
              </div>
              <p className="mt-4 text-[18px] text-slate">
                {purchase.license.terms.commercial ? "Commercial use" : "Non-commercial use"} ·{" "}
                {purchase.license.terms.modification ? "modification allowed" : "no modification"} ·{" "}
                {purchase.license.terms.attribution ? "attribution required" : "no attribution"}
              </p>
              {purchase.license.alreadyIssued && (
                <p className="mt-3 text-[16px] text-slate">
                  This licence was issued from a payment we already verified — nothing extra was charged.
                </p>
              )}
              {purchase.license.alreadyLicensed && (
                <p className="mt-3 text-[16px] text-slate">You already hold a licence for this work.</p>
              )}
              <details className="mt-5">
                <summary className="cursor-pointer text-[16px] font-semibold text-muted">Technical record</summary>
                <dl className="mt-3">
                  <Row label="Licence ID" value={purchase.license.licenseId} mono />
                  <Row label="Terms hash" value={purchase.license.termsHash} mono />
                  <Row label="Ethereum transaction" value={purchase.license.ethereumTxHash} mono />
                </dl>
              </details>
            </Card>
          )}
        </Card>

        {content && (
          <Card className="h-fit overflow-hidden">
            <img
              src={imageFor(content, content.contentId) ?? ""}
              alt={`The work you are requesting a licence for, by ${creatorName}`}
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
                  {creatorName}
                </Link>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}