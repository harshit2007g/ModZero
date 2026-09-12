import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import PostCard from "../components/feed/PostCard";
import { useIdentity } from "../components/layout/Shell";
import { Avatar, Button, Card, Loading, truncateAddress } from "../components/ui";
import { listPosts } from "../lib/client";
import type { PostRecord } from "../lib/api";
import { useSeo } from "../components/seo/Seo";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:4000";

async function lookupUsername(address: string): Promise<string | null> {
  const res = await fetch(`${API_BASE}/username/lookup?address=${address}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.username ?? null;
}

async function registerUsername(username: string, address: string): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`${API_BASE}/username`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, address }),
  }); return { ok: true };
}

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
  const [username, setUsername] = useState<string | null>(null);
  const [usernameInput, setUsernameInput] = useState("");
  const [registering, setRegistering] = useState(false);
  const [registerError, setRegisterError] = useState("");

  useEffect(() => {
    listPosts()
      .then(setPosts)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!who) return;
    lookupUsername(who).then(setUsername);
  }, [who]);

  async function handleRegister() {
    if (!usernameInput) return;
    setRegistering(true);
    setRegisterError("");
    const result = await registerUsername(usernameInput.toLowerCase(), who);
    if (result.ok) {
      setUsername(usernameInput.toLowerCase());
      setUsernameInput("");
    } else {
      setRegisterError(result.error ?? "Registration failed");
    }
    setRegistering(false);
  }

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

  // Display priority: on-chain username > ENS name > truncated address
  const displayName = username ? `${username}.modzero` : isMe && ensName ? ensName : truncateAddress(who, 8);

  return (
    <div className="mx-auto max-w-[900px] px-8 py-14">
      <header className="flex flex-wrap items-center gap-7 border-b border-line pb-10">
        <Avatar seed={who} size={92} />
        <div className="flex-1">
          <h1 className="font-mono text-[clamp(24px,3.4vw,36px)] font-bold tracking-tight text-navy">
            {displayName}
          </h1>
          <p className="mt-1 text-[18px] text-muted">{isMe ? "Your studio" : "Creator"}</p>
        </div>
        {isMe && (
          <Link to="/compose">
            <Button>New post</Button>
          </Link>
        )}
      </header>

      {isMe && !username && (
        <Card className="mt-8 p-7">
          <h2 className="text-[18px] font-bold tracking-tight text-navy">Claim your ModZero username</h2>
          <p className="mt-2 text-[16px] text-slate">
            Register a name on-chain so people see <span className="font-mono">yourname.modzero</span> instead
            of your wallet address. This is a real transaction — takes a few seconds to confirm.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <input
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value.toLowerCase())}
              placeholder="yourname"
              maxLength={32}
              className="flex-1 min-w-[200px] rounded-lg border border-line px-4 py-2.5 font-mono text-sm focus:outline-none focus:border-navy"
            />
            <Button onClick={handleRegister} disabled={!usernameInput || registering}>
              {registering ? "Registering…" : "Register"}
            </Button>
          </div>
          {registerError && <p className="mt-2 text-sm text-red-600">{registerError}</p>}
          <p className="mt-2 text-xs text-muted">3-32 characters, lowercase letters, numbers, and hyphens only.</p>
        </Card>
      )}

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