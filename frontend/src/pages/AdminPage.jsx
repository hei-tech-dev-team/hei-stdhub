import { useState, useEffect, useCallback, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUsers,
  faFileAlt,
  faInbox,
  faComments,
  faSearch,
  faTrash,
  faUserShield,
  faUserGraduate,
  faChalkboardTeacher,
  faSpinner,
  faPlus,
  faCopy,
  faTicket,
  faTimes,
  faCheck,
  faArrowUp,
} from "@fortawesome/free-solid-svg-icons";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import Sidebar from "../components/layout/Sidebar";
const ROLE_CONFIG = {
  student: {
    label: "Étudiant",
    icon: faUserGraduate,
    color: "bg-cyan-100 text-cyan-700",
  },
  teacher: {
    label: "Professeur",
    icon: faChalkboardTeacher,
    color: "bg-purple-100 text-purple-700",
  },
  admin: {
    label: "Admin",
    icon: faUserShield,
    color: "bg-red-100 text-red-700",
  },
  bde: {
    label: "BDE",
    icon: faUsers,
    color: "bg-yellow-100 text-yellow-700",
  },
};

function StatCard({ icon, label, value, color }) {
  return (
    <div className="bg-white rounded-2xl shadow-card p-5 flex items-center gap-4">
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}
      >
        <FontAwesomeIcon icon={icon} className="text-lg" />
      </div>
      <div>
        <p className="text-2xl font-bold text-navy">{value ?? "—"}</p>
        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">
          {label}
        </p>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState("users");
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);
  const [showTop, setShowTop] = useState(false);

  const mainRef = useRef();
  // Afficher bouton "remonter en haut"
  useEffect(() => {
    const handleScroll = () => {
      setShowTop(mainRef.current.scrollTop > 300);
    };
    const mainEl = mainRef.current;
    mainEl.addEventListener("scroll", handleScroll);
    return () => mainEl.removeEventListener("scroll", handleScroll);
  }, []);

  // Charger stats avec polling 3 secondes
  useEffect(() => {
    const fetchStats = () => {
      api
        .get("/admin/stats")
        .then(({ data }) => setStats(data))
        .catch(console.error);
    };
    fetchStats();
    const interval = setInterval(fetchStats, 3000);
    return () => clearInterval(interval);
  }, []);
  // Modal invitation
  const [showInvModal, setShowInvModal] = useState(false);
  const [invRole, setInvRole] = useState("student");
  const [invLoading, setInvLoading] = useState(false);

  // Charger stats
  useEffect(() => {
    api
      .get("/admin/stats")
      .then(({ data }) => setStats(data))
      .catch(console.error);
  }, []);

  // Charger utilisateurs
  const loadUsers = useCallback(() => {
    setLoading(true);
    const params = {};
    if (search) params.q = search;
    if (roleFilter) params.role = roleFilter;
    api
      .get("/admin/users", { params })
      .then(({ data }) => setUsers(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search, roleFilter]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Charger invitations
  const loadInvitations = useCallback(() => {
    api
      .get("/admin/invitations")
      .then(({ data }) => setInvitations(data))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (tab === "invitations") loadInvitations();
  }, [tab, loadInvitations]);

  // Changer rôle
  const handleRoleChange = async (userId, newRole) => {
    try {
      const { data } = await api.patch(`/admin/users/${userId}/role`, {
        role: newRole,
      });
      console.log("Réponse:", data);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: data.role } : u)),
      );
    } catch (err) {
      console.error("Erreur:", err.response?.data);
    }
  };

  // Supprimer utilisateur
  const handleDelete = async (userId, ref) => {
    if (!confirm(`Supprimer ${ref} ? Cette action est irréversible.`)) return;
    try {
      await api.delete(`/admin/users/${userId}`);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      api.get("/admin/stats").then(({ data }) => setStats(data));
    } catch (err) {
      console.error(err);
    }
  };

  // Créer invitation
  const handleCreateInvitation = async () => {
    setInvLoading(true);
    try {
      const { data } = await api.post("/admin/invitations", { role: invRole });
      setInvitations((prev) => [data, ...prev]);
      setShowInvModal(false);
      setTab("invitations");
    } catch (err) {
      console.error(err);
    } finally {
      setInvLoading(false);
    }
  };

  // Supprimer invitation
  const handleDeleteInvitation = async (id) => {
    try {
      await api.delete(`/admin/invitations/${id}`);
      setInvitations((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  // Copier code
  const handleCopy = (id, code) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar />
      <main
        ref={mainRef}
        className="flex-1 flex flex-col overflow-y-auto h-screen"
      >
        <div className="flex-1 p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-navy">
              Panneau d'administration
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Gestion des utilisateurs et des accès
            </p>
          </div>
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <StatCard
              icon={faUsers}
              label="Utilisateurs"
              value={stats?.total_users}
              color="bg-navy/10 text-navy"
            />
            <StatCard
              icon={faFileAlt}
              label="Posts"
              value={stats?.total_posts}
              color="bg-gold/10 text-gold"
            />
            <StatCard
              icon={faInbox}
              label="Rendus"
              value={stats?.total_submissions}
              color="bg-cyan-100 text-cyan-600"
            />
            <StatCard
              icon={faComments}
              label="Messages"
              value={stats?.total_messages}
              color="bg-purple-100 text-purple-600"
            />
          </div>
          {/* Tabs */}
          <div className="flex gap-2 mb-5">
            {[
              { key: "users", label: "Utilisateurs" },
              { key: "invitations", label: "Invitations" },
            ].map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={
                  "px-4 py-2 rounded-xl text-sm font-bold transition " +
                  (tab === t.key
                    ? "bg-navy text-white"
                    : "bg-white text-navy border border-contact hover:bg-surface")
                }
              >
                {t.label}
              </button>
            ))}

            {/* Bouton générer invitation */}
            <button
              type="button"
              onClick={() => setShowInvModal(true)}
              className="ml-auto btn-primary flex items-center gap-2 text-sm"
            >
              <FontAwesomeIcon icon={faPlus} />
              <span className="hidden sm:inline">Générer une invitation</span>
            </button>
          </div>
          {/* ── TAB USERS ── */}
          {tab === "users" && (
            <>
              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                  <FontAwesomeIcon
                    icon={faSearch}
                    className="absolute left-4 top-1/2 -translate-y-1/2
                               text-gray-400 text-sm pointer-events-none"
                  />
                  <input
                    className="input-field pl-10"
                    placeholder="Rechercher réf., pseudo, email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <select
                  className="input-field sm:w-40"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                >
                  <option value="">Tous les rôles</option>
                  <option value="student">Étudiant</option>
                  <option value="teacher">Professeur</option>
                  <option value="admin">Admin</option>
                  <option value="bde">BDE</option>
                </select>
              </div>

              {loading && (
                <div className="flex justify-center py-16">
                  <FontAwesomeIcon
                    icon={faSpinner}
                    className="text-navy text-3xl animate-spin"
                  />
                </div>
              )}

              {/* Tableau desktop */}
              {!loading && (
                <>
                  <div className="hidden md:block bg-white rounded-2xl shadow-card overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-surface bg-surface/60">
                          {[
                            "Référence",
                            "Nom complet",
                            "Email",
                            "Pseudo",
                            "Niveau",
                            "Rôle",
                            "Premiere connexion",
                            "Action",
                          ].map((h) => (
                            <th
                              key={h}
                              className="text-left py-3 px-4 text-xs font-bold
                                                   text-gray-500 uppercase tracking-wide whitespace-nowrap"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((u) => (
                          <tr
                            key={u.id}
                            className="border-b border-surface last:border-0
                                                     hover:bg-surface/50 transition"
                          >
                            <td className="py-3 px-4 font-bold text-navy whitespace-nowrap">
                              {u.ref}
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              {u.prenom} {u.nom}
                            </td>
                            <td className="py-3 px-4 text-gray-500 text-xs">
                              {u.email}
                            </td>
                            <td className="py-3 px-4 text-gray-500 text-xs">
                              {u.pseudo}
                            </td>
                            <td className="py-3 px-4 text-gray-400 text-xs">
                              {u.level || "—"}
                            </td>
                            <td className="py-3 px-4">
                              <select
                                value={u.role}
                                onChange={(e) =>
                                  handleRoleChange(u.id, e.target.value)
                                }
                                disabled={u.id === user.id}
                                className={
                                  "text-xs font-bold px-2 py-1 rounded-lg border-0 " +
                                  "focus:outline-none cursor-pointer " +
                                  ROLE_CONFIG[u.role]?.color
                                }
                              >
                                <option value="admin">Admin</option>
                                <option value="bde">BDE</option>
                                <option value="teacher">Professeur</option>
                                <option value="student">Étudiant</option>
                              </select>
                            </td>
                            <td className="py-3 px-4 text-gray-400 text-xs whitespace-nowrap">
                              {new Date(u.created_at).toLocaleDateString(
                                "fr-FR",
                              )}
                            </td>
                            <td className="py-3 px-4">
                              {u.id !== user.id && (
                                <button
                                  type="button"
                                  onClick={() => handleDelete(u.id, u.ref)}
                                  className="text-red-400 hover:text-red-600 transition"
                                >
                                  <FontAwesomeIcon icon={faTrash} />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Cartes mobile */}
                  <div className="md:hidden flex flex-col gap-3">
                    {users.map((u) => (
                      <div
                        key={u.id}
                        className="bg-white rounded-2xl shadow-card p-4"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <span className="font-bold text-navy text-sm">
                              {u.ref}
                            </span>
                            <p className="text-xs text-gray-400">
                              {u.prenom} {u.nom}
                            </p>
                          </div>
                          <span
                            className={
                              "text-xs font-bold px-2 py-1 rounded-lg " +
                              ROLE_CONFIG[u.role]?.color
                            }
                          >
                            {ROLE_CONFIG[u.role]?.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mb-1">{u.email}</p>
                        <p className="text-xs text-gray-400 mb-3">
                          Pseudo: {u.pseudo} {u.level ? `· ${u.level}` : ""}
                        </p>
                        <div className="flex gap-2">
                          <select
                            value={u.role}
                            onChange={(e) =>
                              handleRoleChange(u.id, e.target.value)
                            }
                            disabled={u.id === user.id}
                            className="flex-1 input-field text-xs py-1.5"
                          >
                            <option value="student">Étudiant</option>
                            <option value="teacher">Professeur</option>
                            <option value="admin">Admin</option>
                            <option value="bde">BDE</option>
                          </select>
                          {u.id !== user.id && (
                            <button
                              type="button"
                              onClick={() => handleDelete(u.id, u.ref)}
                              className="px-3 py-1.5 bg-red-50 text-red-500
                                         rounded-xl hover:bg-red-100 transition"
                            >
                              <FontAwesomeIcon icon={faTrash} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {users.length === 0 && (
                    <div className="text-center py-16">
                      <p className="text-gray-400 text-sm">
                        Aucun utilisateur trouvé.
                      </p>
                    </div>
                  )}
                </>
              )}
            </>
          )}
          {/* ── TAB INVITATIONS ── */}
          {tab === "invitations" && (
            <div className="flex flex-col gap-3">
              {invitations.length === 0 && (
                <div className="text-center py-16">
                  <FontAwesomeIcon
                    icon={faTicket}
                    className="text-4xl text-gray-300 mb-3"
                  />
                  <p className="text-gray-400 text-sm">
                    Aucune invitation générée. Cliquez sur "Générer une
                    invitation".
                  </p>
                </div>
              )}

              {invitations.map((inv) => {
                const expired = new Date(inv.expires_at) < new Date();
                const isCopied = copiedId === inv.id;
                return (
                  <div
                    key={inv.id}
                    className="bg-white rounded-2xl shadow-card p-4
                                  flex flex-col sm:flex-row sm:items-center gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-mono font-bold text-navy text-lg tracking-widest">
                          {inv.code}
                        </span>
                        {inv.used && (
                          <span
                            className="bg-green-100 text-green-600 text-xs font-bold
                                           px-2 py-0.5 rounded-full"
                          >
                            Utilisé
                          </span>
                        )}
                        {!inv.used && expired && (
                          <span
                            className="bg-red-100 text-red-500 text-xs font-bold
                                           px-2 py-0.5 rounded-full"
                          >
                            Expiré
                          </span>
                        )}
                        {!inv.used && !expired && (
                          <span
                            className="bg-gold/10 text-gold text-xs font-bold
                                           px-2 py-0.5 rounded-full"
                          >
                            Actif
                          </span>
                        )}
                        <span
                          className={
                            "text-xs font-bold px-2 py-0.5 rounded-full " +
                            ROLE_CONFIG[inv.role]?.color
                          }
                        >
                          {ROLE_CONFIG[inv.role]?.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">
                        Expire le{" "}
                        {new Date(inv.expires_at).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {!inv.used && !expired && (
                        <button
                          type="button"
                          onClick={() => handleCopy(inv.id, inv.code)}
                          className={
                            "flex items-center gap-2 px-3 py-2 rounded-xl " +
                            "text-xs font-bold transition " +
                            (isCopied
                              ? "bg-green-100 text-green-600"
                              : "bg-navy/10 text-navy hover:bg-navy/20")
                          }
                        >
                          <FontAwesomeIcon icon={isCopied ? faCheck : faCopy} />
                          {isCopied ? "Copié !" : "Copier"}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDeleteInvitation(inv.id)}
                        className="px-3 py-2 bg-red-50 text-red-400
                                   rounded-xl hover:bg-red-100 transition text-xs"
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {showTop && (
          <button
            type="button"
            onClick={() =>
              mainRef.current?.scrollTo({ top: 0, behavior: "smooth" })
            }
            className="fixed bottom-6 right-6 w-11 h-11 rounded-full bg-navy
               text-white flex items-center justify-center shadow-lg
               hover:bg-gold transition z-50"
            title="Remonter en haut"
          >
            <FontAwesomeIcon icon={faArrowUp} />
          </button>
        )}
      </main>

      {/* Modal générer invitation */}
      {showInvModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-modal p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-navy text-base">
                Nouvelle invitation
              </h3>
              <button
                type="button"
                onClick={() => setShowInvModal(false)}
                className="text-gray-400 hover:text-navy transition"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            <p className="text-sm text-gray-400 mb-4">
              Le code sera valable <strong>7 jours</strong> et ne pourra être
              utilisé qu'une seule fois.
            </p>

            <label className="text-xs font-bold text-gray-500 mb-2 block uppercase tracking-wide">
              Rôle de l'invité
            </label>
            <div className="flex gap-2 mb-6">
              {["student", "teacher"].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setInvRole(r)}
                  className={
                    "flex-1 py-3 rounded-xl text-sm font-bold border transition " +
                    (invRole === r
                      ? "bg-navy text-white border-navy"
                      : "bg-white text-navy border-contact hover:bg-surface")
                  }
                >
                  {ROLE_CONFIG[r].label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleCreateInvitation}
              disabled={invLoading}
              className="btn-primary w-full text-center py-3 disabled:opacity-60"
            >
              {invLoading ? (
                <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
              ) : (
                "Générer le code"
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
