import { useState, useEffect, useRef, useCallback } from "react";
import api from "../api/axios";
import { getSocket } from "../socket";
import { useAuth } from "../context/AuthContext";

const PAGE_SIZE = 10;
const API_TYPES = { announcements: "announcement", posts: "post" };
const MAX_CACHED_FEEDS = 10;
const feedCache = new Map();

const getCacheKey = (userId, type, q) =>
    `${userId || "anonymous"}|${type}|${q.trim()}`;

const readCachedFeed = (key) => feedCache.get(key) || null;

const writeCachedFeed = (key, entry) => {
    feedCache.set(key, entry);

    // Search/filter combinations could otherwise keep every feed in memory
    // for the lifetime of the tab.
    if (feedCache.size > MAX_CACHED_FEEDS) {
        feedCache.delete(feedCache.keys().next().value);
    }
};

export default function usePostsFeed({ type = "all", q = "" } = {}) {
    const { user } = useAuth();
    const cacheKey = getCacheKey(user?.id, type, q);
    const cachedFeed = readCachedFeed(cacheKey);

    const [posts, setPosts] = useState(() => cachedFeed?.posts ?? []);
    const [loading, setLoading] = useState(
        () => !cachedFeed?.posts?.length,
    );
    const [error, setError] = useState("");
    const [hasNextPage, setHasNextPage] = useState(
        () => Boolean(cachedFeed?.hasNextPage),
    );

    const postsRef = useRef(posts);
    const cursorRef = useRef(cachedFeed?.cursor ?? null);
    const hasNextRef = useRef(Boolean(cachedFeed?.hasNextPage));
    const loadingRef = useRef(false);
    const requestIdRef = useRef(0);
    const pendingReactionsRef = useRef(new Set());
    const cacheWriteKeyRef = useRef(cacheKey);

    useEffect(() => {
        postsRef.current = posts;
    }, [posts]);

    useEffect(() => {
        let socket = null;
        let cancelled = false;

        getSocket()
            .then((s) => {
                if (cancelled || !s) return;
                socket = s;
                socket.on("feed:new", (post) => {
                    if (!post?.id || q.trim()) return;
                    if (API_TYPES[type] && post.type !== API_TYPES[type]) return;
                    setPosts((prev) =>
                        prev.some((p) => p.id === post.id) ? prev : [post, ...prev]
                    );
                });
            })
            .catch(() => {});

        return () => {
            cancelled = true;
            if (socket) socket.off("feed:new");
        };
    }, [type, q]);

    const load = useCallback(
        async (reset, { silent = false } = {}) => {
            if (!reset && (loadingRef.current || !hasNextRef.current)) return;
            const requestId = ++requestIdRef.current;
            loadingRef.current = true;
            if (!silent) setLoading(true);
            setError("");

            try {
                const params = { limit: PAGE_SIZE };
                if (API_TYPES[type]) params.type = API_TYPES[type];
                if (q.trim()) params.q = q.trim();
                if (!reset && cursorRef.current) {
                    params.cursor_created_at = cursorRef.current.created_at;
                    params.cursor_id = cursorRef.current.id;
                }

                const { data } = await api.get("/posts", { params });
                if (requestId !== requestIdRef.current) return;

                const incoming = data.data || [];
                setPosts((prev) => {
                    if (reset) return incoming;
                    const known = new Set(prev.map((p) => p.id));
                    return [...prev, ...incoming.filter((p) => !known.has(p.id))];
                });

                cursorRef.current = data.pagination?.nextCursor || null;
                hasNextRef.current = Boolean(data.pagination?.hasNextPage);
                setHasNextPage(hasNextRef.current);
            } catch (err) {
                if (requestId !== requestIdRef.current) return;
                console.error("Erreur lors de la récupération des posts:", err);
                setError("Impossible de charger les publications.");
            } finally {
                if (requestId === requestIdRef.current) {
                    loadingRef.current = false;
                    if (!silent) setLoading(false);
                }
            }
        },
        [type, q]
    );

    useEffect(() => {
        const cached = readCachedFeed(cacheKey);
        const hasCachedPosts = Boolean(cached?.posts?.length);

        cursorRef.current = cached?.cursor ?? null;
        hasNextRef.current = Boolean(cached?.hasNextPage);
        setPosts(cached?.posts ?? []);
        setHasNextPage(Boolean(cached?.hasNextPage));
        setLoading(!hasCachedPosts);

        // Show cached posts immediately, then revalidate them silently instead
        // of flashing an empty feed after a route remount.
        load(true, { silent: hasCachedPosts });

        return () => {
            requestIdRef.current++;
        };
    }, [cacheKey, load]);

    useEffect(() => {
        // Skip the render where the key changes: state still belongs to the
        // previous filter until the hydration effect above runs.
        if (cacheWriteKeyRef.current !== cacheKey) {
            cacheWriteKeyRef.current = cacheKey;
            return;
        }

        writeCachedFeed(cacheKey, {
            posts,
            cursor: cursorRef.current,
            hasNextPage: hasNextRef.current,
        });
    }, [cacheKey, posts, hasNextPage]);

    const loadMore = useCallback(() => load(false), [load]);
    const retry = useCallback(() => load(postsRef.current.length === 0), [load]);
    const refresh = useCallback(() => {
        cursorRef.current = null;
        hasNextRef.current = false;
        setHasNextPage(false);
        return load(true);
    }, [load]);

    const addPost = useCallback((post) => {
        setPosts((prev) => [post, ...prev.filter((p) => p.id !== post.id)]);
    }, []);

    const patchPost = useCallback((id, patch) => {
        setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    }, []);

    const updatePost = useCallback(
        async (id, payload) => {
            const { data } = await api.patch(`/posts/${id}`, payload);
            patchPost(id, data);
        },
        [patchPost]
    );

    const deletePost = useCallback(async (id) => {
        await api.delete(`/posts/${id}`);
        setPosts((prev) => prev.filter((p) => p.id !== id));
    }, []);

    const toggleReaction = useCallback(
        async (postId, kind) => {
            if (pendingReactionsRef.current.has(postId)) return;

            const current = postsRef.current.find((p) => p.id === postId);
            if (!current) return;

            const previous = {
                user_reaction: current.user_reaction ?? null,
                reactions_summary: current.reactions_summary || {},
            };
            const removing = previous.user_reaction === kind;

            const summary = { ...previous.reactions_summary };
            if (previous.user_reaction) {
                summary[previous.user_reaction] = Math.max((summary[previous.user_reaction] || 0) - 1, 0);
            }
            if (!removing) {
                summary[kind] = (summary[kind] || 0) + 1;
            }

            patchPost(postId, {
                user_reaction: removing ? null : kind,
                reactions_summary: summary,
            });

            pendingReactionsRef.current.add(postId);
            try {
                if (removing) {
                    await api.delete(`/posts/${postId}/reaction`);
                } else {
                    await api.put(`/posts/${postId}/reaction`, { kind });
                }
            } catch (err) {
                if (removing && err.response?.status === 404) return;
                console.error("Erreur réaction, annulation :", err);
                patchPost(postId, previous);
            } finally {
                pendingReactionsRef.current.delete(postId);
            }
        },
        [patchPost]
    );

    return {
        posts,
        loading,
        error,
        hasNextPage,
        loadMore,
        retry,
        refresh,
        addPost,
        updatePost,
        deletePost,
        toggleReaction,
    };
}
