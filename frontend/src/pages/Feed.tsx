import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { listPosts, type PostRecord } from "../lib/api";
import { getContent, mediaUrl} from "../lib/api";

function truncate(address: string) {
    return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export default function Feed() {
    const [posts, setPosts] = useState<PostRecord[]>([]);
    const [error, setError] = useState("");
    const [thumbnails, setThumbnails] = useState<Record<string, string | null>>({});

    useEffect(() => {
        listPosts()
            .then(async (data) => {
                setPosts(data);
                const withImages = data.filter((p) => p.contentId);
                const entries = await Promise.all(
                    withImages.map(async (p) => {
                        try {
                            const content = await getContent(p.contentId as string);
                            return [p.postId, content.mediaUri] as const;
                        } catch {
                            return [p.postId, null] as const;
                        }
                    })
                );
                const map: Record<string, string | null> = {};
                for (const [postId, uri] of entries) map[postId] = uri;
                setThumbnails(map);
            })
            .catch((err) => setError(err.message));
    }, []);

    return (
        <div className="mx-auto max-w-2xl px-6 py-16">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-semibold tracking-tight">Feed</h1>
                <Link
                    to="/post/new"
                    className="glow-btn px-4 py-2 rounded-full bg-gold text-ink-950 font-medium text-sm hover:bg-gold-bright transition-colors"
                >
                    New post
                </Link>
            </div>

            {error && <p className="text-signal-red text-sm">{error}</p>}

            {posts.length === 0 && !error && (
                <div className="glass rounded-2xl p-10 text-center text-paper-dim text-sm">
                    Nothing posted yet — be the first.
                </div>
            )}

            <div className="space-y-4">
                {posts.map((post, i) => (
                    <motion.div
                        key={post.postId}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: i * 0.05 }}
                    >
                        <Link to={`/post/${post.postId}`} className="block glass rounded-2xl p-5 hover:border-gold/40 transition-colors">
                            <div className="flex items-center justify-between text-xs text-paper-dim mb-2">
                                <span className="font-mono">{truncate(post.creatorAddress)}</span>
                                <span className="flex items-center gap-2">
                                    {typeof post.creatorReputation === "number" && (
                                        <span
                                            className={post.creatorReputation < 100 ? "text-signal-amber" : "text-signal-green"}
                                        >
                                            rep {post.creatorReputation}
                                        </span>
                                    )}
                                    {new Date(post.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                            <p className="text-paper leading-relaxed">{post.text}</p>
                            {post.contentId && thumbnails[post.postId] && (
                                <div className="mt-3 rounded-xl overflow-hidden border hairline max-h-64">
                                    <img
                                        src={mediaUrl(thumbnails[post.postId]) ?? ""}
                                        alt="Attached content"
                                        className="w-full object-cover"
                                    />
                                </div>
                            )}
                        </Link>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}