import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Hero from "../components/marketing/Hero";
import ScrollStory from "../components/marketing/ScrollStory";
import PostCard from "../components/feed/PostCard";
import { Seo } from "../components/seo/Seo";
import { Button, Card, ErrorNote, Loading } from "../components/ui";
import { usePosts } from "../lib/usePosts";
import { CreateCommunityButton } from "../components/feed/CreateCommunity";
import { communityCounts } from "../lib/communities";

const EXPO = [0.16, 1, 0.3, 1] as const;

/** How many posts the landing page teases before sending you to /feed. */
const PREVIEW_COUNT = 3;

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
  const { posts, error, loading } = usePosts();
  const preview = posts.slice(0, PREVIEW_COUNT);
  const communities = communityCounts(posts).slice(0, 6);

  return (
    <>
      <Seo
        title="ModZero — Proof of authorship, built into the upload"
        description="A social feed where every image is fingerprinted and watermarked before it publishes. Reuse is detected automatically, priced by the creator's agent, and settled on Ethereum."
        canonicalPath="/"
        schema={SCHEMA}
      />

      <Hero />

      {/* ── A taste of the feed ────────────────────────────────── */}
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
                The newest {PREVIEW_COUNT}. Each carries the record of where its media came from.
              </p>
            </div>
            <Link to="/feed">
              <Button>See the full feed</Button>
            </Link>
          </motion.div>

          {error ? <ErrorNote error={error} /> : null}
          {loading && <Loading label="Loading feed" />}

          {!loading && preview.length === 0 && (
            <Card className="p-14 text-center">
              <p className="text-[21px] text-slate">Nothing published yet.</p>
              <div className="mt-6 flex justify-center">
                <Link to="/compose">
                  <Button>Be the first</Button>
                </Link>
              </div>
            </Card>
          )}

          <div className="grid gap-8 lg:grid-cols-3">
            {preview.map((post, i) => (
              <PostCard key={post.postId} post={post} index={i} />
            ))}
          </div>

          {posts.length > PREVIEW_COUNT && (
            <div className="mt-12 flex justify-center">
              <Link to="/feed">
                <Button variant="outline" size="lg">
                  See all {posts.length} posts
                </Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ── Communities ────────────────────────────────────────── */}
      <section className="band relative overflow-hidden py-24">
        <div className="relative mx-auto max-w-[1440px] px-8">
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.9, ease: EXPO }}
            className="mb-10 flex flex-wrap items-end justify-between gap-6"
          >
            <div>
              <h2 className="text-[clamp(34px,4vw,48px)] font-bold leading-tight tracking-[-0.035em] text-navy">
                Post into a community
              </h2>
              <p className="mt-3 max-w-xl text-[20px] text-slate">
                Same idea as a subreddit — except every image inside arrives with its authorship
                already proven.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/m">
                <Button variant="outline">Browse communities</Button>
              </Link>
              <CreateCommunityButton />
            </div>
          </motion.div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {communities.map((entry, i) => (
              <motion.div
                key={entry.community.slug}
                initial={{ opacity: 0, y: 22 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.7, delay: Math.min(i * 0.06, 0.3), ease: EXPO }}
              >
                <Link to={`/m/${entry.community.slug}`} className="block h-full">
                  <Card hover className="flex h-full flex-col p-6">
                    <span
                      className={`inline-flex w-fit rounded-full px-3.5 py-1.5 text-[16px] font-semibold ${entry.community.tone}`}
                    >
                      m/{entry.community.slug}
                    </span>
                    <p className="mt-4 flex-1 text-[17px] leading-relaxed text-slate">
                      {entry.community.blurb}
                    </p>
                    <p className="mt-4 text-[16px] text-muted">
                      {entry.count} post{entry.count === 1 ? "" : "s"}
                    </p>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

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
            No moderation queue, no takedown desk. Authorship is a proof, and disputes settle by a
            rule anyone can read.
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
