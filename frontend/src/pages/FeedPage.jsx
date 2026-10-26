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
} from "@fortawesome/free-solid-svg-icons";

export default function FeedPage() {
    const { user } = useAuth();
    const [filterType, setFilterType] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [isComposerOpen, setIsComposerOpen] = useState(false);

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
            <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 py-6 sm:py-8 space-y-6">
                <div className="bg-navy rounded-2xl px-6 py-7 sm:px-8 flex items-start justify-between gap-4">
                    <div>
                        <p className="text-white/40 text-[11px] uppercase tracking-[0.1em] font-medium">
                            Accueil
                        </p>
                        <h1 className="text-white text-xl sm:text-2xl font-bold tracking-tight mt-2.5">
                            Bonjour, {user?.prenom || user?.pseudo}
                            <span className="text-gold">.</span>
                        </h1>
                        <p className="text-white/50 text-sm mt-2 leading-relaxed">
                            Les actualités et annonces de la tribu HEI, au même endroit.
                        </p>
                    </div>
                    <p className="hidden sm:block text-white/30 text-[11px] uppercase tracking-[0.15em] font-medium pt-1">
                        {new Intl.DateTimeFormat("fr-FR", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                        }).format(new Date())}
                    </p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={() => setFilterType("all")}
                            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 ${
                                filterType === "all" ? "bg-navy text-white" : "text-gray-400 hover:text-navy"
                            }`}
                        >
                            <FontAwesomeIcon icon={faStream} /> Tout
                        </button>
                        <button
                            type="button"
                            onClick={() => setFilterType("announcements")}
                            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 ${
                                filterType === "announcements" ? "bg-navy text-white" : "text-gray-400 hover:text-navy"
                            }`}
                        >
                            <FontAwesomeIcon icon={faBullhorn} /> Annonces
                        </button>
                        <button
                            type="button"
                            onClick={() => setFilterType("posts")}
                            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 ${
                                filterType === "posts" ? "bg-navy text-white" : "text-gray-400 hover:text-navy"
                            }`}
                        >
                            <FontAwesomeIcon icon={faNewspaper} /> Posts
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="hidden sm:flex relative items-center">
                            <FontAwesomeIcon
                                icon={faSearch}
                                className="absolute left-3 text-gray-400 text-xs pointer-events-none"
                            />
                            <input
                                type="text"
                                placeholder="Rechercher..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-48 lg:w-64 bg-[#F6F7F8] border border-transparent rounded-xl pl-8 pr-3 py-2 text-xs text-navy placeholder:text-gray-400 focus:outline-none focus:bg-white focus:border-gold/50 focus:ring-1 focus:ring-gold/20 transition-all"
                            />
                        </div>

                        <button
                            type="button"
                            onClick={() => setIsComposerOpen(true)}
                            className="w-9 h-9 rounded-xl bg-navy text-white flex items-center justify-center hover:bg-navy-dark transition-colors"
                            title="Nouvelle publication"
                        >
                            <FontAwesomeIcon icon={faPlus} className="text-sm" />
                        </button>
                    </div>
                </div>

                <PostComposerModal
                    isOpen={isComposerOpen}
                    onClose={() => setIsComposerOpen(false)}
                    user={user}
                    onPostCreated={addPost}
                />

                {error && (
                    <div className="bg-[#FEF3F2] border border-[#FECACA] rounded-xl p-4 text-center">
                        <p className="text-xs text-[#B42318] mb-2">{error}</p>
                        <button
                            type="button"
                            onClick={retry}
                            className="px-4 py-1.5 rounded-xl bg-navy text-white text-xs font-medium hover:bg-navy-dark transition-colors"
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
                        <div className="flex items-center gap-2 text-navy/60 text-xs font-medium">
                            <FontAwesomeIcon icon={faSpinner} className="animate-spin text-gold" />
                            <span>Chargement...</span>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}