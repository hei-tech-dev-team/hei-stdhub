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
  faGraduationCap,
  faArrowRight,
  faBan,
  faUserPlus,
  faMagic,
  faNewspaper,
  faImage,
} from "@fortawesome/free-solid-svg-icons";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { getSocket } from "../socket";
import Sidebar from "../components/layout/Sidebar";
import { expandRoleFilter } from "../utils/roleFilter";
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
  alumni: {
    label: "Alumni",
    icon: faGraduationCap,
    color: "bg-amber-100 text-amber-700",
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

  // Passage de classe (Septembre)
  const [failedRefs, setFailedRefs] = useState([]);
  const [failedInput, setFailedInput] = useState("");
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [upgradeDone, setUpgradeDone] = useState(false);

  // Nouveaux L1 (Novembre)
  const [newL1, setNewL1] = useState({
    nom: "", prenom: "", email: "", groupChar: "",
  });
  const [generatedRef, setGeneratedRef] = useState("");
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerDone, setRegisterDone] = useState(false);

  // Annonces
  const [annTitle, setAnnTitle] = useState("");
  const [annContent, setAnnContent] = useState("");
  const [annImage, setAnnImage] = useState(null);
  const [annImagePreview, setAnnImagePreview] = useState(null);
  const [annTargetLevel, setAnnTargetLevel] = useState("");
  const [annSubmitting, setAnnSubmitting] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [annLoading, setAnnLoading] = useState(false);

  const now = new Date();
  const month = now.getMonth();
  const currentYear = now.getFullYear().toString().slice(-2);
  const isSeptember = month === 8;
  const isNovember = month === 10;

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
    let cancelled = false;
    const fetchStats = () => {
      api
        .get("/admin/stats")
        .then(({ data }) => { if (!cancelled) setStats(data); })
        .catch(() => {});
    };
    fetchStats();
    const interval = setInterval(fetchStats, 3000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);
  // Modal invitation
  const [showInvModal, setShowInvModal] = useState(false);
  const [invRole, setInvRole] = useState("student");
  const [invMaxUses, setInvMaxUses] = useState(1);
  const [invLoading, setInvLoading] = useState(false);
  const [invError, setInvError] = useState("");

  // Bulk invitation modal
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkRole, setBulkRole] = useState("student");
  const [bulkCount, setBulkCount] = useState(10);
  const [bulkMaxUses, setBulkMaxUses] = useState(1);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError] = useState("");
  const [bulkCodes, setBulkCodes] = useState([]);
  const [allCopied, setAllCopied] = useState(false);

  // Pagination
  const [userPage, setUserPage] = useState(0);
  const [userTotal, setUserTotal] = useState(0);
  const [invPage, setInvPage] = useState(0);
  const [invTotal, setInvTotal] = useState(0);
  const PAGE_SIZE = 50;

  useEffect(() => { setUserPage(0); }, [search, roleFilter]);

  // Charger utilisateurs avec pagination
  const loadUsers = useCallback(() => {
    setLoading(true);
    const params = { limit: PAGE_SIZE, offset: userPage * PAGE_SIZE };
    if (search) params.q = search;
    if (roleFilter) params.role = expandRoleFilter(roleFilter);
    api
      .get("/admin/users", { params })
      .then(({ data }) => {
        setUsers(data.users || data);
        setUserTotal(data.total || 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search, roleFilter, userPage]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Real-time new user registration
  useEffect(() => {
    let socket;
    getSocket()
      .then((s) => {
        socket = s;
        socket.on("user:registered", (newUser) => {
          const { first_login, ...safeUser } = newUser;
          setUsers((prev) => [safeUser, ...prev]);
        });
      })
      .catch(console.error);
    return () => { if (socket) socket.off("user:registered"); };
  }, []);

  // Charger invitations
  const loadInvitations = useCallback(() => {
    api
      .get("/admin/invitations", { params: { limit: PAGE_SIZE, offset: invPage * PAGE_SIZE } })
      .then(({ data }) => {
        setInvitations(data.invitations || data);
        setInvTotal(data.total || 0);
      })
      .catch(console.error);
  }, [invPage]);

  useEffect(() => {
    if (tab === "invitations") loadInvitations();
  }, [tab, loadInvitations]);

  // Charger annonces
  const loadAnnouncements = useCallback(async () => {
    setAnnLoading(true);
    try {
      const { data } = await api.get("/announcements");
      setAnnouncements(data);
    } catch (err) {
      console.error(err);
    } finally {
      setAnnLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "annonces") loadAnnouncements();
  }, [tab, loadAnnouncements]);

  // Changer rôle
  const handleRoleChange = async (userId, newRole) => {
    try {
      const { data } = await api.patch(`/admin/users/${userId}/role`, {
        role: newRole,
      });

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: data.role } : u)),
      );
    } catch (err) {
      console.error("Erreur:", err.response?.data);
    }
  };

  // Modifier email
  const [editingEmailId, setEditingEmailId] = useState(null);
  const [editEmailValue, setEditEmailValue] = useState("");

  const handleEmailSave = async (userId) => {
    try {
      const { data } = await api.patch(`/admin/users/${userId}/email`, {
        email: editEmailValue,
      });
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, email: data.email } : u)),
      );
      setEditingEmailId(null);
    } catch (err) {
      alert(err.response?.data?.error || "Erreur lors de la modification.");
    }
  };

  // Supprimer utilisateur
  const handleDelete = async (userId, ref) => {
    if (!confirm(`Supprimer ${ref} ? Cette action est irréversible.`)) return;
    try {
      await api.delete(`/admin/users/${userId}`);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      api.get("/admin/stats").then(({ data }) => setStats(data)).catch(console.error);
    } catch (err) {
      console.error(err);
    }
  };

  // Créer invitation
  const handleCreateInvitation = async () => {
    setInvLoading(true);
    setInvError("");
    try {
      const { data } = await api.post("/admin/invitations", { role: invRole, max_uses: invMaxUses });
      setInvitations((prev) => [data, ...prev]);
      setShowInvModal(false);
      setTab("invitations");
    } catch (err) {
      setInvError(err.response?.data?.error || "Erreur lors de la création.");
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

  // Passage de classe
  const handleAddFailedRef = () => {
    const ref = failedInput.trim().toUpperCase();
    if (!ref) return;
    if (failedRefs.includes(ref)) return;
    setFailedRefs((prev) => [...prev, ref]);
    setFailedInput("");
  };

  const handleRemoveFailedRef = (ref) => {
    setFailedRefs((prev) => prev.filter((r) => r !== ref));
  };

  const handleUpgrade = async () => {
    setUpgradeLoading(true);
    try {
      await api.post("/admin/class-upgrade", { failed_refs: failedRefs });
      setUpgradeDone(true);
      setFailedRefs([]);
      loadUsers();
    } catch (err) {
      console.error(err);
    } finally {
      setUpgradeLoading(false);
    }
  };

  // Nouveaux L1
  const getGroupFromChar = (char) => {
    const c = char.toUpperCase();
    if (!c) return "";
    const groups = ["X1", "X2", "X3", "X4"];
    const index = c.charCodeAt(0) - 65;
    return groups[index % groups.length];
  };

  const handleRegisterL1 = async (e) => {
    e.preventDefault();
    if (!newL1.nom.trim() || !newL1.prenom.trim() || !newL1.email.trim() || !newL1.groupChar.trim() || !generatedRef.trim()) return;
    setRegisterLoading(true);
    try {
      const group = getGroupFromChar(newL1.groupChar);
      await api.post("/auth/register", {
        nom: newL1.nom.trim(),
        prenom: newL1.prenom.trim(),
        email: newL1.email.trim(),
        ref: generatedRef.trim().toUpperCase(),
        pseudo: `${newL1.prenom.trim()}.${newL1.nom.trim()}`,
        password: generatedRef.trim().toUpperCase(),
        role: "student",
        level: "L1",
        groupe: group,
      });
      setRegisterDone(true);
      setNewL1({ nom: "", prenom: "", email: "", groupChar: "" });
      setGeneratedRef("");
    } catch (err) {
      console.error(err);
    } finally {
      setRegisterLoading(false);
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
          <div className="mb-6 text-center">
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
          <div className="flex items-center justify-between gap-2 mb-5 flex-wrap">
            <div className="flex gap-2 flex-wrap">
              {[
                { key: "users", label: "Utilisateurs" },
                { key: "invitations", label: "Invitations" },
                { key: "annonces", label: "Annonces" },
                ...(isSeptember
                  ? [{ key: "upgrade", label: "Passage de classe" }]
                  : []),
                ...(isNovember ? [{ key: "new-l1", label: "Nouveaux L1" }] : []),
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
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowInvModal(true)}
                className="bg-white/70 backdrop-blur-xl border border-white/50 shadow-sm hover:bg-white/90 rounded-full px-5 py-2.5 text-sm font-semibold text-navy transition-all duration-200 cursor-pointer flex items-center gap-2"
              >
                <FontAwesomeIcon icon={faPlus} />
                <span className="hidden sm:inline">Générer une invitation</span>
              </button>
              <button
                type="button"
                onClick={() => setShowBulkModal(true)}
                className="bg-white/50 backdrop-blur-xl border border-white/30 shadow-sm hover:bg-white/80 rounded-full px-5 py-2.5 text-sm font-semibold text-gray-600 transition-all duration-200 cursor-pointer flex items-center gap-2"
              >
                <FontAwesomeIcon icon={faMagic} />
                <span className="hidden sm:inline">Génération multiple</span>
              </button>
            </div>
          </div>
          {/* Tab: Users */}
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
                  <option value="alumni">Alumni</option>
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
                              {editingEmailId === u.id ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="email"
                                    value={editEmailValue}
                                    onChange={(e) => setEditEmailValue(e.target.value)}
                                    className="input-field text-xs py-1 px-2 w-44"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") handleEmailSave(u.id);
                                      if (e.key === "Escape") setEditingEmailId(null);
                                    }}
                                  />
                                  <button
                                    onClick={() => handleEmailSave(u.id)}
                                    className="text-green-500 hover:text-green-600 px-1"
                                  >
                                    <FontAwesomeIcon icon={faCheck} size="xs" />
                                  </button>
                                  <button
                                    onClick={() => setEditingEmailId(null)}
                                    className="text-red-400 hover:text-red-500 px-1"
                                  >
                                    <FontAwesomeIcon icon={faTimes} size="xs" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    setEditingEmailId(u.id);
                                    setEditEmailValue(u.email);
                                  }}
                                  className="hover:text-navy transition text-left"
                                >
                                  {u.email}
                                </button>
                              )}
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
                                <option value="alumni">Alumni</option>
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
                        <p className="text-xs text-gray-400 mb-1">
                          {editingEmailId === u.id ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="email"
                                value={editEmailValue}
                                onChange={(e) => setEditEmailValue(e.target.value)}
                                className="input-field text-xs py-1 px-2 w-40"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleEmailSave(u.id);
                                  if (e.key === "Escape") setEditingEmailId(null);
                                }}
                              />
                              <button onClick={() => handleEmailSave(u.id)} className="text-green-500 text-xs">
                                <FontAwesomeIcon icon={faCheck} />
                              </button>
                              <button onClick={() => setEditingEmailId(null)} className="text-red-400 text-xs">
                                <FontAwesomeIcon icon={faTimes} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingEmailId(u.id);
                                setEditEmailValue(u.email);
                              }}
                              className="hover:text-navy transition text-left"
                            >
                              {u.email}
                            </button>
                          )}
                        </p>
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
                            <option value="alumni">Alumni</option>
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

                  {/* Pagination */}
                  {userTotal > PAGE_SIZE && (
                    <div className="flex items-center justify-center gap-4 py-4">
                      <button
                        type="button"
                        disabled={userPage === 0}
                        onClick={() => setUserPage((p) => Math.max(0, p - 1))}
                        className="px-4 py-2 rounded-xl text-sm font-bold bg-navy/10 text-navy hover:bg-navy/20 disabled:opacity-30 transition"
                      >
                        Précédent
                      </button>
                      <span className="text-sm text-gray-500">
                        Page {userPage + 1} / {Math.ceil(userTotal / PAGE_SIZE)}
                        ({userTotal} total)
                      </span>
                      <button
                        type="button"
                        disabled={(userPage + 1) * PAGE_SIZE >= userTotal}
                        onClick={() => setUserPage((p) => p + 1)}
                        className="px-4 py-2 rounded-xl text-sm font-bold bg-navy/10 text-navy hover:bg-navy/20 disabled:opacity-30 transition"
                      >
                        Suivant
                      </button>
                    </div>
                  )}

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
          {/* Tab: Passage de classe (Septembre) */}
          {tab === "upgrade" && (
            <div className="bg-white rounded-2xl shadow-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                  <FontAwesomeIcon icon={faGraduationCap} className="text-lg" />
                </div>
                <div>
                  <h2 className="font-bold text-navy text-base">
                    Passage de classe — Septembre {now.getFullYear()}
                  </h2>
                  <p className="text-xs text-gray-400">
                    Saisissez les étudiants qui{" "}
                    <strong className="text-red-500">ne passent pas</strong>{" "}
                    dans la classe supérieure. Tous les autres seront
                    automatiquement promus.
                  </p>
                </div>
              </div>

              {upgradeDone && (
                <div className="bg-green-50 border border-green-200 text-green-600 text-sm px-4 py-3 rounded-xl mb-4 flex items-center gap-2">
                  <FontAwesomeIcon icon={faCheck} />
                  Passage de classe effectué avec succès !
                </div>
              )}

              <div className="flex items-center gap-2 mb-4">
                <input
                  className="input-field flex-1 font-mono uppercase"
                  placeholder="Référence STD (ex: STD25001)"
                  value={failedInput}
                  onChange={(e) => setFailedInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddFailedRef();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddFailedRef}
                  className="btn-primary"
                >
                  <FontAwesomeIcon icon={faBan} className="text-sm" />
                </button>
              </div>

              {failedRefs.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                    Étudiants en échec ({failedRefs.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {failedRefs.map((ref) => (
                      <span
                        key={ref}
                        className="inline-flex items-center gap-1.5 bg-red-50 text-red-600 text-xs font-bold px-3 py-1.5 rounded-full"
                      >
                        {ref}
                        <button
                          type="button"
                          onClick={() => handleRemoveFailedRef(ref)}
                          className="hover:text-red-800"
                        >
                          <FontAwesomeIcon icon={faTimes} size="xs" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-4">
                <p className="text-xs text-blue-700">
                  <FontAwesomeIcon icon={faArrowRight} className="mr-1" />
                  Les étudiants <strong>L3</strong> qui passent deviendront{" "}
                  <strong>AlumniHEI</strong>.
                  <br />
                  Les étudiants <strong>L1</strong> passeront en <strong>L2</strong>, les <strong>L2</strong> en <strong>L3</strong>.
                </p>
              </div>

              <button
                type="button"
                onClick={handleUpgrade}
                disabled={upgradeLoading}
                className="btn-primary flex items-center gap-2 disabled:opacity-60"
              >
                {upgradeLoading ? (
                  <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                ) : (
                  <FontAwesomeIcon icon={faArrowRight} />
                )}
                Valider le passage de classe
              </button>
            </div>
          )}

          {/* Tab: Nouveaux L1 (Novembre) */}
          {tab === "new-l1" && (
            <div className="bg-white rounded-2xl shadow-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-green-100 text-green-600 flex items-center justify-center">
                  <FontAwesomeIcon icon={faUserPlus} className="text-lg" />
                </div>
                <div>
                  <h2 className="font-bold text-navy text-base">
                    Nouveaux étudiants L1 — STD{currentYear}XXX
                  </h2>
                  <p className="text-xs text-gray-400">
                    Inscrivez les nouveaux étudiants de première année. La
                    référence est saisie manuellement (ex: STD26001).
                  </p>
                </div>
              </div>

              {registerDone && (
                <div className="bg-green-50 border border-green-200 text-green-600 text-sm px-4 py-3 rounded-xl mb-4 flex items-center gap-2">
                  <FontAwesomeIcon icon={faCheck} />
                  Étudiant inscrit avec succès !
                </div>
              )}

              <form onSubmit={handleRegisterL1} className="flex flex-col gap-4 max-w-lg">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-1 block uppercase tracking-wide">
                      Prénom
                    </label>
                    <input
                      className="input-field"
                      placeholder="Jean"
                      value={newL1.prenom}
                      onChange={(e) =>
                        setNewL1((prev) => ({ ...prev, prenom: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-1 block uppercase tracking-wide">
                      Nom
                    </label>
                    <input
                      className="input-field"
                      placeholder="Rakoto"
                      value={newL1.nom}
                      onChange={(e) =>
                        setNewL1((prev) => ({ ...prev, nom: e.target.value }))
                      }
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block uppercase tracking-wide">
                    Email HEI
                  </label>
                  <input
                    type="email"
                    className="input-field"
                    placeholder="hei.jean@gmail.com"
                    value={newL1.email}
                    onChange={(e) =>
                      setNewL1((prev) => ({ ...prev, email: e.target.value }))
                    }
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block uppercase tracking-wide">
                    Référence STD (saisie manuelle)
                  </label>
                  <input
                    className="input-field font-mono tracking-widest uppercase"
                    placeholder={`STD${currentYear}001`}
                    value={generatedRef}
                    onChange={(e) => setGeneratedRef(e.target.value)}
                    required
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Saisissez la référence selon le rang d&apos;entrée (ex: STD26001, STD26002…).
                  </p>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block uppercase tracking-wide">
                    Caractère de groupe
                  </label>
                  <input
                    className="input-field max-w-[120px] text-center text-lg font-bold tracking-widest uppercase"
                    placeholder="A"
                    maxLength={1}
                    value={newL1.groupChar}
                    onChange={(e) =>
                      setNewL1((prev) => ({
                        ...prev,
                        groupChar: e.target.value,
                      }))
                    }
                    required
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Saisissez une lettre (A-Z). Le groupe sera déterminé
                    automatiquement :{" "}
                    <strong className="text-navy">
                      {newL1.groupChar
                        ? `${newL1.groupChar.toUpperCase()} → ${getGroupFromChar(newL1.groupChar)}`
                        : "ex: A → X1, B → X2, C → X3"}
                    </strong>
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={registerLoading || !generatedRef.trim()}
                  className="btn-primary flex items-center gap-2 disabled:opacity-60 mt-2"
                >
                  {registerLoading ? (
                    <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                  ) : (
                    <FontAwesomeIcon icon={faMagic} />
                  )}
                  Inscrire l'étudiant
                </button>
              </form>
            </div>
          )}

          {/* Tab: Invitations */}
          {tab === "invitations" && (
            <div className="flex flex-col gap-3">
              {/* Pagination */}
              {invTotal > PAGE_SIZE && (
                <div className="flex items-center justify-center gap-4">
                  <button
                    type="button"
                    disabled={invPage === 0}
                    onClick={() => setInvPage((p) => Math.max(0, p - 1))}
                    className="px-4 py-2 rounded-xl text-sm font-bold bg-navy/10 text-navy hover:bg-navy/20 disabled:opacity-30 transition"
                  >
                    Précédent
                  </button>
                  <span className="text-sm text-gray-500">
                    Page {invPage + 1} / {Math.ceil(invTotal / PAGE_SIZE)}
                    ({invTotal} total)
                  </span>
                  <button
                    type="button"
                    disabled={(invPage + 1) * PAGE_SIZE >= invTotal}
                    onClick={() => setInvPage((p) => p + 1)}
                    className="px-4 py-2 rounded-xl text-sm font-bold bg-navy/10 text-navy hover:bg-navy/20 disabled:opacity-30 transition"
                  >
                    Suivant
                  </button>
                </div>
              )}

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
                const multi = inv.max_uses > 1;
                const full = inv.use_count >= inv.max_uses;
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
                        {full && !expired && (
                          <span
                            className="bg-gray-200 text-gray-600 text-xs font-bold
                                           px-2 py-0.5 rounded-full"
                          >
                            Épuisé
                          </span>
                        )}
                        {!full && expired && (
                          <span
                            className="bg-red-100 text-red-500 text-xs font-bold
                                           px-2 py-0.5 rounded-full"
                          >
                            Expiré
                          </span>
                        )}
                        {!full && !expired && (
                          <span
                            className="bg-gold/10 text-gold text-xs font-bold
                                           px-2 py-0.5 rounded-full"
                          >
                            Actif
                          </span>
                        )}
                        {multi && (
                          <span
                            className="bg-blue-100 text-blue-700 text-xs font-bold
                                           px-2 py-0.5 rounded-full"
                          >
                            {inv.use_count}/{inv.max_uses}
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
                        {multi
                          ? `${inv.use_count} utilisés sur ${inv.max_uses} — expire le `
                          : "Expire le "}
                        {new Date(inv.expires_at).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {!full && !expired && (
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

          {/* Tab: Annonces */}
          {tab === "annonces" && (
            <div className="flex flex-col gap-4">
              {/* Composer */}
              <div className="bg-white rounded-2xl shadow-card p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-navy/10 text-navy flex items-center justify-center">
                    <FontAwesomeIcon icon={faNewspaper} className="text-lg" />
                  </div>
                  <div>
                    <h2 className="font-bold text-navy text-base">Publier une annonce</h2>
                    <p className="text-xs text-gray-400">Visible par tous les utilisateurs</p>
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <input
                    className="input-field"
                    placeholder="Titre de l'annonce"
                    value={annTitle}
                    onChange={(e) => setAnnTitle(e.target.value)}
                  />
                  <textarea
                    className="input-field min-h-[100px] resize-y"
                    placeholder="Contenu de l'annonce..."
                    value={annContent}
                    onChange={(e) => setAnnContent(e.target.value)}
                  />
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface text-navy text-sm font-bold hover:bg-navy/10 transition cursor-pointer">
                      <FontAwesomeIcon icon={faImage} />
                      {annImage ? "Changer l'image" : "Ajouter une image"}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            setAnnImage(file);
                            setAnnImagePreview(URL.createObjectURL(file));
                          }
                        }}
                      />
                    </label>
                    {annImage && (
                      <button
                        type="button"
                        onClick={() => { setAnnImage(null); setAnnImagePreview(null); }}
                        className="text-red-400 hover:text-red-600 text-sm font-bold"
                      >
                        <FontAwesomeIcon icon={faTimes} className="mr-1" />
                        Retirer
                      </button>
                    )}
                  </div>
                  {annImagePreview && (
                    <img src={annImagePreview} alt="Aperçu" className="w-full max-h-48 object-cover rounded-xl" />
                  )}

                  {/* Level selector */}
                  <div>
                    <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">
                      <FontAwesomeIcon icon={faUsers} className="mr-1" />
                      Visible par
                    </p>
                    <div className="flex gap-2">
                      {["Tous", "L1", "L2", "L3"].map((l) => (
                        <button
                          key={l}
                          type="button"
                          onClick={() => setAnnTargetLevel(l === "Tous" ? "" : l)}
                          className={
                            "px-4 py-1.5 rounded-full text-xs font-bold transition " +
                            ((l === "Tous" && !annTargetLevel) || annTargetLevel === l
                              ? "bg-navy text-white shadow-sm"
                              : "bg-white border border-contact text-navy hover:border-navy")
                          }
                        >
                          {l === "Tous" ? "Tout le monde" : l}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={async () => {
                      if (!annTitle.trim() || !annContent.trim()) return;
                      setAnnSubmitting(true);
                      try {
                        const form = new FormData();
                        form.append("title", annTitle.trim());
                        form.append("content", annContent.trim());
                        form.append("target_level", annTargetLevel || "");
                        if (annImage) form.append("image", annImage);
                        await api.post("/announcements", form, {
                          headers: { "Content-Type": "multipart/form-data" },
                        });
                        setAnnTitle("");
                        setAnnContent("");
                        setAnnImage(null);
                        setAnnImagePreview(null);
                        setAnnTargetLevel("");
                        loadAnnouncements();
                      } catch (err) {
                        console.error(err);
                      } finally {
                        setAnnSubmitting(false);
                      }
                    }}
                    disabled={annSubmitting || !annTitle.trim() || !annContent.trim()}
                    className="btn-primary self-start flex items-center gap-2 disabled:opacity-60"
                  >
                    {annSubmitting ? (
                      <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                    ) : (
                      <FontAwesomeIcon icon={faNewspaper} />
                    )}
                    Publier
                  </button>
                </div>
              </div>

              {/* Existing announcements */}
              <div>
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">
                  Annonces publiées ({announcements.length})
                </h3>
                {annLoading && (
                  <div className="flex justify-center py-8">
                    <FontAwesomeIcon icon={faSpinner} className="text-navy text-2xl animate-spin" />
                  </div>
                )}
                {!annLoading && announcements.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-400 text-sm">Aucune annonce publiée.</p>
                  </div>
                )}
                <div className="flex flex-col gap-3">
                  {announcements.map((ann) => (
                    <div key={ann.id} className="bg-white rounded-2xl shadow-card p-4 flex items-start gap-4">
                      {ann.image_url && (
                        <img src={ann.image_url} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-navy text-sm truncate">
                        {ann.title}
                        {ann.target_level && (
                          <span className={"ml-2 text-xs font-bold px-2 py-0.5 rounded-full " + ({
                            L1: "bg-cyan-100 text-cyan-700",
                            L2: "bg-emerald-100 text-emerald-700",
                            L3: "bg-amber-100 text-amber-700",
                          }[ann.target_level] || "bg-gray-100 text-gray-600")}>
                            {ann.target_level}
                          </span>
                        )}
                      </h4>
                      <p className="text-xs text-gray-400 line-clamp-2 mt-1">{ann.content}</p>
                        <p className="text-xs text-gray-300 mt-1">
                          {new Date(ann.created_at).toLocaleDateString("fr-FR")}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!confirm("Supprimer cette annonce ?")) return;
                          try {
                            await api.delete(`/announcements/${ann.id}`);
                            loadAnnouncements();
                          } catch (err) {
                            console.error(err);
                          }
                        }}
                        className="text-red-400 hover:text-red-600 transition shrink-0"
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
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
              Le code sera valable <strong>14 jours</strong>.
            </p>

            {invError && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl mb-4 flex items-center gap-2">
                {invError}
              </div>
            )}

            <label className="text-xs font-bold text-gray-500 mb-2 block uppercase tracking-wide">
              Rôle de l'invité
            </label>
            <div className="flex gap-2 mb-6">
              {["student", "teacher", "alumni"].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => { setInvRole(r); setInvError(""); }}
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

            <label className="text-xs font-bold text-gray-500 mb-2 block uppercase tracking-wide">
              Utilisations max
            </label>
            <input
              type="number"
              className="input-field mb-6"
              min={1}
              max={10000}
              value={invMaxUses}
              onChange={(e) => setInvMaxUses(Math.max(1, parseInt(e.target.value) || 1))}
            />

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

      {/* Modal génération multiple */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-modal p-6 w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-navy text-base">
                Génération multiple d'invitations
              </h3>
              <button
                type="button"
                onClick={() => { setShowBulkModal(false); setBulkCodes([]); setAllCopied(false); }}
                className="text-gray-400 hover:text-navy transition"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            {bulkCodes.length === 0 ? (
              <>
                <p className="text-sm text-gray-400 mb-4">
                  Générez jusqu'à <strong>1 000 codes</strong> en une seule fois.
                  Chaque code sera valable <strong>14 jours</strong>.
                </p>

                {bulkError && (
                  <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl mb-4">
                    {bulkError}
                  </div>
                )}

                <label className="text-xs font-bold text-gray-500 mb-2 block uppercase tracking-wide">
                  Rôle des invités
                </label>
                <div className="flex gap-2 mb-4">
                  {["student", "teacher", "alumni"].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => { setBulkRole(r); setBulkError(""); }}
                      className={
                        "flex-1 py-3 rounded-xl text-sm font-bold border transition " +
                        (bulkRole === r
                          ? "bg-navy text-white border-navy"
                          : "bg-white text-navy border-contact hover:bg-surface")
                      }
                    >
                      {ROLE_CONFIG[r].label}
                    </button>
                  ))}
                </div>

                <label className="text-xs font-bold text-gray-500 mb-2 block uppercase tracking-wide">
                  Nombre de codes
                </label>
                <input
                  type="number"
                  className="input-field mb-4"
                  min={1}
                  max={1000}
                  value={bulkCount}
                  onChange={(e) => setBulkCount(Math.min(1000, Math.max(1, parseInt(e.target.value) || 1)))}
                />

                <label className="text-xs font-bold text-gray-500 mb-2 block uppercase tracking-wide">
                  Utilisations max par code
                </label>
                <input
                  type="number"
                  className="input-field mb-6"
                  min={1}
                  max={10000}
                  value={bulkMaxUses}
                  onChange={(e) => setBulkMaxUses(Math.max(1, parseInt(e.target.value) || 1))}
                />

                <button
                  type="button"
                  onClick={async () => {
                    setBulkLoading(true);
                    setBulkError("");
                    try {
                      const { data } = await api.post("/admin/invitations/bulk", {
                        role: bulkRole,
                        count: bulkCount,
                        max_uses: bulkMaxUses,
                      });
                      setBulkCodes(data.codes);
                      loadInvitations();
                    } catch (err) {
                      setBulkError(err.response?.data?.error || "Erreur lors de la génération.");
                    } finally {
                      setBulkLoading(false);
                    }
                  }}
                  disabled={bulkLoading}
                  className="btn-primary w-full text-center py-3 disabled:opacity-60"
                >
                  {bulkLoading ? (
                    <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                  ) : (
                    `Générer ${bulkCount} code${bulkCount > 1 ? "s" : ""}`
                  )}
                </button>
              </>
            ) : (
              <>
                <div className="bg-green-50 border border-green-200 text-green-600 text-sm px-4 py-3 rounded-xl mb-4 flex items-center gap-2">
                  <FontAwesomeIcon icon={faCheck} />
                  {bulkCodes.length} code{bulkCodes.length > 1 ? "s" : ""} généré{bulkCodes.length > 1 ? "s" : ""} avec succès
                </div>

                <div className="flex-1 overflow-y-auto mb-4 space-y-2">
                  {bulkCodes.map((inv) => (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between bg-surface rounded-xl px-4 py-3"
                    >
                      <span className="font-mono font-bold text-navy tracking-widest text-sm">
                        {inv.code}
                      </span>
                      <span className={"text-xs font-bold px-2 py-0.5 rounded-full " + ROLE_CONFIG[inv.role]?.color}>
                        {ROLE_CONFIG[inv.role]?.label}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const text = bulkCodes.map((i) => i.code).join("\n");
                      navigator.clipboard.writeText(text);
                      setAllCopied(true);
                      setTimeout(() => setAllCopied(false), 2000);
                    }}
                    className={"flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition " + (allCopied ? "bg-green-100 text-green-600" : "bg-navy/10 text-navy hover:bg-navy/20")}
                  >
                    <FontAwesomeIcon icon={allCopied ? faCheck : faCopy} />
                    {allCopied ? "Tous copiés !" : "Copier tous les codes"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setBulkCodes([]); setAllCopied(false); }}
                    className="flex-1 py-3 rounded-xl text-sm font-bold bg-white text-navy border border-contact hover:bg-surface transition"
                  >
                    Générer encore
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
