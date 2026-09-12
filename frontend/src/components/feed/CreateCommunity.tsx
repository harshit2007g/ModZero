import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button, Card } from "../ui";
import { isValidSlug, saveCommunity, slugTaken } from "../../lib/communities";

const EXPO = [0.16, 1, 0.3, 1] as const;

/**
 * Create a community.
 *
 * A community becomes real when a post carries its slug, so this saves the
 * name and description, then hands you straight to the composer with the
 * community pre-selected — an empty community would be a dead link otherwise.
 */
export function CreateCommunityDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [blurb, setBlurb] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const t = window.setTimeout(() => inputRef.current?.focus(), 60);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
    };
  }, [open, onClose]);

  const clean = slug.trim().toLowerCase();
  const taken = clean.length > 0 && slugTaken(clean);
  const malformed = clean.length > 0 && !isValidSlug(clean);
  const canCreate = clean.length > 0 && !taken && !malformed;

  function create() {
    if (!canCreate) return;
    const community = saveCommunity({ slug: clean, title, blurb });
    if (!community) return;
    onClose();
    navigate(`/compose?m=${community.slug}`);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[60] grid place-items-center bg-navy/25 px-6 backdrop-blur-sm"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="Create a community"
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.5, ease: EXPO }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[560px]"
          >
            <Card className="p-8">
              <h2 className="text-[28px] font-bold tracking-tight text-navy">Create a community</h2>
              <p className="mt-3 text-[17px] leading-relaxed text-slate">
                Pick a name. You&apos;ll write the first post next — that is what brings it to life.
              </p>

              <div className="mt-7 space-y-6">
                <div>
                  <label htmlFor="new-slug" className="mb-2 block text-[17px] font-semibold text-navy">
                    Name
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-[20px] font-semibold text-muted">m/</span>
                    <input
                      id="new-slug"
                      ref={inputRef}
                      value={slug}
                      onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                      onKeyDown={(e) => e.key === "Enter" && create()}
                      placeholder="landscapes"
                      className="flex-1 rounded-xl border-2 border-line bg-card px-4 py-3 text-[18px] text-navy outline-none transition-colors focus:border-brand"
                    />
                  </div>
                  {malformed && (
                    <p className="mt-2 text-[16px] text-flag">
                      2–24 characters: letters, numbers or dashes, starting with a letter or number.
                    </p>
                  )}
                  {taken && (
                    <p className="mt-2 text-[16px] text-flag">m/{clean} already exists.</p>
                  )}
                </div>

                <div>
                  <label htmlFor="new-title" className="mb-2 block text-[17px] font-semibold text-navy">
                    Display name <span className="font-normal text-muted">(optional)</span>
                  </label>
                  <input
                    id="new-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Landscapes"
                    className="w-full rounded-xl border-2 border-line bg-card px-4 py-3 text-[18px] text-navy outline-none transition-colors focus:border-brand"
                  />
                </div>

                <div>
                  <label htmlFor="new-blurb" className="mb-2 block text-[17px] font-semibold text-navy">
                    Description <span className="font-normal text-muted">(optional)</span>
                  </label>
                  <textarea
                    id="new-blurb"
                    value={blurb}
                    onChange={(e) => setBlurb(e.target.value)}
                    rows={2}
                    placeholder="What belongs here?"
                    className="w-full resize-none rounded-xl border-2 border-line bg-card px-4 py-3 text-[18px] leading-relaxed text-navy outline-none transition-colors focus:border-brand"
                  />
                </div>
              </div>

              <p className="mt-6 text-[16px] leading-relaxed text-muted">
                The name travels with every post, so anyone can see it. The description is stored in
                this browser until the backend has somewhere to keep it.
              </p>

              <div className="mt-8 flex flex-wrap justify-end gap-3">
                <Button variant="ghost" onClick={onClose}>
                  Cancel
                </Button>
                <Button onClick={create} disabled={!canCreate}>
                  Create and write the first post
                </Button>
              </div>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** The button plus its dialog, ready to drop anywhere. */
export function CreateCommunityButton({
  variant = "primary",
  size = "md",
  label = "Create a community",
  className = "",
}: {
  variant?: "primary" | "outline";
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={variant} size={size} className={className} onClick={() => setOpen(true)}>
        {label}
      </Button>
      <CreateCommunityDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
