import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useIdentity } from "../components/layout/Shell";
import { Avatar, Button, Card, ErrorNote, Loading, Pill, Row, timeAgo, truncateAddress } from "../components/ui";
import {
  challengesForPost,
  createChallenge,
  getContent,
  getPost,
  imageFor,
  resolveChallenge,
  voteOnChallenge,
} from "../lib/client";
import type { ChallengeRecord, ContentRecord, PostRecord } from "../lib/api";
import { useSeo } from "../components/seo/Seo";
import Breadcrumbs from "../components/layout/Breadcrumbs";

function Countdown({ deadline }: { deadline: number }) {
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));
  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(t);
  }, []);
  const left = deadline - now;
  if (left <= 0) return <span className="text-[17px] text-flag">Voting closed</span>;
  return (
    <span className="font-mono text-[17px] text-navy">
      {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")} left
    </span>
  );
}

export default function PostDetail() {
  useSeo({
    title: "Post",
    description: "A ModZero post, its provenance record and any open community challenges against it.",
    noIndex: true,
  });

  const { id } = useParams<{ id: string }>();
  const { isConnected } = useIdentity();

  const [post, setPost] = useState<PostRecord | null>(null);
  const [content, setContent] = useState<ContentRecord | null>(null);
  const [challenges, setChallenges] = useState<ChallengeRecord[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    getPost(id)
      .then(async (p) => {
        setPost(p);
        setChallenges(challengesForPost(p.postId));
        if (p.contentId) {
          try {
            setContent(await getContent(p.contentId));
          } catch {
            /* ignore */
          }
        }
      })
      .catch(setError);
  }, [id]);

  async function act(fn: () => Promise<ChallengeRecord>, replaceId?: string) {
    setBusy(true);
    try {
      const c = await fn();
      setChallenges((prev) =>
        replaceId
          ? prev.map((x) => (x.challengeId === replaceId ? c : x))
          : [...prev.filter((x) => x.challengeId !== c.challengeId), c],
      );
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  if (error) return <div className="mx-auto max-w-[760px] px-8 py-20"><ErrorNote error={error} /></div>;
  if (!post) return <div className="mx-auto max-w-[760px] px-8 py-20"><Loading label="Loading post" /></div>;

  const image = post.contentId ? imageFor(content, post.contentId) : null;

  return (
    <div className="mx-auto max-w-[760px] px-8 py-14">
      <Breadcrumbs
        items={[{ name: "Feed", path: "/" }, { name: truncateAddress(post.creatorAddress), path: `/u/${post.creatorAddress}` }, { name: "Post" }]}
      />
      <Card className="overflow-hidden">
        <div className="flex items-center gap-5 p-7">
          <Link to={`/u/${post.creatorAddress}`}>
            <Avatar seed={post.creatorAddress} size={58} />
          </Link>
          <div className="flex-1">
            <Link
              to={`/u/${post.creatorAddress}`}
              className="font-mono text-[19px] font-semibold text-navy hover:text-brand"
            >
              {truncateAddress(post.creatorAddress)}
            </Link>
            <p className="text-[17px] text-muted">{timeAgo(post.createdAt)}</p>
          </div>
          {typeof post.creatorReputation === "number" && post.creatorReputation !== 0 && (
            <Pill tone={post.creatorReputation > 0 ? "mint" : "flag"}>
              {post.creatorReputation > 0 ? "+" : ""}
              {post.creatorReputation} reputation
            </Pill>
          )}
        </div>

        <p className="px-7 pb-7 text-[22px] leading-[1.55] text-navy">{post.text}</p>
        {image && (
          <img
            src={image}
            alt={`Registered work attached to this post by ${truncateAddress(post.creatorAddress)}`}
            className="w-full object-cover"
          />
        )}

        {content && (
          <div className="flex flex-wrap items-center gap-4 px-7 py-6">
            <Pill tone={content.parentContentId ? "sky" : "brand"}>
              {content.parentContentId ? "Licensed derivative" : "Original work"}
            </Pill>
            <Link
              to={`/content/${content.contentId}`}
              className="text-[17px] font-semibold text-brand hover:underline"
            >
              See provenance
            </Link>
          </div>
        )}
      </Card>

      <section className="mt-12">
        <div className="mb-6 flex items-center justify-between gap-4">
          <h2 className="text-[28px] font-bold tracking-tight text-navy">Challenges</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => act(() => createChallenge(post.postId))}
            disabled={!isConnected || busy}
          >
            Challenge this
          </Button>
        </div>

        {challenges.length === 0 ? (
          <Card className="p-7">
            <p className="text-[18px] leading-relaxed text-slate">
              Nobody has challenged this post. Anyone can — it costs a stake, and voters decide the
              outcome, not a moderator.
            </p>
          </Card>
        ) : (
          <div className="space-y-5">
            {challenges.map((c) => {
              const total = c.votesGuilty + c.votesNotGuilty;
              const pct = total ? (c.votesGuilty / total) * 100 : 0;
              const open = c.state === "VOTING";
              return (
                <Card key={c.challengeId} className="p-7">
                  <div className="flex flex-wrap items-center gap-4">
                    <Pill tone={open ? "sun" : c.state === "RESOLVED_GUILTY" ? "flag" : "mint"}>
                      {open ? "Voting open" : c.state === "RESOLVED_GUILTY" ? "Upheld" : "Rejected"}
                    </Pill>
                    {open && <Countdown deadline={c.votingDeadline} />}
                  </div>

                  <div className="mt-6">
                    <div className="flex justify-between text-[17px] font-semibold">
                      <span className="text-flag">Guilty · {c.votesGuilty}</span>
                      <span className="text-mint">Not guilty · {c.votesNotGuilty}</span>
                    </div>
                    <div className="mt-3 h-3 overflow-hidden rounded-full bg-band">
                      <div className="h-full bg-flag transition-all duration-700" style={{ width: `${pct}%` }} />
                    </div>
                  </div>

                  {open && (
                    <div className="mt-6 flex flex-wrap gap-3">
                      <Button size="sm" variant="danger" onClick={() => act(() => voteOnChallenge(c.challengeId, true), c.challengeId)} disabled={busy}>
                        Guilty
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => act(() => voteOnChallenge(c.challengeId, false), c.challengeId)} disabled={busy}>
                        Not guilty
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => act(() => resolveChallenge(c.challengeId), c.challengeId)} disabled={busy}>
                        Resolve
                      </Button>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <details className="mt-12 rounded-2xl border border-line px-7 py-5">
        <summary className="cursor-pointer text-[17px] font-semibold text-slate">
          Technical record
        </summary>
        <dl className="mt-4">
          <Row label="Post ID" value={post.postId} mono />
          <Row label="Text hash" value={post.textHash} mono />
          <Row label="Ethereum transaction" value={post.ethereumTxHash} mono />
          {post.hederaSequence !== undefined && (
            <Row label="Hedera sequence" value={`#${post.hederaSequence}`} mono />
          )}
          {content && <Row label="Fingerprint" value={content.fingerprint} mono />}
          {content && <Row label="Watermark" value={content.watermarkIdentifier} mono />}
        </dl>
      </details>
    </div>
  );
}
