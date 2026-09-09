import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAccount } from "wagmi";
import { motion } from "framer-motion";
import {
  getPost,
  getContent,
  mediaUrl,
  createChallenge,
  voteOnChallenge,
  resolveChallenge,
  type PostRecord,
  type ChallengeRecord,
  type ContentRecord,
} from "../lib/api";

function truncate(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export default function PostDetail() {
  const { id } = useParams<{ id: string }>();
  const { isConnected } = useAccount();
  const [post, setPost] = useState<PostRecord | null>(null);
  const [content, setContent] = useState<ContentRecord | null>(null);
  const [challenge, setChallenge] = useState<ChallengeRecord | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    getPost(id)
      .then((p) => {
        setPost(p);
        if (p.contentId) {
          getContent(p.contentId).then(setContent).catch(() => {});
        }
      })
      .catch((err) => setError(err.message));
  }, [id]);

  async function handleChallenge() {
    if (!id) return;
    setBusy(true);
    try {
      const c = await createChallenge(id);
      setChallenge(c);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to challenge");
    } finally {
      setBusy(false);
    }
  }

  async function handleVote(guilty: boolean) {
    if (!challenge) return;
    setBusy(true);
    try {
      const c = await voteOnChallenge(challenge.challengeId, guilty);
      setChallenge(c);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Vote failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleResolve() {
    if (!challenge) return;
    setBusy(true);
    try {
      const c = await resolveChallenge(challenge.challengeId);
      setChallenge(c);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Resolve failed — quorum may not be met yet");
    } finally {
      setBusy(false);
    }
  }

  if (error && !post) return <div className="mx-auto max-w-2xl px-6 py-16 text-signal-red">{error}</div>;
  if (!post) return <div className="mx-auto max-w-2xl px-6 py-16 text-paper-dim">Loading…</div>;

  const votingOpen = challenge && challenge.state === "VOTING";
  const votingClosed = challenge && Date.now() / 1000 > challenge.votingDeadline;

  return (
    <div className="mx-auto max-w-2xl px-6 py-16">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between text-xs text-paper-dim mb-3">
            <span className="font-mono">{truncate(post.creatorAddress)}</span>
            <span>{new Date(post.createdAt).toLocaleString()}</span>
          </div>
          <p className="text-lg text-paper leading-relaxed">{post.text}</p>

          {content && content.mediaUri && (
            <div className="mt-4 rounded-xl overflow-hidden border hairline">
              <img src={mediaUrl(content.mediaUri) ?? ""} alt="Attached content" className="w-full" />
            </div>
          )}

          {post.contentId && (
            <Link
              to={`/content/${post.contentId}`}
              className="mt-3 inline-block text-xs text-gold hover:text-gold-bright font-mono"
            >
              View provenance details →
            </Link>
          )}

          {post.ethereumTxHash && (
            
              <a href={`https://sepolia.etherscan.io/tx/${post.ethereumTxHash}`}
              target="_blank"
              rel="noreferrer"
              className="mt-3 block text-xs text-paper-dim hover:text-gold font-mono"
            >
              View post transaction on Sepolia Etherscan →
            </a>
          )}
        </div>

        {error && <p className="mt-4 text-sm text-signal-red">{error}</p>}

        {!challenge ? (
          <button
            onClick={handleChallenge}
            disabled={!isConnected || busy}
            className="mt-6 px-5 py-2.5 rounded-full border border-signal-red/40 text-signal-red text-sm hover:bg-signal-red/10 transition-colors disabled:opacity-40"
          >
            {busy ? "Submitting…" : "Challenge this post"}
          </button>
        ) : (
          <div className="mt-6 glass rounded-2xl p-6">
            <p
              className={`font-mono text-sm mb-4 ${
                challenge.state.includes("GUILTY")
                  ? "text-signal-red"
                  : challenge.state === "VOTING"
                  ? "text-signal-amber"
                  : "text-signal-green"
              }`}
            >
              {challenge.state}
            </p>
            <div className="flex gap-6 text-sm mb-4">
              <span>
                Guilty: <span className="font-mono">{challenge.votesGuilty}</span>
              </span>
              <span>
                Not guilty: <span className="font-mono">{challenge.votesNotGuilty}</span>
              </span>
            </div>

            {votingOpen && !votingClosed && (
              <div className="flex gap-3">
                <button
                  onClick={() => handleVote(true)}
                  disabled={!isConnected || busy}
                  className="px-4 py-2 rounded-full border border-signal-red/40 text-signal-red text-sm hover:bg-signal-red/10 disabled:opacity-40"
                >
                  Vote guilty
                </button>
                <button
                  onClick={() => handleVote(false)}
                  disabled={!isConnected || busy}
                  className="px-4 py-2 rounded-full border border-signal-green/40 text-signal-green text-sm hover:bg-signal-green/10 disabled:opacity-40"
                >
                  Vote not guilty
                </button>
              </div>
            )}

            {votingOpen && votingClosed && (
              <button
                onClick={handleResolve}
                disabled={busy}
                className="glow-btn px-5 py-2.5 rounded-full bg-gold text-ink-950 font-medium text-sm hover:bg-gold-bright transition-colors disabled:opacity-40"
              >
                {busy ? "Resolving…" : "Resolve challenge"}
              </button>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}