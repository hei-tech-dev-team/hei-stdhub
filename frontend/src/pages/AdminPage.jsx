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
} from "@fortawesome/free-solid-svg-icons";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
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
    if (roleFilter) params.role = expandRoleFilter(roleFilter);
    api
      .get("/admin/users", { params })
      .then(({ data }) => setUsers(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search, roleFilter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
          <div className="flex gap-2 mb-5 flex-wrap">
            {[
              { key: "users", label: "Utilisateurs" },
              { key: "invitations", label: "Invitations" },
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
              {["student", "teacher", "alumni"].map((r) => (
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
