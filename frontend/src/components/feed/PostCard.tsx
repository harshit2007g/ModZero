import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import type { ContentRecord, PostRecord } from "../../lib/api";
import { getContent, imageFor } from "../../lib/client";
import { Avatar, Card, Pill, timeAgo, truncateAddress } from "../ui";

const EXPO = [0.16, 1, 0.3, 1] as const;

export default function PostCard({ post, index = 0 }: { post: PostRecord; index?: number }) {
  const [content, setContent] = useState<ContentRecord | null>(null);

  useEffect(() => {
    let alive = true;
    if (!post.contentId) return;
    getContent(post.contentId)
      .then((c) => alive && setContent(c))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [post.contentId]);

  const image = post.contentId ? imageFor(content, post.contentId) : null;
  const derivative = Boolean(content?.parentContentId);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.97 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.9, delay: Math.min(index * 0.08, 0.35), ease: EXPO }}
    >
      <Card hover className="overflow-hidden">
        <div className="flex items-center gap-4 px-8 pt-8">
          <Link to={`/u/${post.creatorAddress}`}>
            <Avatar seed={post.creatorAddress} size={58} />
          </Link>
          <div className="min-w-0 flex-1">
            <Link
              to={`/u/${post.creatorAddress}`}
              className="block font-mono text-[19px] font-semibold text-navy transition-colors hover:text-brand"
            >
              {truncateAddress(post.creatorAddress)}
            </Link>
            <p className="text-[17px] text-muted">{timeAgo(post.createdAt)}</p>
          </div>
          {typeof post.creatorReputation === "number" && post.creatorReputation !== 0 && (
            <Pill tone={post.creatorReputation > 0 ? "mint" : "flag"}>
              {post.creatorReputation > 0 ? "+" : ""}
              {post.creatorReputation}
            </Pill>
          )}
        </div>

        <Link to={`/post/${post.postId}`} className="block px-8 pb-7 pt-5">
          <p className="text-[22px] leading-[1.5] text-navy">{post.text}</p>
        </Link>

        {image && (
          <Link to={`/post/${post.postId}`} className="block overflow-hidden">
            <img
              src={image}
              alt={`Registered work attached to a post by ${truncateAddress(post.creatorAddress)}`}
              className="aspect-[16/10] w-full object-cover"
              loading="lazy"
            />
          </Link>
        )}

        {post.contentId && (
          <div className="flex items-center justify-between gap-4 px-8 py-6">
            <Pill tone={derivative ? "sky" : "brand"}>
              {derivative ? "Licensed from another creator" : "Original work"}
            </Pill>
            <Link
              to={`/post/${post.postId}`}
              className="text-[18px] font-semibold text-brand transition-transform hover:translate-x-1"
            >
              View →
            </Link>
          </div>
        )}
      </Card>
    </motion.div>
  );
}
