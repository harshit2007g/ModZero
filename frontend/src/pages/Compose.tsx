import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useConnect } from "wagmi";
import { useIdentity } from "../components/layout/Shell";
import { Avatar, Button, Card, ErrorNote, Pill, inputClass, truncateAddress } from "../components/ui";
import { createPost, getContent, getLicense, imageFor, verifyContent } from "../lib/client";
import type { ContentRecord, LicenseRecord, VerifyResult } from "../lib/api";
import { useSeo } from "../components/seo/Seo";
import { allCommunities, isValidSlug, withCommunity } from "../lib/communities";
import { useDisplayName } from "../lib/identity";
import { LICENSE_STATUS_COPY, PurchaseError, useLicensePurchase } from "../lib/useLicensePurchase";

const EXPO = [0.16, 1, 0.3, 1] as const;
const ZERO = "0x0000000000000000000000000000000000000000";

const TERMS = [
  { key: "commercial" as const, label: "Commercial", price: "0.02 ETH" },
  { key: "nonCommercial" as const, label: "Non-commercial", price: "0.002 ETH" },
];

export default function Compose() {
  useSeo({
    title: "Publish a work",
    description: "Register an image on ModZero. Attached media is fingerprinted and checked against the registry before it publishes.",
  });

  const navigate = useNavigate();
  const { address, displayName, isConnected } = useIdentity();
  const { connectors, isPending: connectPending, connectAsync } = useConnect();

  const [params] = useSearchParams();
  const [community, setCommunity] = useState(() => {
    const requested = (params.get("m") ?? "").toLowerCase();
    return isValidSlug(requested) ? requested : "showcase";
  });
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [root, setRoot] = useState<ContentRecord | null>(null);
  const [usage, setUsage] = useState<"commercial" | "nonCommercial">("commercial");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Creator of the ORIGINAL work this upload matches against — not the
  // connected wallet posting the derivative.
  const rootName =
    useDisplayName(root?.creatorAddress ?? "") ?? root?.ensName ?? truncateAddress(root?.creatorAddress ?? "");

  const [licenseId, setLicenseId] = useState("");
  const [verifiedLicense, setVerifiedLicense] = useState<LicenseRecord | null>(null);
  const [checkingLicense, setCheckingLicense] = useState(false);
  const [licenseError, setLicenseError] = useState("");

  // Wallet-native licence purchase for the matched work. Never asks for a
  // transaction hash — the wallet popup does the paying, we capture the hash.
  const purchase = useLicensePurchase({
    contentId: result?.probableRootContentId ?? "",
    usage,
    intendsModification: true,
    intendsPoliticalUse: false,
  });
  const activeLicense = verifiedLicense ?? (purchase.status === "issued" ? purchase.license : null);
  const selectedTerms = TERMS.find((t) => t.key === usage);
  const connectButton = () => {
    const connector = connectors[0];
    if (connector) connectAsync({ connector }).catch(() => {});
  };

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function onPick(next: File | null) {
    if (!next) return;
    setFile(next);
    setResult(null);
    setRoot(null);
    setVerifiedLicense(null);
    setLicenseId("");
    setLicenseError("");
    purchase.reset();
    setScanning(true);
    try {
      const r = await verifyContent(next, address ?? ZERO);
      console.log("verify result:", r);
      setResult(r);
      if (r.probableRootContentId && (r.fingerprintMatch || r.watermarkMatch)) {
        try {
          setRoot(await getContent(r.probableRootContentId));
        } catch {
          /* root not resolvable */
        }
      }
    } catch (e) {
      setError(e);
    } finally {
      setScanning(false);
    }
  }

  async function checkLicense() {
    if (!licenseId || !result?.probableRootContentId || !address) return;
    setCheckingLicense(true);
    setLicenseError("");
    try {
      const lic = await getLicense(licenseId);
      if (lic.contentId !== result.probableRootContentId) {
        setLicenseError("This license is for a different piece of content.");
        return;
      }
      if (lic.licensee.toLowerCase() !== address.toLowerCase()) {
        setLicenseError("This license was not issued to your connected wallet.");
        return;
      }
      setVerifiedLicense(lic);
    } catch {
      setLicenseError("License not found — check the ID and try again.");
    } finally {
      setCheckingLicense(false);
    }
  }

  async function publish() {
    if (!address || !text.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const post = await createPost(withCommunity(community, text), address, file ?? undefined);
      navigate(`/post/${post.postId}`);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  async function payAndPost() {
    if (!address || !text.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await purchase.start();
      await publish();
    } catch (e) {
      if (e instanceof PurchaseError) {
        if (e.status === "failed" || e.status === "verification-failed") {
          setError(new Error(LICENSE_STATUS_COPY[e.status]));
        }
      } else {
        setError(e);
      }
    } finally {
      setBusy(false);
    }
  }

  const matched = Boolean(
    result && (result.fingerprintMatch || result.watermarkMatch) && !result.hasValidLicense && !activeLicense
  );
  const canPost = isConnected && text.trim().length > 0 && !busy && !scanning;

  return (
    <div className="mx-auto max-w-[720px] px-8 py-20">
      <h1 className="text-[clamp(38px,5vw,58px)] font-bold leading-tight tracking-[-0.03em] text-navy">
        New post
      </h1>

      <Card className="mt-10 p-7">
        <div className="flex gap-5">
          <Avatar seed={displayName ?? address ?? "guest"} size={52} />
          <div className="flex-1">
            <div className="mb-5">
              <label htmlFor="community" className="mb-2 block text-[17px] font-semibold text-navy">
                Community
              </label>
              <div className="flex flex-wrap gap-2">
                {allCommunities().map((c) => (
                  <button
                    key={c.slug}
                    type="button"
                    onClick={() => setCommunity(c.slug)}
                    className={`rounded-full px-4 py-2 text-[16px] font-semibold transition-all ${community === c.slug
                        ? `${c.tone} ring-2 ring-brand ring-offset-2`
                        : "bg-band text-slate hover:text-navy"
                      }`}
                  >
                    m/{c.slug}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-[17px] font-semibold text-muted">m/</span>
                <input
                  id="community"
                  value={community}
                  onChange={(e) => setCommunity(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  placeholder="or type a new one"
                  className="w-56 rounded-xl border-2 border-line bg-card px-4 py-2 text-[17px] text-navy outline-none transition-colors focus:border-brand"
                />
                {community && !isValidSlug(community) && (
                  <span className="text-[16px] text-flag">2–24 letters, numbers or dashes</span>
                )}
              </div>
            </div>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="What are you posting?"
              rows={4}
              className={`${inputClass} resize-none`}
            />

            {preview && (
              <div className="relative mt-5 overflow-hidden rounded-2xl border border-line">
                <img
                  src={preview}
                  alt="Preview of the image you are about to publish"
                  className="aspect-[16/10] w-full object-cover"
                />
                {scanning && (
                  <div className="absolute inset-0 grid place-items-center bg-white/80 backdrop-blur-sm">
                    <p className="text-[18px] font-semibold text-navy">Checking the registry…</p>
                  </div>
                )}
                <button
                  onClick={() => {
                    setFile(null);
                    setPreview(null);
                    setResult(null);
                    setRoot(null);
                    setVerifiedLicense(null);
                    setLicenseId("");
                    purchase.reset();
                  }}
                  className="absolute right-4 top-4 rounded-full bg-white/95 px-4 py-2 text-[16px] font-semibold text-navy shadow-sm"
                >
                  Remove
                </button>
              </div>
            )}

            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onPick(e.target.files?.[0] ?? null)}
            />

            <div className="mt-5 flex flex-wrap items-center gap-4">
              <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
                {file ? "Change image" : "Add image"}
              </Button>
              {!isConnected && <span className="text-[17px] text-muted">Connect a wallet to post.</span>}
              {isConnected && !matched && (
                <Button className="ml-auto" onClick={() => publish()} disabled={!canPost}>
                  {busy ? "Posting…" : "Post"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>

      <AnimatePresence>
        {result && !scanning && !matched && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: EXPO }}
            className="mt-6"
          >
            <Card className="flex items-center gap-4 border-[#c8ebdd] bg-[#f4fbf8] p-6">
              <Pill tone="mint">Clear</Pill>
              <p className="text-[18px] text-navy">
                {activeLicense
                  ? "Verified — you hold a valid licence for this work."
                  : "Nothing in the registry matches. You'll be recorded as the original creator."}
              </p>
            </Card>
          </motion.div>
        )}

        {matched && result && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: EXPO }}
            className="mt-6"
          >
            <Card className="overflow-hidden border-[#f3c4c6]">
              <div className="flex flex-wrap items-center gap-4 bg-[#fdeced] px-7 py-6">
                <Pill tone="flag">Already registered</Pill>
                <p className="text-[19px] font-semibold text-[#a12126]">
                  This belongs to {root ? rootName : "another creator"}.
                </p>
              </div>

              <div className="grid gap-px bg-line sm:grid-cols-2">
                <figure className="bg-white p-5">
                  <figcaption className="mb-3 text-[17px] text-muted">Yours</figcaption>
                  {preview && (
                    <img src={preview} alt="The image you uploaded" className="aspect-video w-full rounded-xl object-cover" />
                  )}
                </figure>
                <figure className="bg-white p-5">
                  <figcaption className="mb-3 text-[17px] text-muted">
                    Registered {(result.fingerprintSimilarity * 100).toFixed(0)}% match
                  </figcaption>
                  <img
                    src={imageFor(root, result.probableRootContentId ?? "root") ?? ""}
                    alt="The matching work already registered by another creator"
                    className="aspect-video w-full rounded-xl object-cover"
                  />
                </figure>
              </div>

              <div className="p-7">
                <div className="mb-6 border-b border-line pb-6">
                  <p className="text-[18px] font-semibold text-navy">Already have a license?</p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <input
                      value={licenseId}
                      onChange={(e) => setLicenseId(e.target.value)}
                      placeholder="0x… license ID"
                      className="flex-1 min-w-[240px] rounded-xl border border-line px-4 py-2.5 font-mono text-sm focus:outline-none focus:border-brand"
                    />
                    <Button variant="outline" onClick={checkLicense} disabled={!licenseId || checkingLicense}>
                      {checkingLicense ? "Checking…" : "Verify license"}
                    </Button>
                  </div>
                  {licenseError && <p className="mt-2 text-[15px] text-[#a12126]">{licenseError}</p>}
                </div>

                <p className="text-[18px] font-semibold text-navy">Or buy a new licence</p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {TERMS.map((t) => (
                    <button
                      key={t.key}
                      onClick={() => setUsage(t.key)}
                      className={`rounded-2xl border p-5 text-left transition-colors ${usage === t.key ? "border-brand bg-brand-soft" : "border-line hover:border-muted"
                        }`}
                    >
                      <span className="block text-[19px] font-semibold text-navy">{t.label}</span>
                      <span className="mt-1 block text-[18px] text-slate">{t.price}</span>
                    </button>
                  ))}
                </div>

                {!isConnected ? (
                  <div className="mt-7">
                    <Button onClick={connectButton} disabled={connectPending || !connectors.length}>
                      {connectPending ? "Connecting…" : "Connect wallet"}
                    </Button>
                    <p className="mt-3 text-[16px] text-slate">Connect a wallet to pay for the licence.</p>
                  </div>
                ) : (
                  <>
                    <div className="mt-7 flex flex-wrap gap-4">
                      <Button onClick={payAndPost} disabled={!canPost || purchase.busy}>
                        {purchase.busy ? "Paying…" : `Pay ${selectedTerms?.price ?? ""} and post`}
                      </Button>
                      <Button variant="danger" onClick={() => publish()} disabled={!canPost || purchase.busy}>
                        Post without paying
                      </Button>
                    </div>
                    {purchase.status !== "idle" && (
                      <p className="mt-3 text-[16px] leading-relaxed text-slate">
                        {LICENSE_STATUS_COPY[purchase.status]}
                      </p>
                    )}
                    {purchase.status === "awaiting-approval" && purchase.payment && (
                      <p className="mt-2 text-[15px] text-muted">
                        {purchase.payment.amount} {purchase.payment.currency} — payable to{" "}
                        {truncateAddress(purchase.payment.payTo)}
                      </p>
                    )}
                  </>
                )}
                <p className="mt-4 text-[17px] leading-relaxed text-slate">
                  Posting without a licence is allowed. It opens a claim against you, and your stake
                  answers for it.
                </p>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {error ? (
        <div className="mt-6">
          <ErrorNote error={error} />
        </div>
      ) : null}
    </div>
  );
}