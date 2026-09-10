import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useIdentity } from "../components/layout/Shell";
import { Avatar, Button, Card, ErrorNote, Pill, truncateAddress } from "../components/ui";
import { createClaim, getContent, imageFor, verifyContent } from "../lib/client";
import type { ContentRecord, VerifyResult } from "../lib/api";
import { useSeo } from "../components/seo/Seo";

const EXPO = [0.16, 1, 0.3, 1] as const;
const ZERO = "0x0000000000000000000000000000000000000000";

export default function Verify() {
  useSeo({
    title: "Check an image against the registry",
    description: "Match any picture against every work registered on ModZero. Nothing is published — the check is read-only.",
  });

  const navigate = useNavigate();
  const { address } = useIdentity();
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [root, setRoot] = useState<ContentRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function run(next: File | null) {
    if (!next) return;
    setFile(next);
    setResult(null);
    setRoot(null);
    setBusy(true);
    try {
      const r = await verifyContent(next, address ?? ZERO);
      setResult(r);
      if (r.probableRootContentId) {
        try {
          setRoot(await getContent(r.probableRootContentId));
        } catch {
          /* ignore */
        }
      }
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  async function openClaim() {
    if (!result?.probableRootContentId || !address) return;
    setBusy(true);
    try {
      const claim = await createClaim({
        contentId: result.probableRootContentId,
        rootContentId: result.probableRootContentId,
        subject: address,
      });
      navigate(`/claim/${claim.claimId}`);
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  const matched = Boolean(result && (result.fingerprintMatch || result.watermarkMatch));

  return (
    <div className="mx-auto max-w-[760px] px-8 py-20">
      <h1 className="text-[clamp(38px,5vw,58px)] font-bold leading-tight tracking-[-0.03em] text-navy">
        Does this belong to <span className="grad-text">someone</span>?
      </h1>
      <p className="mt-6 max-w-xl text-[20px] leading-relaxed text-slate">
        Drop any picture. Nothing is published — this only checks.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => run(e.target.files?.[0] ?? null)}
      />

      <Card className="mt-10 overflow-hidden">
        {!preview ? (
          <button
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              run(e.dataTransfer.files?.[0] ?? null);
            }}
            className="flex aspect-[16/8] w-full flex-col items-center justify-center gap-3 bg-band transition-colors hover:bg-band2"
          >
            <span className="text-[26px] font-semibold text-navy">Drop an image here</span>
            <span className="text-[18px] text-muted">or click to choose a file</span>
          </button>
        ) : (
          <div className="relative">
            <img src={preview} alt="The image you are checking against the registry" className="aspect-[16/8] w-full object-cover" />
            {busy && (
              <div className="absolute inset-0 grid place-items-center bg-white/80 backdrop-blur-sm">
                <p className="text-[19px] font-semibold text-navy">Matching…</p>
              </div>
            )}
            <button
              onClick={() => inputRef.current?.click()}
              className="absolute right-5 top-5 rounded-full bg-white/95 px-5 py-2.5 text-[16px] font-semibold text-navy shadow-sm"
            >
              Replace
            </button>
          </div>
        )}
      </Card>

      {error ? <div className="mt-6"><ErrorNote error={error} /></div> : null}

      {result && !busy && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EXPO }}
          className="mt-6"
        >
          <Card className={`overflow-hidden ${matched ? "border-[#f3c4c6]" : "border-[#c8ebdd]"}`}>
            <div className={`flex flex-wrap items-center gap-4 px-7 py-6 ${matched ? "bg-[#fdeced]" : "bg-[#f4fbf8]"}`}>
              <Pill tone={matched ? "flag" : "mint"}>{matched ? "Match found" : "No match"}</Pill>
              <p className="text-[19px] text-navy">
                {matched
                  ? `${(result.fingerprintSimilarity * 100).toFixed(0)}% match against a registered work.`
                  : "Nothing in the registry resembles this picture."}
              </p>
            </div>

            {matched && root && (
              <>
                <div className="flex items-center gap-5 p-7">
                  <img
                    src={imageFor(root, root.contentId) ?? ""}
                    alt="The registered work this image was matched against"
                    className="h-24 w-32 shrink-0 rounded-xl object-cover"
                  />
                  <Avatar seed={root.ensName ?? root.creatorAddress} size={48} />
                  <div className="min-w-0">
                    <p className="text-[17px] text-muted">Original creator</p>
                    <p className="text-[20px] font-semibold text-navy">
                      {root.ensName ?? truncateAddress(root.creatorAddress)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 border-t border-line p-7">
                  <Link to={`/license/${root.contentId}`}>
                    <Button>Request a licence</Button>
                  </Link>
                  <Button variant="danger" onClick={openClaim} disabled={busy || !address}>
                    Open a claim
                  </Button>
                  <Link to={`/content/${root.contentId}`}>
                    <Button variant="outline">See provenance</Button>
                  </Link>
                </div>
              </>
            )}
          </Card>
        </motion.div>
      )}
    </div>
  );
}
