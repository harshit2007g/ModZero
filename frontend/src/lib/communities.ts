import type { PostRecord } from "./api";

/**
 * Communities — the m/ system.
 *
 * HOW IT IS STORED, and why: the backend's POST /post accepts exactly
 * `{ text, creatorAddress }` (backend/src/routes/post.ts), so there is nowhere
 * to put a community id. Rather than invent a route, the community is encoded
 * as a leading `m/slug` token in the post text and parsed back out on read.
 *
 * That is a real, working scheme — it round-trips through the existing backend,
 * survives the on-chain textHash, and needs no coordination. It is also plainly
 * an interim: the moment the backend grows a `community` column, switch
 * `communityOf` to read the field and delete `withCommunity`. Nothing else in
 * the app touches the encoding.
 */

export interface Community {
  slug: string;
  title: string;
  blurb: string;
  /** Tailwind classes for the community's accent chip. */
  tone: string;
}

/** Seeded communities. Anything else found in a post is treated as ad-hoc. */
export const COMMUNITIES: Community[] = [
  {
    slug: "showcase",
    title: "Showcase",
    blurb: "Original work, freshly registered. Post what you made.",
    tone: "bg-brand-soft text-brand",
  },
  {
    slug: "photography",
    title: "Photography",
    blurb: "Photographs and the provenance behind them.",
    tone: "bg-[#e0f4fa] text-[#0784a3]",
  },
  {
    slug: "design",
    title: "Design",
    blurb: "Illustration, type, and visual work of every kind.",
    tone: "bg-[#fdeaf2] text-[#c2185b]",
  },
  {
    slug: "provenance",
    title: "Provenance",
    blurb: "Fingerprinting, watermarking and how the registry behaves.",
    tone: "bg-[#e6f7f1] text-mint",
  },
  {
    slug: "disputes",
    title: "Disputes",
    blurb: "Open challenges, claims, and how they resolved.",
    tone: "bg-[#fdeaec] text-flag",
  },
  {
    slug: "help",
    title: "Help",
    blurb: "Questions about licensing, staking and the agent.",
    tone: "bg-[#fdf2e2] text-sun",
  },
];

const SLUG_RE = /^m\/([a-z0-9][a-z0-9-]{1,23})\b[ \t]*\n?/i;

export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9][a-z0-9-]{1,23}$/.test(slug);
}

/** The community a post belongs to, or null for an unfiled post. */
export function communityOf(post: Pick<PostRecord, "text">): string | null {
  const match = SLUG_RE.exec(post.text ?? "");
  return match ? match[1].toLowerCase() : null;
}

/** The post text with the community token removed. */
export function bodyOf(post: Pick<PostRecord, "text">): string {
  return (post.text ?? "").replace(SLUG_RE, "").trimStart();
}

/** Prefixes a body with its community, ready for POST /post. */
export function withCommunity(slug: string | null, body: string): string {
  const clean = body.trim();
  if (!slug) return clean;
  return `m/${slug}\n${clean}`;
}

export function findCommunity(slug: string): Community {
  const known = allCommunities().find((c) => c.slug === slug);
  if (known) return known;
  return {
    slug,
    title: slug.replace(/-/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase()),
    blurb: "A community created by its first post.",
    tone: "bg-[#efedfa] text-slate",
  };
}

/** Every community present in a set of posts, with counts, busiest first. */
export function communityCounts(posts: PostRecord[]): Array<{ community: Community; count: number }> {
  const counts = new Map<string, number>();
  posts.forEach((post) => {
    const slug = communityOf(post);
    if (slug) counts.set(slug, (counts.get(slug) ?? 0) + 1);
  });

  const seen = new Set(counts.keys());
  allCommunities().forEach((c) => seen.add(c.slug));

  return [...seen]
    .map((slug) => ({ community: findCommunity(slug), count: counts.get(slug) ?? 0 }))
    .sort((a, b) => b.count - a.count || a.community.slug.localeCompare(b.community.slug));
}

export function postsIn(posts: PostRecord[], slug: string): PostRecord[] {
  return posts.filter((post) => communityOf(post) === slug);
}

/**
 * Communities someone creates in the UI.
 *
 * There is no backend table for community metadata, so a new community's title
 * and description live in this browser until there is one. The community itself
 * is not local — it becomes real the moment a post carries its slug, and anyone
 * loading that post sees it. Only the description is per-browser.
 */
const STORAGE_KEY = "modzero:communities";

const TONES = [
  "bg-brand-soft text-brand",
  "bg-[#e0f4fa] text-[#0784a3]",
  "bg-[#fdeaf2] text-[#c2185b]",
  "bg-[#e6f7f1] text-mint",
  "bg-[#fdf2e2] text-sun",
  "bg-[#efedfa] text-slate",
];

function toneFor(slug: string): string {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return TONES[h % TONES.length];
}

export function customCommunities(): Community[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (c): c is Community =>
        !!c && typeof c === "object" && typeof (c as Community).slug === "string",
    );
  } catch {
    return [];
  }
}

/** Seeded plus locally-created, deduplicated. */
export function allCommunities(): Community[] {
  const seen = new Set(COMMUNITIES.map((c) => c.slug));
  return [...COMMUNITIES, ...customCommunities().filter((c) => !seen.has(c.slug))];
}

/** True when the slug is already in use. */
export function slugTaken(slug: string): boolean {
  return allCommunities().some((c) => c.slug === slug.trim().toLowerCase());
}

/** Saves a new community locally. Returns it, or null if the slug is unusable. */
export function saveCommunity(input: {
  slug: string;
  title: string;
  blurb: string;
}): Community | null {
  const slug = input.slug.trim().toLowerCase();
  if (!isValidSlug(slug) || slugTaken(slug)) return null;

  const community: Community = {
    slug,
    title: input.title.trim() || slug.replace(/-/g, " ").replace(/\w/g, (ch) => ch.toUpperCase()),
    blurb: input.blurb.trim() || "A community created by its first post.",
    tone: toneFor(slug),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...customCommunities(), community]));
  } catch {
    /* storage unavailable — the community still works, it just has no description */
  }
  return community;
}
