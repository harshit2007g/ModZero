import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Hero from "../components/marketing/Hero";
import ScrollStory from "../components/marketing/ScrollStory";
import PostCard from "../components/feed/PostCard";
import { Seo } from "../components/seo/Seo";
import { Avatar, Button, Card, ErrorNote, Loading, Pill, truncateAddress } from "../components/ui";
import { listPosts } from "../lib/client";
import type { PostRecord } from "../lib/api";

const EXPO = [0.16, 1, 0.3, 1] as const;

const SCHEMA = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "ModZero",
  applicationCategory: "SocialNetworkingApplication",
  operatingSystem: "Web",
  description:
    "A social feed where authorship is proven at upload. Images are fingerprinted and watermarked before publication, authorship is timestamped on Hedera, and reuse is licensed and settled on Ethereum.",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
};

export default function Feed() {
  const [posts, setPosts] = useState<PostRecord[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listPosts()
      .then(setPosts)
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const registered = posts.filter((p) => p.contentId).length;
    const creators = new Set(posts.map((p) => p.creatorAddress)).size;
    return [
      { label: "Posts", value: posts.length },
      { label: "Registered works", value: registered },
      { label: "Creators", value: creators },
    ];
  }, [posts]);

  const topCreators = useMemo(() => {
    const seen = new Map<string, number>();
    posts.forEach((p) => {
      const current = seen.get(p.creatorAddress) ?? -Infinity;
      seen.set(p.creatorAddress, Math.max(current, p.creatorReputation ?? 0));
    });
    return [...seen.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  }, [posts]);

  return (
    <>
      <Seo
        title="ModZero — Proof of authorship, built into the upload"
        description="A social feed where every image is fingerprinted and watermarked before it publishes. Reuse is detected automatically, priced by the creator's agent, and settled on Ethereum."
        canonicalPath="/"
        schema={SCHEMA}
      />

      <Hero />

      {/* ── Feed first ─────────────────────────────────────────── */}
      <section id="feed" className="relative overflow-hidden pb-28 pt-4">
        <div className="dots pointer-events-none absolute inset-0 opacity-40" />
        <div className="relative mx-auto max-w-[1440px] px-8">
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.9, ease: EXPO }}
            className="mb-12 flex flex-wrap items-end justify-between gap-6"
          >
            <div>
              <h2 className="text-[clamp(36px,4.2vw,52px)] font-bold leading-tight tracking-[-0.035em] text-navy">
                Recent activity
              </h2>
              <p className="mt-3 text-[20px] text-slate">
                Each post carries the record of where its media came from.
              </p>
            </div>
            <Link to="/compose">
              <Button>Publish a work</Button>
            </Link>
          </motion.div>

          <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[210px_minmax(0,1fr)_340px]">
            {/* left rail — only once there is genuinely room for it */}
            <aside className="hidden xl:block">
              <nav aria-label="Sections" className="sticky top-28">
                <ul className="space-y-1">
                  {[
                    { to: "/", label: "Feed" },
                    { to: "/compose", label: "Publish a work" },
                    { to: "/verify", label: "Check an image" },
                    { to: "/studio", label: "Your studio" },
                  ].map((item) => (
                    <li key={item.to}>
                      <Link
                        to={item.to}
                        className="block rounded-xl px-4 py-3 text-[18px] font-medium text-slate transition-colors hover:bg-band hover:text-navy"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>

                <div className="mt-10 border-t border-line pt-8">
                  <h3 className="text-[17px] font-bold text-navy">What the labels mean</h3>
                  <ul className="mt-5 space-y-4">
                    <li>
                      <Pill tone="brand">Original work</Pill>
                      <p className="mt-2 text-[16px] leading-relaxed text-muted">
                        No earlier match in the registry.
                      </p>
                    </li>
                    <li>
                      <Pill tone="sky">Licensed</Pill>
                      <p className="mt-2 text-[16px] leading-relaxed text-muted">
                        Derived from another work, and paid for.
                      </p>
                    </li>
                  </ul>
                </div>
              </nav>
            </aside>

            {/* feed column, left-weighted */}
            <div>
              {error ? <ErrorNote error={error} /> : null}
              {loading && <Loading label="Loading feed" />}

              {!loading && posts.length === 0 && (
                <Card className="p-14 text-center">
                  <p className="text-[21px] text-slate">Nothing published yet.</p>
                </Card>
              )}

              <div className="space-y-8">
                {posts.map((post, i) => (
                  <PostCard key={post.postId} post={post} index={i} />
                ))}
              </div>
            </div>

            {/* sidebar */}
            <aside className="hidden lg:block">
              <div className="sticky top-28 space-y-6">
                <Card className="overflow-hidden">
                  <div className="border-b border-line bg-band px-7 py-6">
                    <h3 className="text-[21px] font-bold tracking-tight text-navy">
                      Check an image
                    </h3>
                    <p className="mt-2 text-[17px] leading-relaxed text-slate">
                      Match any picture against the registry without publishing it.
                    </p>
                  </div>
                  <div className="p-7">
                    <Link to="/verify">
                      <Button variant="outline" className="w-full">
                        Open the checker
                      </Button>
                    </Link>
                  </div>
                </Card>

                <Card className="p-7">
                  <h3 className="text-[19px] font-bold tracking-tight text-navy">Network</h3>
                  <dl className="mt-5 space-y-4">
                    {stats.map((s) => (
                      <div key={s.label} className="flex items-baseline justify-between">
                        <dt className="text-[17px] text-slate">{s.label}</dt>
                        <dd className="text-[24px] font-bold text-navy">{s.value}</dd>
                      </div>
                    ))}
                  </dl>
                </Card>

                {topCreators.length > 0 && (
                  <Card className="p-7">
                    <h3 className="text-[19px] font-bold tracking-tight text-navy">
                      Highest reputation
                    </h3>
                    <ul className="mt-5 space-y-4">
                      {topCreators.map(([address, rep]) => (
                        <li key={address}>
                          <Link
                            to={`/u/${address}`}
                            className="flex items-center gap-3 transition-opacity hover:opacity-75"
                          >
                            <Avatar seed={address} size={40} />
                            <span className="min-w-0 flex-1 truncate font-mono text-[16px] text-navy">
                              {truncateAddress(address)}
                            </span>
                            <Pill tone={rep > 0 ? "mint" : "neutral"}>
                              {rep > 0 ? "+" : ""}
                              {rep}
                            </Pill>
                          </Link>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-5 text-[16px] leading-relaxed text-muted">
                      Reputation moves with resolved challenges. No editor decides who is seen.
                    </p>
                  </Card>
                )}
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* ── Then the explanation ───────────────────────────────── */}
      <ScrollStory />

      {/* ── Closing ────────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-32">
        <div className="bloom drift" />
        <div className="relative mx-auto max-w-[860px] px-8 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 1, ease: EXPO }}
            className="text-[clamp(38px,5vw,64px)] font-bold leading-[1.08] tracking-[-0.035em] text-navy"
          >
            Publish once. The record follows the work.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.12, ease: EXPO }}
            className="mx-auto mt-7 max-w-xl text-[21px] leading-relaxed text-slate"
          >
            No moderation queue, no takedown desk. Authorship is a proof, and disputes settle by
            a rule anyone can read.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.24, ease: EXPO }}
            className="mt-11 flex flex-wrap justify-center gap-4"
          >
            <Link to="/compose">
              <Button size="lg">Publish a work</Button>
            </Link>
            <Link to="/studio">
              <Button size="lg" variant="outline">
                Open your studio
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>
    </>
  );
}
