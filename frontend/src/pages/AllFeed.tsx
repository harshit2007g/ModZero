import { Link } from "react-router-dom";
import PostCard from "../components/feed/PostCard";
import { CommunityRail, StatsRail } from "../components/feed/FeedRails";
import { Button, Card, ErrorNote, Loading } from "../components/ui";
import { useSeo } from "../components/seo/Seo";
import { usePosts } from "../lib/usePosts";

/** Everything, newest first. The landing page only teases this. */
export default function AllFeed() {
  useSeo({
    title: "Feed",
    description:
      "Every post on ModZero, newest first. Each one carries the provenance record of the media attached to it.",
    canonicalPath: "/feed",
  });

  const { posts, error, loading } = usePosts();

  return (
    <div className="mx-auto max-w-[1440px] px-8 py-14">
      <header className="mb-12 flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="text-[clamp(40px,5vw,60px)] font-bold leading-tight tracking-[-0.035em] text-navy">
            Feed
          </h1>
          <p className="mt-3 text-[20px] text-slate">
            {loading ? "Loading…" : `${posts.length} post${posts.length === 1 ? "" : "s"} across all communities.`}
          </p>
        </div>
        <Link to="/compose">
          <Button>Publish a work</Button>
        </Link>
      </header>

      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[230px_minmax(0,1fr)_340px]">
        <CommunityRail posts={posts} />

        <div>
          {error ? <ErrorNote error={error} /> : null}
          {loading && <Loading label="Loading feed" />}

          {!loading && posts.length === 0 && (
            <Card className="p-14 text-center">
              <p className="text-[21px] text-slate">Nothing published yet.</p>
              <div className="mt-6 flex justify-center">
                <Link to="/compose">
                  <Button>Be the first</Button>
                </Link>
              </div>
            </Card>
          )}

          <div className="space-y-8">
            {posts.map((post, i) => (
              <PostCard key={post.postId} post={post} index={i} />
            ))}
          </div>
        </div>

        <StatsRail posts={posts} />
      </div>
    </div>
  );
}
