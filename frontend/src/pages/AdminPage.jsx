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
  faUserCog,
  faEnvelope,
  faKey,
  faCheckCircle,
  faExclamationTriangle,
  faAngleLeft,
  faAngleRight,
  faDownload,
  faLink,
  faEye,
  faEyeSlash,
} from "@fortawesome/free-solid-svg-icons";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { getSocket } from "../socket";
import Sidebar from "../components/layout/Sidebar";
import { expandRoleFilter } from "../utils/roleFilter";

const ROLE_CONFIG = {
  student: { label: "Étudiant", icon: faUserGraduate, color: "bg-cyan-100 text-cyan-700 border-cyan-200" },
  teacher: { label: "Professeur", icon: faChalkboardTeacher, color: "bg-purple-100 text-purple-700 border-purple-200" },
  admin: { label: "Admin", icon: faUserShield, color: "bg-red-100 text-red-700 border-red-200" },
  bde: { label: "BDE", icon: faUsers, color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  alumni: { label: "Alumni", icon: faGraduationCap, color: "bg-amber-100 text-amber-700 border-amber-200" },
};

const LEVEL_COLORS = {
  L1: "bg-cyan-100 text-cyan-700",
  L2: "bg-violet-100 text-violet-700",
  L3: "bg-amber-100 text-amber-700",
};

const TABS = [
  { key: "users", label: "Utilisateurs", icon: faUsers },
  { key: "invitations", label: "Invitations", icon: faTicket },
  { key: "annonces", label: "Annonces", icon: faNewspaper },
];

function StatCard({ icon, label, value, color, trend }) {
  return (
    <div className="bg-white rounded-2xl shadow-card p-5 flex items-center gap-4 group hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color} transition-transform duration-300 group-hover:scale-110`}>
        <FontAwesomeIcon icon={icon} className="text-lg" />
      </div>
      <div>
        <p className="text-2xl font-bold text-navy">{value ?? "—"}</p>
        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">{label}</p>
      </div>
    </div>
  );
}

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  const colors = {
    success: "bg-green-50 border-green-200 text-green-700",
    error: "bg-red-50 border-red-200 text-red-700",
    info: "bg-blue-50 border-blue-200 text-blue-700",
  };

  const icons = {
    success: faCheckCircle,
    error: faExclamationTriangle,
    info: faEnvelope,
  };

  return (
    <div className={`fixed top-4 right-4 z-[100] flex items-center gap-3 px-5 py-3 rounded-2xl border shadow-lg animate-slide-up ${colors[type] || colors.info}`}>
      <FontAwesomeIcon icon={icons[type] || icons.info} />
      <p className="text-sm font-medium">{message}</p>
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100 transition">
        <FontAwesomeIcon icon={faTimes} className="text-xs" />
      </button>
    </div>
  );
}

function ConfirmModal({ open, title, message, confirmLabel, confirmColor, icon, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-[0_8px_32px_0_rgba(0,25,72,0.16)] p-6 w-full max-w-sm animate-slide-up">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 ${confirmColor === "red" ? "bg-red-50" : "bg-navy/10"}`}>
          <FontAwesomeIcon icon={icon || faExclamationTriangle} className={`text-xl ${confirmColor === "red" ? "text-red-500" : "text-navy"}`} />
        </div>
        <h3 className="font-bold text-navy text-center text-base mb-2">{title}</h3>
        <p className="text-gray-400 text-sm text-center mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="btn-primary flex-1"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`${confirmColor === "red" ? "btn-danger" : "btn-primary"} flex-1`}
          >
            {confirmLabel || "Confirmer"}
          </button>
        </div>
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

  const [failedL1Refs, setFailedL1Refs] = useState([]);
  const [failedL1Input, setFailedL1Input] = useState("");
  const [failedL2Refs, setFailedL2Refs] = useState([]);
  const [failedL2Input, setFailedL2Input] = useState("");
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [upgradeDone, setUpgradeDone] = useState(false);
  const [alumniLoading, setAlumniLoading] = useState(false);
  const [alumniDone, setAlumniDone] = useState(false);

  const [newL1, setNewL1] = useState({
    nom: "", prenom: "", email: "", groupLetter: "",
  });
  const [generatedRef, setGeneratedRef] = useState("STD2");
  const [letterError, setLetterError] = useState("");
  const [emailError, setEmailError] = useState("");

  useEffect(() => {
    if (newL1.prenom.trim() && newL1.nom.trim()) {
      const autoEmail = `hei.${newL1.prenom.trim().toLowerCase()}.${newL1.nom.trim().toLowerCase()}@gmail.com`;
      setNewL1((prev) => ({ ...prev, email: autoEmail }));
    }
  }, [newL1.prenom, newL1.nom]);

  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerDone, setRegisterDone] = useState(false);

  const [annTitle, setAnnTitle] = useState("");
  const [annContent, setAnnContent] = useState("");
  const [annImage, setAnnImage] = useState(null);
  const [annImagePreview, setAnnImagePreview] = useState(null);
  const [annTargetLevel, setAnnTargetLevel] = useState("");
  const [annSubmitting, setAnnSubmitting] = useState(false);
  const [announcements, setAnnouncements] = useState([]);
  const [annLoading, setAnnLoading] = useState(false);

  const [toast, setToast] = useState(null);

  const now = new Date();
  const month = now.getMonth();
  const currentYear = now.getFullYear().toString().slice(-2);
  const isSeptember = month === 8;
  const isNovember = month === 10;

  const mainRef = useRef();

  useEffect(() => {
    const handleScroll = () => {
      setShowTop(mainRef.current?.scrollTop > 300);
    };
    const mainEl = mainRef.current;
    if (mainEl) {
      mainEl.addEventListener("scroll", handleScroll);
      return () => mainEl.removeEventListener("scroll", handleScroll);
    }
  }, []);

  useEffect(() => {
    const fetchStats = () => {
      api.get("/admin/stats").then(({ data }) => setStats(data)).catch(() => {});
    };
    fetchStats();
    const interval = setInterval(fetchStats, 3000);
    return () => clearInterval(interval);
  }, []);

  const [showInvModal, setShowInvModal] = useState(false);
  const [invRole, setInvRole] = useState("student");
  const [invMaxUses, setInvMaxUses] = useState(1);
  const [invLoading, setInvLoading] = useState(false);
  const [invError, setInvError] = useState("");

  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkRole, setBulkRole] = useState("student");
  const [bulkCount, setBulkCount] = useState(10);
  const [bulkMaxUses, setBulkMaxUses] = useState(1);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError] = useState("");
  const [bulkCodes, setBulkCodes] = useState([]);
  const [allCopied, setAllCopied] = useState(false);

  const [userPage, setUserPage] = useState(0);
  const [userTotal, setUserTotal] = useState(0);
  const [invPage, setInvPage] = useState(0);
  const [invTotal, setInvTotal] = useState(0);
  const PAGE_SIZE = 50;

  const [confirmState, setConfirmState] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type, id: Date.now() });
  };

  useEffect(() => { setUserPage(0); }, [search, roleFilter]);

  const loadUsers = useCallback(() => {
    setLoading(true);
    const params = { limit: PAGE_SIZE, offset: userPage * PAGE_SIZE };
    if (search) params.q = search;
    if (roleFilter) params.role = expandRoleFilter(roleFilter);
    api.get("/admin/users", { params })
      .then(({ data }) => {
        setUsers(data.users || data);
        setUserTotal(data.total || 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search, roleFilter, userPage]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  useEffect(() => {
    getSocket().then((socket) => {
      socket.on("user:registered", (newUser) => {
        const { first_login, ...safeUser } = newUser;
        setUsers((prev) => [safeUser, ...prev]);
      });
    }).catch(console.error);
  }, []);

  const loadInvitations = useCallback(() => {
    api.get("/admin/invitations", { params: { limit: PAGE_SIZE, offset: invPage * PAGE_SIZE } })
      .then(({ data }) => {
        setInvitations(data.invitations || data);
        setInvTotal(data.total || 0);
      })
      .catch(console.error);
  }, [invPage]);

  useEffect(() => {
    if (tab === "invitations") loadInvitations();
  }, [tab, loadInvitations]);

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

  const handleRoleChange = async (userId, newRole) => {
    try {
      const { data } = await api.patch(`/admin/users/${userId}/role`, { role: newRole });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: data.role } : u)));
      showToast(`Rôle modifié → ${ROLE_CONFIG[data.role]?.label}`);
    } catch (err) {
      showToast(err.response?.data?.error || "Erreur lors du changement de rôle", "error");
    }
  };

  const [editingEmailId, setEditingEmailId] = useState(null);
  const [editEmailValue, setEditEmailValue] = useState("");

  const handleEmailSave = async (userId) => {
    try {
      const { data } = await api.patch(`/admin/users/${userId}/email`, { email: editEmailValue });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, email: data.email } : u)));
      setEditingEmailId(null);
      showToast("Email modifié avec succès");
    } catch (err) {
      showToast(err.response?.data?.error || "Erreur lors de la modification", "error");
    }
  };

  const handleDelete = async (userId, ref) => {
    try {
      await api.delete(`/admin/users/${userId}`);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      api.get("/admin/stats").then(({ data }) => setStats(data)).catch(console.error);
      showToast(`${ref} supprimé`);
    } catch (err) {
      showToast("Erreur lors de la suppression", "error");
    }
  };

  const handleCreateInvitation = async () => {
    setInvLoading(true);
    setInvError("");
    try {
      const { data } = await api.post("/admin/invitations", { role: invRole, max_uses: invMaxUses });
      setInvitations((prev) => [data, ...prev]);
      setShowInvModal(false);
      setTab("invitations");
      showToast("Code d'invitation généré !");
    } catch (err) {
      setInvError(err.response?.data?.error || "Erreur lors de la création.");
    } finally {
      setInvLoading(false);
    }
  };

  const handleDeleteInvitation = async (id) => {
    try {
      await api.delete(`/admin/invitations/${id}`);
      setInvitations((prev) => prev.filter((i) => i.id !== id));
      showToast("Invitation supprimée");
    } catch (err) {
      showToast("Erreur lors de la suppression", "error");
    }
  };

  const handleAddFailedRef = (level) => {
    const input = level === "L1" ? failedL1Input : failedL2Input;
    const setInput = level === "L1" ? setFailedL1Input : setFailedL2Input;
    const setRefs = level === "L1" ? setFailedL1Refs : setFailedL2Refs;
    const refs = level === "L1" ? failedL1Refs : failedL2Refs;
    const ref = input.trim().toUpperCase();
    if (!ref) return;
    if (refs.includes(ref)) return;
    setRefs((prev) => [...prev, ref]);
    setInput("");
  };

  const handleRemoveFailedRef = (level, ref) => {
    if (level === "L1") {
      setFailedL1Refs((prev) => prev.filter((r) => r !== ref));
    } else {
      setFailedL2Refs((prev) => prev.filter((r) => r !== ref));
    }
  };

  const handleUpgrade = async () => {
    setUpgradeLoading(true);
    try {
      await api.post("/admin/class-upgrade", {
        failed_l1_refs: failedL1Refs,
        failed_l2_refs: failedL2Refs,
      });
      setUpgradeDone(true);
      setFailedL1Refs([]);
      setFailedL1Input("");
      setFailedL2Refs([]);
      setFailedL2Input("");
      loadUsers();
      showToast("Passage de classe effectué !");
    } catch (err) {
      showToast(err.response?.data?.error || "Erreur lors du passage", "error");
    } finally {
      setUpgradeLoading(false);
    }
  };

  const handleAlumniUpgrade = async () => {
    setAlumniLoading(true);
    try {
      const { data } = await api.post("/admin/alumni-upgrade");
      setAlumniDone(true);
      loadUsers();
      showToast(`${data.upgraded} étudiant${data.upgraded > 1 ? "s" : ""} L3 promu${data.upgraded > 1 ? "s" : ""} Alumni !`);
    } catch (err) {
      showToast(err.response?.data?.error || "Erreur lors de la promotion", "error");
    } finally {
      setAlumniLoading(false);
    }
  };

  const FORBIDDEN_LETTERS = ["G", "H", "J", "K", "N", "L", "M"];
  const isLetterForbidden = (letter) => {
    const c = (letter || "").toUpperCase();
    if (!c) return false;
    if (c < "A" || c > "Z") return true;
    return FORBIDDEN_LETTERS.includes(c);
  };

  const STUDENT_EMAIL_REGEX = /^hei\.[a-zA-Z0-9._%+-]+(\.\d+)?@gmail\.com$/;

  const handleRegisterL1 = async (e) => {
    e.preventDefault();
    if (!newL1.nom.trim() || !newL1.prenom.trim() || !newL1.email.trim() || !newL1.groupLetter.trim() || !generatedRef.trim()) return;
    const letter = newL1.groupLetter.toUpperCase();
    if (isLetterForbidden(letter)) return;
    if (!STUDENT_EMAIL_REGEX.test(newL1.email.trim())) {
      setEmailError("L'email doit suivre le format hei.prenom.nom@gmail.com");
      return;
    }
    setRegisterLoading(true);
    try {
      await api.post("/auth/register", {
        nom: newL1.nom.trim(),
        prenom: newL1.prenom.trim(),
        email: newL1.email.trim().toLowerCase(),
        ref: generatedRef.trim().toUpperCase(),
        pseudo: `${newL1.prenom.trim()}.${newL1.nom.trim()}`,
        password: "STDnew_UserPass",
        role: "student",
        level: "L1",
        groupe: letter,
      });
      setRegisterDone(true);
      setNewL1({ nom: "", prenom: "", email: "", groupLetter: "" });
      setGeneratedRef("STD2");
      setEmailError("");
      setLetterError("");
      showToast("Étudiant inscrit avec succès !");
    } catch (err) {
      showToast(err.response?.data?.error || "Erreur lors de l'inscription", "error");
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleCopy = (id, code) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const allTabs = [
    ...TABS,
    { key: "upgrade", label: "Passage de classe", icon: faGraduationCap },
    { key: "new-l1", label: "Nouveau étudiant", icon: faUserPlus },
    { key: "alumni", label: "Alumni", icon: faGraduationCap },
  ];

  const renderRoleBadge = (role) => {
    const cfg = ROLE_CONFIG[role];
    if (!cfg) return null;
    return (
      <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg border ${cfg.color}`}>
        <FontAwesomeIcon icon={cfg.icon} className="text-[10px]" />
        {cfg.label}
      </span>
    );
  };

  const renderLevelBadge = (level) => {
    if (!level) return null;
    const colors = LEVEL_COLORS[level] || "bg-gray-100 text-gray-600";
    return <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${colors}`}>{level}</span>;
  };

  return (
    <div className="flex min-h-screen bg-surface">
      <Sidebar />
      {toast && (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <main
        ref={mainRef}
        className="flex-1 flex flex-col overflow-y-auto h-screen"
      >
        <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-navy/10 flex items-center justify-center">
                <FontAwesomeIcon icon={faUserCog} className="text-navy text-lg" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-navy">
                  Panneau d'administration
                </h1>
                <p className="text-gray-400 text-sm mt-0.5">
                  Gestion des utilisateurs et des accès
                </p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <StatCard icon={faUsers} label="Utilisateurs" value={stats?.total_users} color="bg-navy/10 text-navy" />
            <StatCard icon={faFileAlt} label="Posts" value={stats?.total_posts} color="bg-gold/10 text-gold" />
            <StatCard icon={faInbox} label="Rendus" value={stats?.total_submissions} color="bg-cyan-100 text-cyan-600" />
            <StatCard icon={faComments} label="Messages" value={stats?.total_messages} color="bg-purple-100 text-purple-600" />
          </div>

          {/* Tabs */}
          <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
            <div className="flex gap-1.5 flex-wrap bg-white p-1.5 rounded-2xl shadow-card">
              {allTabs.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setTab(t.key)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                      tab === t.key
                        ? "bg-gradient-to-r from-navy to-navy-dark text-white shadow-md shadow-navy/20"
                        : "text-navy hover:bg-gold/10"
                    }`}
                  >
                    <FontAwesomeIcon icon={Icon} className="text-sm" />
                    {t.label}
                  </button>
                );
              })}
            </div>

            {tab === "users" && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowInvModal(true)}
                  className="btn-primary"
                >
                  <FontAwesomeIcon icon={faPlus} className="text-xs" />
                  <span className="hidden sm:inline">Invitation</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowBulkModal(true)}
                  className="btn-primary"
                >
                  <FontAwesomeIcon icon={faMagic} className="text-xs" />
                  <span className="hidden sm:inline">Multiple</span>
                </button>
              </div>
            )}
          </div>

          {/* Tab Content */}
          {tab === "users" && (
            <>
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                  <FontAwesomeIcon icon={faSearch} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none" />
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
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-navy border-t-gold rounded-full animate-spin" />
                    <p className="text-sm text-gray-400 font-medium">Chargement des utilisateurs...</p>
                  </div>
                </div>
              )}

              {!loading && (
                <>
                  {/* Desktop Table */}
                  <div className="hidden md:block bg-white rounded-2xl shadow-card overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-surface bg-surface/60">
                            {["Réf.", "Nom", "Email", "Pseudo", "Niv.", "Rôle", "Inscrit le", ""].map((h) => (
                              <th key={h} className="text-left py-3.5 px-4 text-xs font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {users.map((u) => (
                            <tr key={u.id} className="border-b border-surface last:border-0 hover:bg-surface/40 transition-colors duration-150">
                              <td className="py-3.5 px-4 font-bold text-navy whitespace-nowrap">{u.ref}</td>
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <span className="text-gray-700">{u.prenom} {u.nom}</span>
                              </td>
                              <td className="py-3.5 px-4">
                                {editingEmailId === u.id ? (
                                  <div className="flex items-center gap-1">
                                    <input
                                      type="email"
                                      value={editEmailValue}
                                      onChange={(e) => setEditEmailValue(e.target.value)}
                                      className="border border-contact rounded-lg text-xs py-1 px-2 w-40 bg-white focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 transition-all"
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") handleEmailSave(u.id);
                                        if (e.key === "Escape") setEditingEmailId(null);
                                      }}
                                    />
                                    <button onClick={() => handleEmailSave(u.id)} className="text-green-500 hover:text-green-600 px-1 transition">
                                      <FontAwesomeIcon icon={faCheck} size="xs" />
                                    </button>
                                    <button onClick={() => setEditingEmailId(null)} className="text-red-400 hover:text-red-500 px-1 transition">
                                      <FontAwesomeIcon icon={faTimes} size="xs" />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => { setEditingEmailId(u.id); setEditEmailValue(u.email); }}
                                    className="text-gray-500 hover:text-navy transition text-left text-xs flex items-center gap-1 group"
                                    title="Cliquer pour modifier"
                                  >
                                    <FontAwesomeIcon icon={faEnvelope} className="text-[10px] text-gray-300 group-hover:text-navy transition" />
                                    {u.email}
                                  </button>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-gray-500 text-xs">{u.pseudo}</td>
                              <td className="py-3.5 px-4">{renderLevelBadge(u.level)}</td>
                              <td className="py-3.5 px-4">
                                <select
                                  value={u.role}
                                  onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                  disabled={u.id === user.id}
                                  className="text-xs font-bold px-2 py-1 rounded-lg border-0 focus:outline-none cursor-pointer bg-transparent"
                                  style={{ color: ROLE_CONFIG[u.role]?.color.split(" ")[1] }}
                                >
                                  <option value="admin">Admin</option>
                                  <option value="bde">BDE</option>
                                  <option value="teacher">Professeur</option>
                                  <option value="student">Étudiant</option>
                                  <option value="alumni">Alumni</option>
                                </select>
                              </td>
                              <td className="py-3.5 px-4 text-gray-400 text-xs whitespace-nowrap">
                                {new Date(u.created_at).toLocaleDateString("fr-FR")}
                              </td>
                              <td className="py-3.5 px-4">
                                {u.id !== user.id && (
                                  <button
                                    type="button"
                                    onClick={() => setConfirmState({
                                      title: "Supprimer cet utilisateur ?",
                                      message: `${u.ref} — ${u.prenom} ${u.nom}. Cette action est irréversible.`,
                                      confirmLabel: "Supprimer",
                                      confirmColor: "red",
                                      icon: faTrash,
                                      onConfirm: () => { handleDelete(u.id, u.ref); setConfirmState(null); },
                                      onCancel: () => setConfirmState(null),
                                    })}
                                    className="text-red-300 hover:text-red-500 transition p-1.5 rounded-lg hover:bg-red-50"
                                    title="Supprimer"
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
                  </div>

                  {/* Mobile Cards */}
                  <div className="md:hidden flex flex-col gap-3">
                    {users.map((u) => (
                      <div key={u.id} className="bg-white rounded-2xl shadow-card p-4 hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-navy text-sm">{u.ref}</span>
                            {renderLevelBadge(u.level)}
                          </div>
                          {renderRoleBadge(u.role)}
                        </div>
                        <p className="text-sm text-gray-700 font-medium mb-2">{u.prenom} {u.nom}</p>
                        <div className="space-y-1.5 mb-3">
                          {editingEmailId === u.id ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="email"
                                value={editEmailValue}
                                onChange={(e) => setEditEmailValue(e.target.value)}
                                className="border border-contact rounded-lg text-xs py-1 px-2 flex-1 bg-white focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/10"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleEmailSave(u.id);
                                  if (e.key === "Escape") setEditingEmailId(null);
                                }}
                              />
                              <button onClick={() => handleEmailSave(u.id)} className="text-green-500 text-xs p-1">
                                <FontAwesomeIcon icon={faCheck} />
                              </button>
                              <button onClick={() => setEditingEmailId(null)} className="text-red-400 text-xs p-1">
                                <FontAwesomeIcon icon={faTimes} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => { setEditingEmailId(u.id); setEditEmailValue(u.email); }}
                              className="text-xs text-gray-400 hover:text-navy transition flex items-center gap-1.5"
                            >
                              <FontAwesomeIcon icon={faEnvelope} className="text-[10px]" />
                              {u.email}
                            </button>
                          )}
                          {u.pseudo && (
                            <p className="text-xs text-gray-400">@{u.pseudo}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                            disabled={u.id === user.id}
                            className="flex-1 border border-contact rounded-xl text-xs py-1.5 px-3 bg-white focus:outline-none focus:border-navy font-medium"
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
                              onClick={() => setConfirmState({
                                title: "Supprimer cet utilisateur ?",
                                message: `${u.ref} — ${u.prenom} ${u.nom}. Cette action est irréversible.`,
                                confirmLabel: "Supprimer",
                                confirmColor: "red",
                                icon: faTrash,
                                onConfirm: () => { handleDelete(u.id, u.ref); setConfirmState(null); },
                                onCancel: () => setConfirmState(null),
                              })}
                              className="px-3 py-1.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition"
                            >
                              <FontAwesomeIcon icon={faTrash} />
                            </button>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-300 mt-2">
                          Inscrit le {new Date(u.created_at).toLocaleDateString("fr-FR")}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {userTotal > PAGE_SIZE && (
                    <div className="flex items-center justify-center gap-4 py-4 mt-2">
                      <button
                        type="button"
                        disabled={userPage === 0}
                        onClick={() => setUserPage((p) => Math.max(0, p - 1))}
                        className="btn-primary"
                      >
                        <FontAwesomeIcon icon={faAngleLeft} className="text-xs" />
                        Précédent
                      </button>
                      <span className="text-sm text-gray-500">
                        Page {userPage + 1} / {Math.ceil(userTotal / PAGE_SIZE)}
                        <span className="text-gray-300 ml-1">({userTotal} total)</span>
                      </span>
                      <button
                        type="button"
                        disabled={(userPage + 1) * PAGE_SIZE >= userTotal}
                        onClick={() => setUserPage((p) => p + 1)}
                        className="btn-primary"
                      >
                        Suivant
                        <FontAwesomeIcon icon={faAngleRight} className="text-xs" />
                      </button>
                    </div>
                  )}

                  {users.length === 0 && (
                    <div className="text-center py-16">
                      <div className="w-14 h-14 rounded-2xl bg-navy/5 flex items-center justify-center mx-auto mb-4">
                        <FontAwesomeIcon icon={faUsers} className="text-navy/30 text-2xl" />
                      </div>
                      <p className="text-gray-400 text-sm">Aucun utilisateur trouvé.</p>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* Passage de classe */}
          {tab === "upgrade" && (
            <div className="bg-white rounded-2xl shadow-card p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-100 to-amber-50 text-amber-600 flex items-center justify-center shadow-sm">
                  <FontAwesomeIcon icon={faGraduationCap} className="text-xl" />
                </div>
                <div>
                  <h2 className="font-bold text-navy text-base">Passage de classe — {now.getFullYear()}</h2>
                  <p className="text-xs text-gray-400">
                    Saisissez les étudiants qui <strong className="text-red-500">redoublent</strong> leur année. Tous les autres passeront automatiquement au niveau supérieur.
                  </p>
                </div>
              </div>

              {upgradeDone && (
                <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl mb-4 flex items-center gap-2 animate-slide-up">
                  <FontAwesomeIcon icon={faCheckCircle} />
                  Passage de classe effectué avec succès !
                </div>
              )}

              {/* L1 Redoublants */}
              <div className="mb-5">
                <h3 className="text-sm font-bold text-cyan-700 mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  L1 — Redoublants
                </h3>
                <div className="flex items-center gap-2 mb-3">
                  <input
                    className="input-field font-mono uppercase"
                    placeholder="Référence STD (ex: STD25001)"
                    value={failedL1Input}
                    onChange={(e) => setFailedL1Input(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); handleAddFailedRef("L1"); }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleAddFailedRef("L1")}
                    className="btn-primary shrink-0"
                  >
                    <FontAwesomeIcon icon={faBan} className="text-sm" />
                    Redouble
                  </button>
                </div>
                {failedL1Refs.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {failedL1Refs.map((ref) => (
                      <span key={ref} className="inline-flex items-center gap-1.5 bg-red-50 border border-red-200 text-red-600 text-xs font-bold px-3 py-1.5 rounded-full">
                        {ref}
                        <button type="button" onClick={() => handleRemoveFailedRef("L1", ref)} className="hover:text-red-800 transition">
                          <FontAwesomeIcon icon={faTimes} size="xs" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* L2 Redoublants */}
              <div className="mb-5">
                <h3 className="text-sm font-bold text-violet-700 mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-violet-400" />
                  L2 — Redoublants
                </h3>
                <div className="flex items-center gap-2 mb-3">
                  <input
                    className="input-field font-mono uppercase"
                    placeholder="Référence STD (ex: STD25001)"
                    value={failedL2Input}
                    onChange={(e) => setFailedL2Input(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); handleAddFailedRef("L2"); }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleAddFailedRef("L2")}
                    className="btn-primary shrink-0"
                  >
                    <FontAwesomeIcon icon={faBan} className="text-sm" />
                    Redouble
                  </button>
                </div>
                {failedL2Refs.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {failedL2Refs.map((ref) => (
                      <span key={ref} className="inline-flex items-center gap-1.5 bg-red-50 border border-red-200 text-red-600 text-xs font-bold px-3 py-1.5 rounded-full">
                        {ref}
                        <button type="button" onClick={() => handleRemoveFailedRef("L2", ref)} className="hover:text-red-800 transition">
                          <FontAwesomeIcon icon={faTimes} size="xs" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5">
                <div className="flex items-start gap-2">
                  <FontAwesomeIcon icon={faArrowRight} className="text-blue-500 mt-0.5" />
                  <div className="text-xs text-blue-700">
                    Les étudiants <strong>L1</strong> passeront en <strong>L2</strong>, les <strong>L2</strong> en <strong>L3</strong>.<br />
                    Seuls les étudiants listés ci-dessus redoubleront leur année.
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleUpgrade}
                disabled={upgradeLoading}
                className="btn-primary"
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

          {/* Nouveau étudiant */}
          {tab === "new-l1" && (
            <div className="bg-white rounded-2xl shadow-card p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-100 to-green-50 text-green-600 flex items-center justify-center shadow-sm">
                  <FontAwesomeIcon icon={faUserPlus} className="text-xl" />
                </div>
                <div>
                  <h2 className="font-bold text-navy text-base">Nouveau étudiant</h2>
                  <p className="text-xs text-gray-400">
                    Remplissez les informations de l'étudiant. L'email, le pseudo et le mot de passe sont générés automatiquement.
                  </p>
                </div>
              </div>

              {registerDone && (
                <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl mb-4 flex items-center gap-2 animate-slide-up">
                  <FontAwesomeIcon icon={faCheckCircle} />
                  Étudiant inscrit avec succès !
                </div>
              )}

              <form onSubmit={handleRegisterL1} className="flex flex-col gap-4 max-w-lg">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-1.5 block uppercase tracking-wide">Prénom</label>
                    <input className="input-field" placeholder="Jean" value={newL1.prenom} onChange={(e) => setNewL1((prev) => ({ ...prev, prenom: e.target.value }))} required />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 mb-1.5 block uppercase tracking-wide">Nom</label>
                    <input className="input-field" placeholder="Rakoto" value={newL1.nom} onChange={(e) => setNewL1((prev) => ({ ...prev, nom: e.target.value }))} required />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1.5 block uppercase tracking-wide">Référence STD</label>
                  <input className="input-field font-mono tracking-widest uppercase" placeholder={`STD${currentYear}001`} value={generatedRef} onChange={(e) => { const val = e.target.value.toUpperCase(); if (val.startsWith("STD2")) setGeneratedRef(val); }} required />
                  <p className="text-xs text-gray-400 mt-1">Le préfixe <strong>STD2</strong> est déjà saisi. Ajoutez le chiffre de l'année puis le numéro à 3 chiffres (ex: STD26001).</p>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1.5 block uppercase tracking-wide">Email HEI</label>
                  <input type="email" className="input-field" placeholder="hei.prenom.nom@gmail.com" value={newL1.email} onChange={(e) => { setNewL1((prev) => ({ ...prev, email: e.target.value })); if (emailError) setEmailError(""); }} required />
                  {emailError && <p className="text-xs text-red-500 mt-1 font-medium">{emailError}</p>}
                  <p className="text-xs text-gray-400 mt-1">Format obligatoire : <strong>hei.prenom.nom@gmail.com</strong></p>
                </div>

                {newL1.prenom && newL1.nom && generatedRef.length > 4 && (
                  <div className="bg-navy/[0.03] rounded-xl p-4 space-y-2 border border-navy/10">
                    <p className="text-xs font-bold text-navy/60 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <FontAwesomeIcon icon={faMagic} className="text-[10px]" />
                      Informations générées automatiquement
                    </p>
                    <div className="grid grid-cols-[100px_1fr] gap-x-3 gap-y-1.5 text-sm">
                      <span className="text-gray-500 font-medium">Pseudo</span>
                      <span className="text-navy font-mono text-xs bg-navy/5 px-2 py-0.5 rounded">{newL1.prenom}.{newL1.nom}</span>
                      <span className="text-gray-500 font-medium">Mot de passe</span>
                      <span className="text-navy font-mono text-xs bg-navy/5 px-2 py-0.5 rounded">STDnew_UserPass</span>
                      <span className="text-gray-500 font-medium">Niveau</span>
                      <span className="text-navy font-mono text-xs bg-navy/5 px-2 py-0.5 rounded">L1</span>
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1.5 block uppercase tracking-wide">Lettre du groupe</label>
                  <input className="input-field max-w-[120px] text-center text-lg font-bold tracking-widest uppercase" placeholder="N" maxLength={1} value={newL1.groupLetter} onChange={(e) => {
                    const letter = e.target.value.replace(/[^A-Za-z]/g, "").toUpperCase();
                    setNewL1((prev) => ({ ...prev, groupLetter: letter }));
                    if (letter && isLetterForbidden(letter)) {
                      setLetterError("Lettre interdite — groupes déjà existants : G, H, J, K, N (et L, M exclues pour confusion).");
                    } else { setLetterError(""); }
                  }} required />
                  {letterError && <p className="text-xs text-red-500 mt-1 font-medium">{letterError}</p>}
                  <p className="text-xs text-gray-400 mt-1">Lettres interdites : G, H, J, K, N, L, M. Exemples valides : A, B, C, D, E, F, I, O…</p>
                </div>

                <button
                  type="submit"
                  disabled={registerLoading || !generatedRef.trim() || !newL1.groupLetter || !!letterError}
                  className="btn-gold mt-2 self-start"
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

          {/* Alumni */}
          {tab === "alumni" && (
            <div className="bg-white rounded-2xl shadow-card p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-100 to-amber-50 text-amber-600 flex items-center justify-center shadow-sm">
                  <FontAwesomeIcon icon={faGraduationCap} className="text-xl" />
                </div>
                <div>
                  <h2 className="font-bold text-navy text-base">Promotion Alumni</h2>
                  <p className="text-xs text-gray-400">
                    Tous les étudiants en <strong>L3</strong> seront promus au statut <strong>Alumni</strong> en un clic.
                  </p>
                </div>
              </div>

              {alumniDone && (
                <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl mb-4 flex items-center gap-2 animate-slide-up">
                  <FontAwesomeIcon icon={faCheckCircle} />
                  Promotion Alumni effectuée avec succès !
                </div>
              )}

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
                <div className="flex items-start gap-2">
                  <FontAwesomeIcon icon={faGraduationCap} className="text-amber-500 mt-0.5" />
                  <div className="text-xs text-amber-700">
                    Cette action est <strong>irréversible</strong>. Tous les utilisateurs ayant le niveau <strong>L3</strong> deviendront Alumni.<br />
                    Leur rôle passera de <strong>student</strong> à <strong>alumni</strong> et leur niveau à <strong>alumni</strong>.
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAlumniUpgrade}
                disabled={alumniLoading}
                className="bg-gradient-to-r from-amber-500 to-amber-600 text-white px-6 py-3 rounded-xl font-bold text-sm
                  hover:from-amber-600 hover:to-amber-700 transition-all duration-200 disabled:opacity-60 active:scale-[0.97] shadow-md shadow-amber-500/20"
              >
                {alumniLoading ? (
                  <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                ) : (
                  <FontAwesomeIcon icon={faGraduationCap} />
                )}
                Passer tous les L3 en Alumni
              </button>
            </div>
          )}

          {/* Invitations */}
          {tab === "invitations" && (
            <div className="flex flex-col gap-3">
              {invTotal > PAGE_SIZE && (
                <div className="flex items-center justify-center gap-4 py-2">
                  <button type="button" disabled={invPage === 0} onClick={() => setInvPage((p) => Math.max(0, p - 1))} className="btn-primary">
                    <FontAwesomeIcon icon={faAngleLeft} className="text-xs" />
                    Précédent
                  </button>
                  <span className="text-sm text-gray-500">Page {invPage + 1} / {Math.ceil(invTotal / PAGE_SIZE)} ({invTotal} total)</span>
                  <button type="button" disabled={(invPage + 1) * PAGE_SIZE >= invTotal} onClick={() => setInvPage((p) => p + 1)} className="btn-primary">
                    Suivant
                    <FontAwesomeIcon icon={faAngleRight} className="text-xs" />
                  </button>
                </div>
              )}

              {invitations.length === 0 && (
                <div className="text-center py-16">
                  <div className="w-14 h-14 rounded-2xl bg-navy/5 flex items-center justify-center mx-auto mb-4">
                    <FontAwesomeIcon icon={faTicket} className="text-navy/30 text-2xl" />
                  </div>
                  <p className="text-gray-400 text-sm">Aucune invitation générée.</p>
                </div>
              )}

              <div className="grid gap-3">
                {invitations.map((inv) => {
                  const expired = new Date(inv.expires_at) < new Date();
                  const multi = inv.max_uses > 1;
                  const full = inv.use_count >= inv.max_uses;
                  const isCopied = copiedId === inv.id;
                  return (
                    <div key={inv.id} className="bg-white rounded-2xl shadow-card p-4 flex flex-col sm:flex-row sm:items-center gap-3 hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className="font-mono font-bold text-navy text-lg tracking-widest">{inv.code}</span>
                          <div className="flex gap-1.5 flex-wrap">
                            {full && !expired && <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-0.5 rounded-full border border-gray-200">Épuisé</span>}
                            {!full && expired && <span className="bg-red-50 text-red-500 text-xs font-bold px-2 py-0.5 rounded-full border border-red-200">Expiré</span>}
                            {!full && !expired && <span className="bg-gold/10 text-gold text-xs font-bold px-2 py-0.5 rounded-full border border-gold/20">Actif</span>}
                            {multi && <span className="bg-blue-50 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full border border-blue-200">{inv.use_count}/{inv.max_uses}</span>}
                            {renderRoleBadge(inv.role)}
                          </div>
                        </div>
                        <p className="text-xs text-gray-400">
                          {multi ? `${inv.use_count} utilisés sur ${inv.max_uses} — expire le ` : "Expire le "}
                          {new Date(inv.expires_at).toLocaleDateString("fr-FR")}
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        {!full && !expired && (
                          <button
                            type="button"
                            onClick={() => handleCopy(inv.id, inv.code)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition ${
                              isCopied ? "bg-green-100 text-green-600 border border-green-200" : "bg-navy/10 text-navy hover:bg-navy/20 border border-transparent"
                            }`}
                          >
                            <FontAwesomeIcon icon={isCopied ? faCheck : faCopy} />
                            {isCopied ? "Copié !" : "Copier"}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setConfirmState({
                            title: "Supprimer cette invitation ?",
                            message: `Code: ${inv.code}`,
                            confirmLabel: "Supprimer",
                            confirmColor: "red",
                            icon: faTrash,
                            onConfirm: () => { handleDeleteInvitation(inv.id); setConfirmState(null); },
                            onCancel: () => setConfirmState(null),
                          })}
                          className="px-3 py-2 bg-red-50 text-red-400 rounded-xl hover:bg-red-100 transition text-xs border border-red-100"
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Annonces */}
          {tab === "annonces" && (
            <div className="flex flex-col gap-5">
              {/* Composer */}
              <div className="bg-white rounded-2xl shadow-card p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-navy/10 to-navy/5 flex items-center justify-center">
                    <FontAwesomeIcon icon={faNewspaper} className="text-navy text-lg" />
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
                    className="input-field min-h-[120px] resize-y"
                    placeholder="Contenu de l'annonce..."
                    value={annContent}
                    onChange={(e) => setAnnContent(e.target.value)}
                  />
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface text-navy text-sm font-bold hover:bg-navy/10 transition cursor-pointer">
                      <FontAwesomeIcon icon={faImage} />
                      {annImage ? "Changer l'image" : "Ajouter une image"}
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) { setAnnImage(file); setAnnImagePreview(URL.createObjectURL(file)); }
                      }} />
                    </label>
                    {annImage && (
                      <button type="button" onClick={() => { setAnnImage(null); setAnnImagePreview(null); }} className="text-red-400 hover:text-red-600 text-sm font-bold transition">
                        <FontAwesomeIcon icon={faTimes} className="mr-1" />
                        Retirer
                      </button>
                    )}
                  </div>
                  {annImagePreview && (
                    <img src={annImagePreview} alt="Aperçu" className="w-full max-h-48 object-cover rounded-xl border border-contact" />
                  )}

                  {/* Level selector */}
                  <div>
                    <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide flex items-center gap-1">
                      <FontAwesomeIcon icon={faUsers} className="text-[10px]" />
                      Visible par
                    </p>
                    <div className="flex gap-2">
                      {["Tous", "L1", "L2", "L3"].map((l) => (
                        <button key={l} type="button" onClick={() => setAnnTargetLevel(l === "Tous" ? "" : l)}
                          className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${
                            ((l === "Tous" && !annTargetLevel) || annTargetLevel === l)
                              ? "bg-navy text-white shadow-sm"
                              : "bg-white border border-contact text-navy hover:border-navy"
                          }`}
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
                        await api.post("/announcements", form, { headers: { "Content-Type": "multipart/form-data" } });
                        setAnnTitle(""); setAnnContent(""); setAnnImage(null); setAnnImagePreview(null); setAnnTargetLevel("");
                        loadAnnouncements();
                        showToast("Annonce publiée !");
                      } catch (err) {
                        showToast("Erreur lors de la publication", "error");
                      } finally { setAnnSubmitting(false); }
                    }}
                    disabled={annSubmitting || !annTitle.trim() || !annContent.trim()}
                    className="btn-gold self-start"
                  >
                    {annSubmitting ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> : <FontAwesomeIcon icon={faNewspaper} />}
                    Publier
                  </button>
                </div>
              </div>

              {/* Published announcements */}
              <div>
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <span>Annonces publiées</span>
                  <span className="text-xs font-normal text-gray-300">({announcements.length})</span>
                </h3>
                {annLoading && (
                  <div className="flex justify-center py-8">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 border-2 border-navy border-t-gold rounded-full animate-spin" />
                      <span className="text-sm text-gray-400">Chargement...</span>
                    </div>
                  </div>
                )}
                {!annLoading && announcements.length === 0 && (
                  <div className="text-center py-12 bg-white rounded-2xl shadow-card">
                    <div className="w-12 h-12 rounded-2xl bg-navy/5 flex items-center justify-center mx-auto mb-3">
                      <FontAwesomeIcon icon={faNewspaper} className="text-navy/30 text-xl" />
                    </div>
                    <p className="text-gray-400 text-sm">Aucune annonce publiée.</p>
                  </div>
                )}
                <div className="flex flex-col gap-3">
                  {announcements.map((ann) => (
                    <div key={ann.id} className="bg-white rounded-2xl shadow-card p-4 flex items-start gap-4 hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 group">
                      {ann.image_url && (
                        <img src={ann.image_url} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-navy text-sm truncate flex items-center gap-2">
                          {ann.title}
                          {ann.target_level && renderLevelBadge(ann.target_level)}
                        </h4>
                        <p className="text-xs text-gray-500 line-clamp-2 mt-1">{ann.content}</p>
                        <p className="text-xs text-gray-300 mt-1.5">
                          {new Date(ann.created_at).toLocaleDateString("fr-FR", {
                            day: "numeric", month: "long", year: "numeric",
                          })}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setConfirmState({
                          title: "Supprimer cette annonce ?",
                          message: `"${ann.title}" sera définitivement supprimé.`,
                          confirmLabel: "Supprimer",
                          confirmColor: "red",
                          icon: faTrash,
                          onConfirm: async () => {
                            try { await api.delete(`/announcements/${ann.id}`); loadAnnouncements(); showToast("Annonce supprimée"); } catch (err) { showToast("Erreur", "error"); }
                            setConfirmState(null);
                          },
                          onCancel: () => setConfirmState(null),
                        })}
                        className="text-red-300 hover:text-red-500 transition shrink-0 p-1.5 rounded-lg hover:bg-red-50 opacity-0 group-hover:opacity-100"
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

        {/* Scroll to top */}
        {showTop && (
          <button
            type="button"
            onClick={() => mainRef.current?.scrollTo({ top: 0, behavior: "smooth" })}
            className="fixed bottom-6 right-6 w-11 h-11 rounded-full bg-navy text-white flex items-center justify-center shadow-lg hover:bg-gold transition-all duration-200 z-50 hover:scale-105"
            title="Remonter en haut"
          >
            <FontAwesomeIcon icon={faArrowUp} />
          </button>
        )}
      </main>

      {/* Invitation Modal */}
      {showInvModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-modal p-6 w-full max-w-sm animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-navy/10 flex items-center justify-center">
                  <FontAwesomeIcon icon={faTicket} className="text-navy text-sm" />
                </div>
                <h3 className="font-bold text-navy text-base">Nouvelle invitation</h3>
              </div>
              <button type="button" onClick={() => setShowInvModal(false)} className="text-gray-400 hover:text-navy transition w-8 h-8 rounded-lg hover:bg-surface flex items-center justify-center">
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            <p className="text-sm text-gray-400 mb-5">Le code sera valable <strong>14 jours</strong>.</p>

            {invError && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl mb-4 flex items-center gap-2">
                <FontAwesomeIcon icon={faExclamationTriangle} />
                {invError}
              </div>
            )}

            <label className="text-xs font-bold text-gray-500 mb-2 block uppercase tracking-wide">Rôle de l'invité</label>
            <div className="flex gap-2 mb-5">
              {["student", "teacher", "alumni"].map((r) => (
                <button key={r} type="button" onClick={() => { setInvRole(r); setInvError(""); }}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold border transition ${
                    invRole === r ? "bg-navy text-white border-navy shadow-md" : "bg-white text-navy border-contact hover:bg-surface"
                  }`}
                >
                  {ROLE_CONFIG[r].label}
                </button>
              ))}
            </div>

            <label className="text-xs font-bold text-gray-500 mb-2 block uppercase tracking-wide">Utilisations max</label>
            <input type="number" className="input-field mb-5" min={1} max={10000} value={invMaxUses} onChange={(e) => setInvMaxUses(Math.max(1, parseInt(e.target.value) || 1))} />

            <button type="button" onClick={handleCreateInvitation} disabled={invLoading} className="btn-primary w-full justify-center">
              {invLoading ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> : <><FontAwesomeIcon icon={faMagic} /> Générer le code</>}
            </button>
          </div>
        </div>
      )}

      {/* Bulk Invitation Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-modal p-6 w-full max-w-lg max-h-[85vh] flex flex-col animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-navy/10 flex items-center justify-center">
                  <FontAwesomeIcon icon={faMagic} className="text-navy text-sm" />
                </div>
                <h3 className="font-bold text-navy text-base">Génération multiple</h3>
              </div>
              <button type="button" onClick={() => { setShowBulkModal(false); setBulkCodes([]); setAllCopied(false); }} className="text-gray-400 hover:text-navy transition w-8 h-8 rounded-lg hover:bg-surface flex items-center justify-center">
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            {bulkCodes.length === 0 ? (
              <>
                <p className="text-sm text-gray-400 mb-4">Générez jusqu'à <strong>1 000 codes</strong> en une seule fois. Chaque code sera valable <strong>14 jours</strong>.</p>

                {bulkError && <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-xl mb-4">{bulkError}</div>}

                <label className="text-xs font-bold text-gray-500 mb-2 block uppercase tracking-wide">Rôle des invités</label>
                <div className="flex gap-2 mb-4">
                  {["student", "teacher", "alumni"].map((r) => (
                    <button key={r} type="button" onClick={() => { setBulkRole(r); setBulkError(""); }}
                      className={`flex-1 py-3 rounded-xl text-sm font-bold border transition ${
                        bulkRole === r ? "bg-navy text-white border-navy shadow-md" : "bg-white text-navy border-contact hover:bg-surface"
                      }`}
                    >
                      {ROLE_CONFIG[r].label}
                    </button>
                  ))}
                </div>

                <label className="text-xs font-bold text-gray-500 mb-2 block uppercase tracking-wide">Nombre de codes</label>
                <input type="number" className="input-field mb-4" min={1} max={1000} value={bulkCount} onChange={(e) => setBulkCount(Math.min(1000, Math.max(1, parseInt(e.target.value) || 1)))} />

                <label className="text-xs font-bold text-gray-500 mb-2 block uppercase tracking-wide">Utilisations max par code</label>
                <input type="number" className="input-field mb-6" min={1} max={10000} value={bulkMaxUses} onChange={(e) => setBulkMaxUses(Math.max(1, parseInt(e.target.value) || 1))} />

                <button type="button" onClick={async () => {
                  setBulkLoading(true); setBulkError("");
                  try {
                    const { data } = await api.post("/admin/invitations/bulk", { role: bulkRole, count: bulkCount, max_uses: bulkMaxUses });
                    setBulkCodes(data.codes); loadInvitations();
                  } catch (err) { setBulkError(err.response?.data?.error || "Erreur lors de la génération."); }
                  finally { setBulkLoading(false); }
                }} disabled={bulkLoading} className="btn-primary w-full justify-center">
                  {bulkLoading ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> : <><FontAwesomeIcon icon={faMagic} /> Générer {bulkCount} code{bulkCount > 1 ? "s" : ""}</>}
                </button>
              </>
            ) : (
              <>
                <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl mb-4 flex items-center gap-2">
                  <FontAwesomeIcon icon={faCheckCircle} />
                  {bulkCodes.length} code{bulkCodes.length > 1 ? "s" : ""} généré{bulkCodes.length > 1 ? "s" : ""} avec succès
                </div>

                <div className="flex-1 overflow-y-auto mb-4 space-y-2 custom-scrollbar">
                  {bulkCodes.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between bg-surface rounded-xl px-4 py-3 border border-contact/50">
                      <span className="font-mono font-bold text-navy tracking-widest text-sm">{inv.code}</span>
                      {renderRoleBadge(inv.role)}
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <button type="button" onClick={() => {
                    const text = bulkCodes.map((i) => i.code).join("\n");
                    navigator.clipboard.writeText(text); setAllCopied(true);
                    setTimeout(() => setAllCopied(false), 2000);
                  }} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition ${
                    allCopied ? "bg-green-100 text-green-600 border border-green-200" : "btn-primary justify-center"
                  }`}>
                    <FontAwesomeIcon icon={allCopied ? faCheck : faCopy} />
                    {allCopied ? "Tous copiés !" : "Copier tous les codes"}
                  </button>
                  <button type="button" onClick={() => { setBulkCodes([]); setAllCopied(false); }} className="btn-primary flex-1 justify-center">
                    Générer encore
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Global Confirm Modal */}
      <ConfirmModal
        open={!!confirmState}
        title={confirmState?.title}
        message={confirmState?.message}
        confirmLabel={confirmState?.confirmLabel}
        confirmColor={confirmState?.confirmColor}
        icon={confirmState?.icon}
        onConfirm={confirmState?.onConfirm || (() => {})}
        onCancel={confirmState?.onCancel || (() => setConfirmState(null))}
      />
    </div>
  );
}
