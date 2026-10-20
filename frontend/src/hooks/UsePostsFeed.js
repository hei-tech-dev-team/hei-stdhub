import { useState, useEffect, useRef, useCallback } from "react";
import api from "../api/axios";

const PAGE_SIZE = 10;
const API_TYPES = { announcements: "announcement", posts: "post" };

export default function usePostsFeed({ type = "all", q = "" } = {}) {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [hasNextPage, setHasNextPage] = useState(false);

    const postsRef = useRef([]);
    const cursorRef = useRef(null);
    const hasNextRef = useRef(false);
    const loadingRef = useRef(false);
    const requestIdRef = useRef(0);
    const pendingReactionsRef = useRef(new Set());

    useEffect(() => {
        postsRef.current = posts;
    }, [posts]);

    const load = useCallback(
        async (reset) => {
            if (!reset && (loadingRef.current || !hasNextRef.current)) return;
            const requestId = ++requestIdRef.current;
            loadingRef.current = true;
            setLoading(true);
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
                    setLoading(false);
                }
            }
        },
        [type, q]
    );

    useEffect(() => {
        cursorRef.current = null;
        hasNextRef.current = false;
        setPosts([]);
        setHasNextPage(false);
        load(true);

        return () => {
            requestIdRef.current++;
        };
    }, [load]);

    const loadMore = useCallback(() => load(false), [load]);
    const retry = useCallback(() => load(postsRef.current.length === 0), [load]);

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
        addPost,
        updatePost,
        deletePost,
        toggleReaction,
    };
}
