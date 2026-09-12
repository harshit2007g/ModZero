import { Link, useParams } from "react-router-dom";
import PostCard from "../components/feed/PostCard";
import { CommunityRail, StatsRail } from "../components/feed/FeedRails";
import Breadcrumbs from "../components/layout/Breadcrumbs";
import { Button, Card, ErrorNote, Loading } from "../components/ui";
import { useSeo } from "../components/seo/Seo";
import { usePosts } from "../lib/usePosts";
import { findCommunity, postsIn } from "../lib/communities";

export default function Community() {
  const { slug = "" } = useParams<{ slug: string }>();
  const community = findCommunity(slug.toLowerCase());
  const { posts, error, loading } = usePosts();
  const mine = postsIn(posts, community.slug);

  useSeo({
    title: `m/${community.slug}`,
    description: `${community.blurb} Posts in m/${community.slug} on ModZero, each carrying its own provenance record.`,
    canonicalPath: `/m/${community.slug}`,
  });

  return (
    <div className="mx-auto max-w-[1440px] px-8 py-14">
      <Breadcrumbs
        items={[
          { name: "Feed", path: "/feed" },
          { name: "Communities", path: "/m" },
          { name: `m/${community.slug}` },
        ]}
      />

      <header className="mb-12">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <span
              className={`inline-flex rounded-full px-4 py-1.5 text-[17px] font-semibold ${community.tone}`}
            >
              m/{community.slug}
            </span>
            <h1 className="mt-4 text-[clamp(38px,4.6vw,56px)] font-bold leading-tight tracking-[-0.035em] text-navy">
              {community.title}
            </h1>
            <p className="mt-3 max-w-xl text-[20px] leading-relaxed text-slate">{community.blurb}</p>
          </div>
          <Link to={`/compose?m=${community.slug}`}>
            <Button>Post to m/{community.slug}</Button>
          </Link>
        </div>
      </header>

      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[230px_minmax(0,1fr)_340px]">
        <CommunityRail posts={posts} activeSlug={community.slug} />

        <div>
          {error ? <ErrorNote error={error} /> : null}
          {loading && <Loading label={`Loading m/${community.slug}`} />}

          {!loading && mine.length === 0 && (
            <Card className="p-14 text-center">
              <p className="text-[21px] text-slate">No posts in m/{community.slug} yet.</p>
              <div className="mt-6 flex justify-center">
                <Link to={`/compose?m=${community.slug}`}>
                  <Button>Start it off</Button>
                </Link>
              </div>
            </Card>
          )}

          <div className="space-y-8">
            {mine.map((post, i) => (
              <PostCard key={post.postId} post={post} index={i} />
            ))}
          </div>
        </div>

        <StatsRail posts={mine.length ? mine : posts} />
      </div>
    </div>
  );
}
