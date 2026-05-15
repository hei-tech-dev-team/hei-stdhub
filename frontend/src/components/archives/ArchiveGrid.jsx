import { useState, useEffect } from "react";
import api from "../../api/axios"; // Assure-toi que le chemin est correct
import ArchiveCard from "./ArchiveCard"; // Assure-toi que le chemin est correct

export default function ArchiveGrid() {
  // 1. Initialise TOUJOURS avec un tableau vide pour éviter le crash au montage
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        setError(null); // Réinitialise l'erreur à chaque nouvelle tentative
        const res = await api.get("/posts");

        // 2. Sécurité : On s'assure que ce qu'on met dans le state est bien un tableau
        // D'après ton backend (backend/routes/posts.js), la réponse est { posts: [...] }
        const data = Array.isArray(res.data.posts) ? res.data.posts : [];
        setPosts(data);
      } catch (err) {
        console.error("Erreur de récupération des posts:", err);
        setError(
          err.response?.data?.error ||
            "Impossible de charger les posts. Veuillez réessayer."
        );
        setPosts([]); // S'assurer que posts est un tableau vide en cas d'erreur
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, []); // Le tableau vide assure que l'effet ne s'exécute qu'une seule fois au montage

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">Chargement des documents...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {posts.length > 0 ? (
        posts.map((post) => <ArchiveCard key={post.id} post={post} />)
      ) : (
        <p className="text-gray-500 italic">Aucun document trouvé.</p>
      )}
    </div>
  );
}