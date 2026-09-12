import { Link, NavLink } from "react-router-dom";
import type { PostRecord } from "../../lib/api";
import { communityCounts } from "../../lib/communities";
import { Avatar, Button, Card, truncateAddress } from "../ui";
import { CreateCommunityButton } from "./CreateCommunity";

/** Left rail: the community directory. Shared by /feed and /m/:slug. */
export function CommunityRail({ posts, activeSlug }: { posts: PostRecord[]; activeSlug?: string }) {
  const counts = communityCounts(posts).slice(0, 8);

  return (
    <aside className="hidden xl:block">
      <div className="sticky top-28">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[17px] font-bold text-navy">Communities</h2>
          <Link to="/m" className="text-[16px] font-semibold text-brand hover:underline">
            All
          </Link>
        </div>

        <ul className="mt-4 space-y-1">
          {counts.map(({ community, count }) => (
            <li key={community.slug}>
              <NavLink
                to={`/m/${community.slug}`}
                className={({ isActive }) =>
                  `flex items-baseline justify-between gap-2 rounded-xl px-4 py-2.5 text-[17px] transition-colors ${
                    isActive || activeSlug === community.slug
                      ? "bg-band font-semibold text-navy"
                      : "text-slate hover:bg-band hover:text-navy"
                  }`
                }
              >
                <span className="truncate">m/{community.slug}</span>
                <span className="shrink-0 text-[15px] text-muted">{count}</span>
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="mt-8 space-y-2 border-t border-line pt-6">
          <Link to="/compose" className="block">
            <Button variant="outline" size="sm" className="w-full">
              Publish a work
            </Button>
          </Link>
          <CreateCommunityButton variant="outline" size="sm" label="New community" className="w-full" />
        </div>
      </div>
    </aside>
  );
}

/** Right rail: the checker, network counters and top creators. */
export function StatsRail({ posts }: { posts: PostRecord[] }) {
  const registered = posts.filter((p) => p.contentId).length;
  const creators = new Set(posts.map((p) => p.creatorAddress)).size;

  const top = (() => {
    const seen = new Map<string, number>();
    posts.forEach((p) => {
      seen.set(p.creatorAddress, Math.max(seen.get(p.creatorAddress) ?? -Infinity, p.creatorReputation ?? 0));
    });
    return [...seen.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  })();

  return (
    <aside className="hidden lg:block">
      <div className="sticky top-28 space-y-6">
        <Card className="overflow-hidden">
          <div className="border-b border-line bg-band px-7 py-6">
            <h2 className="text-[21px] font-bold tracking-tight text-navy">Check an image</h2>
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
          <h2 className="text-[19px] font-bold tracking-tight text-navy">Network</h2>
          <dl className="mt-5 space-y-4">
            {[
              { label: "Posts", value: posts.length },
              { label: "Registered works", value: registered },
              { label: "Creators", value: creators },
            ].map((s) => (
              <div key={s.label} className="flex items-baseline justify-between">
                <dt className="text-[17px] text-slate">{s.label}</dt>
                <dd className="text-[24px] font-bold text-navy">{s.value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        {top.length > 0 && (
          <Card className="p-7">
            <h2 className="text-[19px] font-bold tracking-tight text-navy">Highest reputation</h2>
            <ul className="mt-5 space-y-4">
              {top.map(([address, rep]) => (
                <li key={address}>
                  <Link
                    to={`/u/${address}`}
                    className="flex items-center gap-3 transition-opacity hover:opacity-75"
                  >
                    <Avatar seed={address} size={40} />
                    <span className="min-w-0 flex-1 truncate font-mono text-[16px] text-navy">
                      {truncateAddress(address)}
                    </span>
                    <span className="shrink-0 text-[16px] font-semibold text-mint">
                      {rep > 0 ? "+" : ""}
                      {rep}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </aside>
  );
}
