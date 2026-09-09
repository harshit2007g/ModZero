import { useState } from "react";
import { useAccount } from "wagmi";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { createPost } from "../lib/api";

export default function NewPost() {
  const { address, isConnected } = useAccount();
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "processing" | "error">("idle");
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!text || !address) return;
    setStatus("processing");
    setError("");
    try {
      const post = await createPost(text, address, image ?? undefined);
      navigate(`/post/${post.postId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h1 className="text-3xl font-semibold tracking-tight">New post</h1>
        <p className="mt-2 text-paper-dim">
          Staking ETH publishes your post permanently — anyone can challenge it, and the community, not a
          moderator, decides what happens next.
        </p>

        <div className="mt-10 glass rounded-2xl p-8 space-y-6">
          {!isConnected && (
            <div className="rounded-xl border border-signal-amber/30 bg-signal-amber/10 px-4 py-3 text-sm text-signal-amber">
              Connect your wallet to post.
            </div>
          )}

          <div>
            <label className="block text-sm text-paper-dim mb-2">Text</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              placeholder="What's on your mind?"
              className="w-full rounded-xl border hairline bg-ink-900/50 px-4 py-3 text-sm focus:outline-none focus:border-gold transition-colors resize-none"
            />
          </div>

          <div>
            <label className="block text-sm text-paper-dim mb-2">Image (optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImage(e.target.files?.[0] ?? null)}
              className="w-full text-sm file:mr-4 file:rounded-full file:border-0 file:bg-gold file:text-ink-950 file:px-4 file:py-2 file:text-sm file:font-medium file:cursor-pointer"
            />
            {image && (
              <p className="mt-2 text-xs text-paper-dim">
                This image will be fingerprinted, watermarked, and registered like any other content.
              </p>
            )}
          </div>

          {error && <p className="text-sm text-signal-red">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={!text || !isConnected || status === "processing"}
            className="glow-btn w-full px-5 py-3 rounded-full bg-gold text-ink-950 font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gold-bright transition-colors"
          >
            {status === "processing" ? "Publishing on-chain…" : "Post"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}