import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import usePostsFeed from "../hooks/UsePostsFeed";
import PostCard from "../components/feed/PostCard";
import PostComposerModal from "../components/feed/PostComposerModal";
import EmptyStateAnimation from "../components/ui/EmptyStateAnimation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faSearch,
    faSpinner,
    faFolderOpen,
    faBullhorn,
    faNewspaper,
    faStream,
    faPlus,
    faBookOpen,
} from "@fortawesome/free-solid-svg-icons";

export default function FeedPage() {
    const { user } = useAuth();
    const [filterType, setFilterType] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [isComposerOpen, setIsComposerOpen] = useState(false);
    const [isSearchHovered, setIsSearchHovered] = useState(false);

    const observerTarget = useRef(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const {
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
    } = usePostsFeed({ type: filterType, q: debouncedSearch });

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasNextPage && !loading) {
                    loadMore();
                }
            },
            { threshold: 0.1 }
        );
        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }
        return () => observer.disconnect();
    }, [hasNextPage, loading, loadMore]);

    return (
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-surface">
            <div className=" mx-auto px-4 sm:px-6 py-6 space-y-6 items-center flex flex-col">
                <div className="w-full bg-gradient-to-br from-navy via-navy-dark to-navy rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-card">
                    <div className="absolute -top-10 -right-10 w-40 h-40 bg-gold/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-white/5 rounded-full blur-3xl pointer-events-none" />
                    <div className="flex items-center gap-4 relative">
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/10 backdrop-blur-sm ring-1 ring-white/20 flex items-center justify-center shrink-0">
                            <FontAwesomeIcon icon={faBookOpen} className="text-gold text-xl sm:text-2xl" />
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                                Bonjour, {user?.prenom || user?.pseudo}
                            </h1>
                        </div>
                    </div>
                </div>

                <div className="w-full fixed bottom-0 sm:sticky sm:top-0 z-40 bg-surface backdrop-blur-md flex flex-wrap items-center justify-between gap-3 p-3 sm:rounded-2xl shadow-xl sm:shadow-none border border-gray-100/50 transition-all max-w-3xl sm:max-w-none mx-auto">
                    <div className="flex gap-1 rounded-xl shadow-card p-2">
                        <button
                            type="button"
                            onClick={() => setFilterType("all")}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                filterType === "all" ? "bg-navy text-white shadow-xs" : "text-gray-400 hover:text-navy"
                            }`}
                        >
                            <FontAwesomeIcon icon={faStream} /> Tout
                        </button>
                        <button
                            type="button"
                            onClick={() => setFilterType("announcements")}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                filterType === "announcements" ? "bg-navy text-white shadow-xs" : "text-gray-400 hover:text-navy"
                            }`}
                        >
                            <FontAwesomeIcon icon={faBullhorn} /> Annonces
                        </button>
                        <button
                            type="button"
                            onClick={() => setFilterType("posts")}
                            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                filterType === "posts" ? "bg-navy text-white shadow-xs" : "text-gray-400 hover:text-navy"
                            }`}
                        >
                            <FontAwesomeIcon icon={faNewspaper} /> Posts
                        </button>
                    </div>

                    <div className="flex items-center gap-2 bg-surface p-2 shadow-card rounded-xl">
                        <button
                            type="button"
                            onClick={() => setIsComposerOpen(true)}
                            className="w-9 h-9 rounded-xl bg-gold text-navy font-bold flex items-center justify-center hover:bg-gold-light hover:scale-105 active:scale-95 transition-all shadow-xs"
                            title="Nouvelle publication"
                        >
                            <FontAwesomeIcon icon={faPlus} className="text-sm" />
                        </button>

                        <div
                            onMouseEnter={() => setIsSearchHovered(true)}
                            onMouseLeave={() => !searchQuery && setIsSearchHovered(false)}
                            className={`hidden sm:flex relative items-center transition-all duration-300 ${
                                isSearchHovered || searchQuery ? "w-48 sm:w-64" : "w-9"
                            }`}
                        >
                            <input
                                type="text"
                                placeholder="Rechercher..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onFocus={() => setIsSearchHovered(true)}
                                onBlur={() => !searchQuery && setIsSearchHovered(false)}
                                className={`w-full py-2 pr-3 bg-surface rounded-xl text-xs text-navy placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gold/50 transition-all ${
                                    isSearchHovered || searchQuery ? "pl-9 opacity-100 border border-gray-200" : "pl-9 opacity-0 cursor-pointer"
                                }`}
                            />
                            <div className="absolute left-0 top-0 bottom-0 w-9 flex items-center justify-center text-gray-400 pointer-events-none">
                                <FontAwesomeIcon icon={faSearch} className="text-xs" />
                            </div>
                        </div>
                    </div>
                </div>

                <PostComposerModal
                    isOpen={isComposerOpen}
                    onClose={() => setIsComposerOpen(false)}
                    user={user}
                    onPostCreated={addPost}
                />

                {error && (
                    <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-center">
                        <p className="text-xs font-semibold text-rose-600 mb-2">{error}</p>
                        <button
                            type="button"
                            onClick={retry}
                            className="px-4 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700"
                        >
                            Réessayer
                        </button>
                    </div>
                )}

                {posts.length === 0 && !loading ? (
                    <EmptyStateAnimation/>
                ) : (
                    <div className="space-y-4 max-w-4xl">
                        {posts.map((post) => (
                            <PostCard
                                key={post.id}
                                post={post}
                                currentUser={user}
                                onUpdate={updatePost}
                                onDelete={deletePost}
                                onReactionChange={toggleReaction}
                            />
                        ))}
                    </div>
                )}

                <div ref={observerTarget} className="h-12 flex items-center justify-center">
                    {loading && (
                        <div className="flex items-center gap-2 text-navy text-sm font-semibold bg-white px-4 py-2 rounded-full shadow-card">
                            <FontAwesomeIcon icon={faSpinner} className="animate-spin text-gold" />
                            <span>Chargement...</span>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}