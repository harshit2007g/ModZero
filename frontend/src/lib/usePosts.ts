import { useEffect, useState } from "react";
import { listPosts } from "./client";
import type { PostRecord } from "./api";

/** Loads the whole feed once per mount. Shared by the landing, /feed and /m/*. */
export function usePosts() {
  const [posts, setPosts] = useState<PostRecord[]>([]);
  const [error, setError] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    listPosts()
      .then((p) => alive && setPosts(p))
      .catch((e) => alive && setError(e))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  return { posts, error, loading };
}
