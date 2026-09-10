import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useIdentity } from "../components/layout/Shell";
import { Avatar, Button, Card, ErrorNote, Pill, inputClass, truncateAddress } from "../components/ui";
import { createClaim, createPost, getContent, imageFor, requestLicense, verifyContent } from "../lib/client";
import type { ContentRecord, VerifyResult } from "../lib/api";
import { useSeo } from "../components/seo/Seo";

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
  const { address, ensName, isConnected } = useIdentity();

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
    setScanning(true);
    try {
      const r = await verifyContent(next, address ?? ZERO);
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

  async function publish(withLicence: boolean) {
    if (!address || !text.trim()) return;
    setBusy(true);
    setError(null);
    try {
      if (withLicence && result?.probableRootContentId) {
        await requestLicense({
          contentId: result.probableRootContentId,
          requester: address,
          usage,
          intendsModification: true,
          intendsPoliticalUse: false,
        });
      }
      const post = await createPost(text.trim(), address, file ?? undefined);
      if (!withLicence && result?.probableRootContentId && post.contentId) {
        await createClaim({
          contentId: post.contentId,
          rootContentId: result.probableRootContentId,
          subject: address,
        }).catch(() => {});
      }
      navigate(`/post/${post.postId}`);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  const matched = Boolean(result && (result.fingerprintMatch || result.watermarkMatch));
  const canPost = isConnected && text.trim().length > 0 && !busy && !scanning;

  return (
    <div className="mx-auto max-w-[720px] px-8 py-20">
      <h1 className="text-[clamp(38px,5vw,58px)] font-bold leading-tight tracking-[-0.03em] text-navy">
        New post
      </h1>

      <Card className="mt-10 p-7">
        <div className="flex gap-5">
          <Avatar seed={ensName ?? address ?? "guest"} size={52} />
          <div className="flex-1">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="What are you posting?"
              rows={4}
              className={`${inputClass} resize-none`}
            />

            {preview && (
              <div className="relative mt-5 overflow-hidden rounded-2xl border border-line">
                <img src={preview} alt="Preview of the image you are about to publish" className="aspect-[16/10] w-full object-cover" />
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
                <Button className="ml-auto" onClick={() => publish(false)} disabled={!canPost}>
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
                Nothing in the registry matches. You&apos;ll be recorded as the original creator.
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
                  This belongs to {root ? truncateAddress(root.creatorAddress) : "another creator"}.
                </p>
              </div>

              <div className="grid gap-px bg-line sm:grid-cols-2">
                <figure className="bg-white p-5">
                  <figcaption className="mb-3 text-[17px] text-muted">Yours</figcaption>
                  {preview && <img src={preview} alt="The image you uploaded" className="aspect-video w-full rounded-xl object-cover" />}
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
                <p className="text-[18px] font-semibold text-navy">Choose a licence</p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {TERMS.map((t) => (
                    <button
                      key={t.key}
                      onClick={() => setUsage(t.key)}
                      className={`rounded-2xl border p-5 text-left transition-colors ${
                        usage === t.key ? "border-brand bg-brand-soft" : "border-line hover:border-muted"
                      }`}
                    >
                      <span className="block text-[19px] font-semibold text-navy">{t.label}</span>
                      <span className="mt-1 block text-[18px] text-slate">{t.price}</span>
                    </button>
                  ))}
                </div>

                <div className="mt-7 flex flex-wrap gap-4">
                  <Button onClick={() => publish(true)} disabled={!canPost}>
                    {busy ? "Settling…" : "Pay and post"}
                  </Button>
                  <Button variant="danger" onClick={() => publish(false)} disabled={!canPost}>
                    Post without paying
                  </Button>
                </div>
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
