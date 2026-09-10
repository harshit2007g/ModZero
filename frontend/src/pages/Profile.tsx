import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PostCard from "../components/feed/PostCard";
import { useIdentity } from "../components/layout/Shell";
import { Avatar, Button, Card, Loading, truncateAddress } from "../components/ui";
import { listPosts } from "../lib/client";
import type { PostRecord } from "../lib/api";
import { useSeo } from "../components/seo/Seo";

export default function Profile() {
  useSeo({
    title: "Creator profile",
    description: "Posts, registered works and on-chain reputation for a ModZero creator.",
  });

  const { address: routeAddress } = useParams<{ address: string }>();
  const { address: mine, ensName } = useIdentity();
  const who = routeAddress ?? mine ?? "";
  const isMe = !!mine && who.toLowerCase() === mine.toLowerCase();

  const [posts, setPosts] = useState<PostRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listPosts()
      .then(setPosts)
      .finally(() => setLoading(false));
  }, []);

  const owned = posts.filter((p) => p.creatorAddress.toLowerCase() === who.toLowerCase());
  const works = owned.filter((p) => p.contentId).length;
  const reputation = owned[0]?.creatorReputation ?? 0;

  if (!who) {
    return (
      <div className="mx-auto max-w-[760px] px-8 py-28 text-center">
        <h1 className="text-[38px] font-bold tracking-tight text-navy">Connect a wallet</h1>
        <p className="mt-4 text-[20px] text-slate">Your studio shows everything you&apos;ve posted.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[900px] px-8 py-14">
      <header className="flex flex-wrap items-center gap-7 border-b border-line pb-10">
        <Avatar seed={who} size={92} />
        <div className="flex-1">
          <h1 className="font-mono text-[clamp(24px,3.4vw,36px)] font-bold tracking-tight text-navy">
            {isMe && ensName ? ensName : truncateAddress(who, 8)}
          </h1>
          <p className="mt-1 text-[18px] text-muted">{isMe ? "Your studio" : "Creator"}</p>
        </div>
        {isMe && (
          <Link to="/compose">
            <Button>New post</Button>
          </Link>
        )}
      </header>

      <div className="mt-10 grid gap-5 sm:grid-cols-3">
        {[
          { label: "Posts", value: String(owned.length) },
          { label: "Registered works", value: String(works) },
          { label: "Reputation", value: `${reputation > 0 ? "+" : ""}${reputation}` },
        ].map((s) => (
          <Card key={s.label} className="p-7">
            <p className="text-[40px] font-bold leading-none tracking-tight text-navy">{s.value}</p>
            <p className="mt-3 text-[17px] text-muted">{s.label}</p>
          </Card>
        ))}
      </div>

      <h2 className="mb-7 mt-14 text-[28px] font-bold tracking-tight text-navy">Posts</h2>
      {loading ? (
        <Loading />
      ) : owned.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-[19px] text-slate">Nothing posted from this address yet.</p>
        </Card>
      ) : (
        <div className="space-y-7">
          {owned.map((post, i) => (
            <PostCard key={post.postId} post={post} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
