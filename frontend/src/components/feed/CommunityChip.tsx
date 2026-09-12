import { Link } from "react-router-dom";
import { findCommunity } from "../../lib/communities";

/** The m/slug badge shown on a post and in listings. */
export function CommunityChip({
  slug,
  size = "md",
}: {
  slug: string | null;
  size?: "sm" | "md";
}) {
  if (!slug) return null;
  const community = findCommunity(slug);
  const pad = size === "sm" ? "px-3 py-1 text-[15px]" : "px-3.5 py-1.5 text-[16px]";

  return (
    <Link
      to={`/m/${community.slug}`}
      onClick={(e) => e.stopPropagation()}
      className={`inline-flex shrink-0 items-center rounded-full font-semibold transition-opacity hover:opacity-80 ${community.tone} ${pad}`}
    >
      m/{community.slug}
    </Link>
  );
}
