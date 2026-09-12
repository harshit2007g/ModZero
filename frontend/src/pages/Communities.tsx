import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import Breadcrumbs from "../components/layout/Breadcrumbs";
import { Card, Loading } from "../components/ui";
import { CreateCommunityButton } from "../components/feed/CreateCommunity";
import { useSeo } from "../components/seo/Seo";
import { usePosts } from "../lib/usePosts";
import { communityCounts } from "../lib/communities";

const EXPO = [0.16, 1, 0.3, 1] as const;

export default function Communities() {
  useSeo({
    title: "Communities",
    description:
      "Every community on ModZero. Each one is a feed of work whose authorship was proven at upload.",
    canonicalPath: "/m",
  });

  const { posts, loading } = usePosts();
  const counts = communityCounts(posts);

  return (
    <div className="mx-auto max-w-[1180px] px-8 py-14">
      <Breadcrumbs items={[{ name: "Feed", path: "/feed" }, { name: "Communities" }]} />

      <header className="mb-14 flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl">
          <h1 className="text-[clamp(42px,5.4vw,68px)] font-bold leading-[1.05] tracking-[-0.035em] text-navy">
            Communities
          </h1>
          <p className="mt-5 text-[21px] leading-relaxed text-slate">
            Post into a community the way you would a subreddit — except every image in them arrives
            with its authorship already proven.
          </p>
        </div>
        <CreateCommunityButton size="lg" />
      </header>

      {loading ? (
        <Loading label="Loading communities" />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {counts.map(({ community, count }, i) => (
            <motion.div
              key={community.slug}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.7, delay: Math.min(i * 0.05, 0.3), ease: EXPO }}
            >
              <Link to={`/m/${community.slug}`} className="block h-full">
                <Card hover className="flex h-full flex-col p-7">
                  <span
                    className={`inline-flex w-fit rounded-full px-3.5 py-1.5 text-[16px] font-semibold ${community.tone}`}
                  >
                    m/{community.slug}
                  </span>
                  <h2 className="mt-4 text-[22px] font-bold tracking-tight text-navy">
                    {community.title}
                  </h2>
                  <p className="mt-2 flex-1 text-[17px] leading-relaxed text-slate">
                    {community.blurb}
                  </p>
                  <p className="mt-5 text-[16px] text-muted">
                    {count} post{count === 1 ? "" : "s"}
                  </p>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      <Card className="mt-12 flex flex-wrap items-center justify-between gap-6 p-8">
        <div>
          <h2 className="text-[22px] font-bold tracking-tight text-navy">
            Want one that doesn&apos;t exist?
          </h2>
          <p className="mt-2 max-w-lg text-[18px] leading-relaxed text-slate">
            Name it and write the first post. A community is real as soon as something is in it.
          </p>
        </div>
        <CreateCommunityButton variant="outline" />
      </Card>
    </div>
  );
}
