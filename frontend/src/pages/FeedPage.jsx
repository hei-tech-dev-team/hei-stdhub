import { useState, useEffect, useRef, useCallback } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import PostComposer from "../components/feed/PostComposer";
import PostCard from "../components/feed/PostCard";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch, faSpinner, faFolderOpen, faBullhorn, faNewspaper, faStream } from "@fortawesome/free-solid-svg-icons";

export default function FeedPage () {
    const { user } = useAuth();
    const [posts, setPosts] = useState([]);
    const [filterType, setFilterType] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [loading, setLoading] = useState(false);
    const [hasNextPage, setHasNextPage] = useState(true);
    const [nextCursor, setNextCursor] = useState(null);

    const observerTarget = useRef(null);
    const isFetchingRef = useRef(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        setPosts([]);
        setNextCursor(null);
        setHasNextPage(true);
        fetchPosts(true);
    }, [filterType, debouncedSearch]);

    const fetchPosts = async (isReset = false) => {
        if (isFetchingRef.current) return;
        isFetchingRef.current = true;
        setLoading(true);

        try {
        const cursorParams = !isReset && nextCursor
            ? { cursor_created_at: nextCursor.created_at, cursor_id: nextCursor.id }
            : {};

        const { data } = await api.get("/posts", {
            params: {
            limit: 10,
            ...cursorParams,
            },
        });
        const newPosts = data.data || [];
        setPosts((prev) => (isReset ? newPosts : [...prev, ...newPosts]));
        setHasNextPage(data.pagination?.hasNextPage || false);
        setNextCursor(data.pagination?.nextCursor || null);
        } catch (err) {
            console.error("Erreur lors de la récupération des posts:", err);
        } finally {
            setLoading(false);
            isFetchingRef.current = false;
        }
    };

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasNextPage && !loading) {
                    fetchPosts(false);
                }
            },
            { threshold: 0.1 }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => observer.disconnect();
    }, [hasNextPage, loading, nextCursor]);

    const handlePostCreated = (newPost) => {
        setPosts((prev) => [newPost, ...prev]);
    };

    const handleUpdatePost = async (id, payload) => {
        const { data } = await api.patch(`/posts/${id}`, payload);
        setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, ...data } : p)));
    };

    const handleDeletePost = async (id) => {
        if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce post ?")) return;
        try {
            await api.delete(`/posts/${id}`);
            setPosts((prev) => prev.filter((p) => p.id !== id));
        } catch (err) {
            console.error("Erreur lors de la suppression : ", err);
        }
    };

    const handleReactionToggle = async (postId, targetKind) => {
        setPosts((prevPosts) =>
            prevPosts.map((post) => {
                if (post.id !== postId) return post;

                const currentKind = post.user_reaction;
                const currentSummary = { ...(post.reactions_summary || {}) };

                let nextKind = null;
                if (currentKind === targetKind) {
                    nextKind = null;
                    currentSummary[targetKind] = Math.max((currentSummary[targetKind] || 1) - 1, 0);
                } else {
                    nextKind = targetKind;
                    if (currentKind) {
                        currentSummary[currentKind] = Math.max((currentSummary[currentKind] || 1) - 1, 0);
                    }
                    currentSummary[targetKind] = (currentSummary[targetKind] || 0) + 1;
                }

                return {
                    ...post,
                    user_reaction: nextKind,
                    reactions_summary: currentSummary,
                };
            })
        );
        try {
            const targetPost = posts.find((p) => p.id === postId);
            if (targetPost?.user_reaction === targetKind) {
                await api.delete(`/posts/${postId}/reaction`);
            } else {
                await api.put(`/posts/${postId}/reaction`, { kind: targetKind });
            }
        } catch (err) {
            console.error("Erreur réaction, annulation optimiste:", err);
            fetchPosts(true);
        }
    };

    const filteredPosts = posts.filter((post) => {
        if (filterType === "announcements" && post.type !== "announcement") return false;
        if (filterType === "posts" && post.type !== "post") return false;

        if (debouncedSearch.trim()) {
            const query = debouncedSearch.toLowerCase();
            const matchTitle = post.title?.toLowerCase().includes(query);
            const matchContent = post.content?.toLowerCase().includes(query);
            const matchAuthor = post.author?.pseudo?.toLowerCase().includes(query);
            return matchTitle || matchContent || matchAuthor;
        }

        return true;
    });

    return (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
            <PostComposer user={user} onPostCreated={handlePostCreated} />

            <div className="bg-white rounded-2xl shadow-card p-3 mb-6 space-y-3">
                <div className="relative">
                <FontAwesomeIcon
                    icon={faSearch}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm"
                />
                <input
                    type="text"
                    placeholder="Rechercher une publication, un auteur..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-xl bg-surface border border-gray-100 text-sm text-navy placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold/50"
                />
                </div>

                <div className="flex gap-1.5 p-1 bg-surface rounded-xl">
                <button
                    type="button"
                    onClick={() => setFilterType("all")}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    filterType === "all" ? "bg-navy text-white shadow-xs" : "text-gray-400 hover:text-navy"
                    }`}
                >
                    <FontAwesomeIcon icon={faStream} /> Tout
                </button>
                <button
                    type="button"
                    onClick={() => setFilterType("announcements")}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    filterType === "announcements" ? "bg-navy text-white shadow-xs" : "text-gray-400 hover:text-navy"
                    }`}
                >
                    <FontAwesomeIcon icon={faBullhorn} /> Annonces
                </button>
                <button
                    type="button"
                    onClick={() => setFilterType("posts")}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    filterType === "posts" ? "bg-navy text-white shadow-xs" : "text-gray-400 hover:text-navy"
                    }`}
                >
                    <FontAwesomeIcon icon={faNewspaper} /> Posts
                </button>
                </div>
            </div>

            {filteredPosts.length === 0 && !loading ? (
                <div className="bg-white rounded-2xl shadow-card p-12 text-center my-8">
                <div className="w-16 h-16 rounded-full bg-gold/10 text-gold flex items-center justify-center mx-auto mb-4">
                    <FontAwesomeIcon icon={faFolderOpen} className="text-2xl" />
                </div>
                <h3 className="text-lg font-bold text-navy mb-1">Rien à afficher</h3>
                <p className="text-xs text-gray-400">Aucun contenu disponible pour le moment.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredPosts.map((post) => (
                        <PostCard
                            key={post.id}
                            post={post}
                            currentUser={user}
                            onUpdate={handleUpdatePost}
                            onDelete={handleDeletePost}
                            onReactionChange={handleReactionToggle}
                        />
                    ))}
                </div>
            )}

            <div ref={observerTarget} className="h-10 flex items-center justify-center mt-4">
                {loading && (
                    <FontAwesomeIcon icon={faSpinner} className="text-navy text-2xl animate-spin" />
                )}
            </div>
        </div>
    )
}
