import { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faTrash, faExternalLinkAlt, faFolderOpen, faTimes } from "@fortawesome/free-solid-svg-icons";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import ArchiveCard from "./ArchiveCard";

export default function ArchiveGrid() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [ues, setUes] = useState([]);
  const [selectedUe, setSelectedUe] = useState(null);
  const [supports, setSupports] = useState([]);
  const [showSupports, setShowSupports] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newUrl, setNewUrl] = useState("");

  const isTeacher = user?.role === "teacher" || user?.role === "admin";

  useEffect(() => {
    api.get("/posts").then(({ data }) => {
      const allPosts = data.posts || [];
      setPosts(allPosts);

      const ueMap = {};
      allPosts.forEach((p) => {
        if (!p.ue) return;
        const year = p.target_level || "Autre";
        if (!ueMap[year]) ueMap[year] = new Set();
        ueMap[year].add(p.ue);
      });
      const grouped = Object.entries(ueMap).map(([year, ueSet]) => ({
        year,
        ues: [...ueSet].sort(),
      })).sort((a, b) => a.year.localeCompare(b.year));
      setUes(grouped);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedUe) return;
    api.get(`/supports/${selectedUe}`).then(({ data }) => {
      setSupports(Array.isArray(data) ? data : []);
    }).catch(() => setSupports([]));
  }, [selectedUe]);

  const handleSelectUe = (ue) => {
    setSelectedUe(ue);
    setShowSupports(true);
    setAdding(false);
    setNewLabel("");
    setNewUrl("");
  };

  const handleAddSupport = async () => {
    if (!newLabel.trim() || !newUrl.trim()) return;
    try {
      await api.post("/supports", { ue: selectedUe, label: newLabel, url: newUrl });
      setNewLabel("");
      setNewUrl("");
      setAdding(false);
      const { data } = await api.get(`/supports/${selectedUe}`);
      setSupports(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSupport = async (id) => {
    try {
      await api.delete(`/supports/${id}`);
      setSupports((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const relatedPosts = selectedUe ? posts.filter((p) => p.ue === selectedUe) : [];

  return (
    <div className="flex gap-6 h-full">
      <div className="flex-1 overflow-y-auto">
        {ues.map((group) => (
          <div key={group.year} className="mb-8">
            <h2 className="text-lg font-bold text-navy mb-4 flex items-center gap-2">
              <FontAwesomeIcon icon={faFolderOpen} className="text-gold text-sm" />
              {group.year === "Autre" ? "Autres" : `Niveau ${group.year}`}
              <span className="text-xs text-gray-400 font-normal">({group.ues.length} UE{group.ues.length > 1 ? "s" : ""})</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {group.ues.map((ue) => (
                <button
                  key={ue}
                  onClick={() => handleSelectUe(ue)}
                  className={`text-left p-4 rounded-xl border-2 transition-all ${
                    selectedUe === ue
                      ? "border-gold bg-gold/5 shadow-md"
                      : "border-contact/60 bg-white hover:border-gold/40 hover:shadow-sm"
                  }`}
                >
                  <span className="font-bold text-navy text-sm">{ue}</span>
                  <span className="block text-[10px] text-gray-400 mt-1">
                    {posts.filter((p) => p.ue === ue).length} contenu(s)
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
        {ues.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <FontAwesomeIcon icon={faFolderOpen} className="text-4xl mb-3 opacity-30" />
            <p>Aucune archive disponible pour le moment.</p>
          </div>
        )}
      </div>

      {showSupports && selectedUe && (
        <div className="w-80 shrink-0 border-l border-contact/30 pl-6 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-navy text-sm">{selectedUe}</h3>
            <button onClick={() => { setShowSupports(false); setSelectedUe(null); }} className="text-gray-400 hover:text-navy transition">
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>

          <div className="space-y-2 mb-4">
            {supports.map((s) => (
              <div key={s.id} className="flex items-center justify-between bg-white rounded-lg border border-contact/30 p-3">
                <a href={s.url} target="_blank" rel="noreferrer" className="text-xs font-medium text-navy hover:text-gold transition flex items-center gap-1.5 truncate">
                  <FontAwesomeIcon icon={faExternalLinkAlt} className="text-[10px] shrink-0" />
                  <span className="truncate">{s.label}</span>
                </a>
                {isTeacher && (
                  <button onClick={() => handleDeleteSupport(s.id)} className="text-red-300 hover:text-red-500 transition shrink-0 ml-2">
                    <FontAwesomeIcon icon={faTrash} className="text-[10px]" />
                  </button>
                )}
              </div>
            ))}
            {supports.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-4">Aucun lien de support.</p>
            )}
          </div>

          {isTeacher && !adding && (
            <button onClick={() => setAdding(true)} className="w-full text-xs font-bold text-gold border border-gold/30 rounded-lg py-2 hover:bg-gold/5 transition flex items-center justify-center gap-1.5">
              <FontAwesomeIcon icon={faPlus} /> Ajouter un lien
            </button>
          )}

          {isTeacher && adding && (
            <div className="space-y-2 bg-surface rounded-xl p-3 border border-contact/30">
              <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Nom du lien" className="w-full text-xs border border-contact/50 rounded-lg px-3 py-2 focus:outline-none focus:border-navy" />
              <input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="URL" className="w-full text-xs border border-contact/50 rounded-lg px-3 py-2 focus:outline-none focus:border-navy" />
              <div className="flex gap-2">
                <button onClick={handleAddSupport} className="flex-1 text-xs font-bold bg-navy text-white rounded-lg py-2 hover:bg-navy/90 transition">Ajouter</button>
                <button onClick={() => { setAdding(false); setNewLabel(""); setNewUrl(""); }} className="text-xs text-gray-400 hover:text-navy transition px-3">Annuler</button>
              </div>
            </div>
          )}

          {relatedPosts.length > 0 && (
            <div className="mt-6">
              <h4 className="text-[10px] font-bold uppercase text-gray-400 tracking-wider mb-3">Contenus associés</h4>
              <div className="space-y-3">
                {relatedPosts.slice(0, 5).map((post) => (
                  <ArchiveCard key={post.id} post={post} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
