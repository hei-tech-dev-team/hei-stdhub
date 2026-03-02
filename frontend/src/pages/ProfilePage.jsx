import { useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import Sidebar from "../components/layout/Sidebar";
import Navbar from "../components/layout/Navbar";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCamera,
  faUser,
  faLock,
  faSave,
  faSpinner,
  faCheck,
  faArrowLeft,
} from "@fortawesome/free-solid-svg-icons";

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [pseudo, setPseudo] = useState(user?.pseudo || "");
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");

  const [loadingPseudo, setLoadingPseudo] = useState(false);
  const [loadingPwd, setLoadingPwd] = useState(false);
  const [loadingAvatar, setLoadingAvatar] = useState(false);

  const [successPseudo, setSuccessPseudo] = useState(false);
  const [successPwd, setSuccessPwd] = useState(false);

  const [errorPseudo, setErrorPseudo] = useState("");
  const [errorPwd, setErrorPwd] = useState("");

  const avatarUrl = user?.avatar
    ? `${import.meta.env.VITE_API_URL || "http://localhost:3001"}/${user.avatar}`
    : null;

  // ── Changer avatar ──
  const handleAvatar = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoadingAvatar(true);
    try {
      const fd = new FormData();
      fd.append("avatar", file);
      const { data } = await api.patch("/auth/avatar", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setUser(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingAvatar(false);
    }
  };

  // ── Changer pseudo ──
  const handlePseudo = async (e) => {
    e.preventDefault();
    setErrorPseudo("");
    setLoadingPseudo(true);
    try {
      const { data } = await api.patch("/auth/profile", { pseudo });
      setUser(data);
      setSuccessPseudo(true);
      setTimeout(() => setSuccessPseudo(false), 3000);
    } catch (err) {
      setErrorPseudo(err.response?.data?.error || "Erreur.");
    } finally {
      setLoadingPseudo(false);
    }
  };

  // ── Changer mot de passe ──
  const handlePassword = async (e) => {
    e.preventDefault();
    setErrorPwd("");
    if (newPwd !== confirmPwd) {
      setErrorPwd("Les mots de passe ne correspondent pas.");
      return;
    }
    setLoadingPwd(true);
    try {
      await api.patch("/auth/password", {
        current: currentPwd,
        newPassword: newPwd,
      });
      setSuccessPwd(true);
      setCurrentPwd("");
      setNewPwd("");
      setConfirmPwd("");
      setTimeout(() => setSuccessPwd(false), 3000);
    } catch (err) {
      setErrorPwd(err.response?.data?.error || "Erreur.");
    } finally {
      setLoadingPwd(false);
    }
  };

  return (
    <div className="flex h-screen bg-surface overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar title="Mon Profil" />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto w-full">
          {/* Avatar */}
          <div className="bg-white rounded-2xl shadow-sm border border-contact p-6 mb-6 flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-navy flex items-center justify-center overflow-hidden border-4 border-gold">
                {loadingAvatar ? (
                  <FontAwesomeIcon
                    icon={faSpinner}
                    className="text-white text-2xl animate-spin"
                  />
                ) : avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <FontAwesomeIcon
                    icon={faUser}
                    className="text-white text-3xl"
                  />
                )}
              </div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full
                           bg-gold text-white flex items-center justify-center
                           shadow-md hover:opacity-90 transition"
              >
                <FontAwesomeIcon icon={faCamera} className="text-xs" />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatar}
              />
            </div>
            <div className="text-center">
              <p className="font-bold text-navy text-lg">{user?.pseudo}</p>
              <p className="text-gray-400 text-sm">{user?.ref}</p>
              <span className="inline-block mt-1 bg-navy/10 text-navy text-xs px-3 py-1 rounded-full font-semibold">
                {user?.role === "teacher"
                  ? "Professeur"
                  : user?.role === "admin"
                    ? "Admin"
                    : `Étudiant ${user?.level || ""}`}
              </span>
            </div>
          </div>

          {/* Infos readonly */}
          <div className="bg-white rounded-2xl shadow-sm border border-contact p-6 mb-6">
            <h2 className="font-bold text-navy text-sm uppercase tracking-wide mb-4">
              Informations
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                ["Nom", user?.nom],
                ["Prénom", user?.prenom],
                ["Email", user?.email],
                ["Référence", user?.ref],
              ].map(([label, val]) => (
                <div key={label}>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
                    {label}
                  </p>
                  <p className="font-semibold text-navy text-sm truncate">
                    {val}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Changer pseudo */}
          <div className="bg-white rounded-2xl shadow-sm border border-contact p-6 mb-6">
            <h2 className="font-bold text-navy text-sm uppercase tracking-wide mb-4 flex items-center gap-2">
              <FontAwesomeIcon icon={faUser} className="text-gold" />
              Modifier le pseudo
            </h2>
            {errorPseudo && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2 rounded-xl mb-3">
                {errorPseudo}
              </div>
            )}
            {successPseudo && (
              <div className="bg-green-50 border border-green-200 text-green-600 text-sm px-4 py-2 rounded-xl mb-3 flex items-center gap-2">
                <FontAwesomeIcon icon={faCheck} /> Pseudo mis à jour !
              </div>
            )}
            <form onSubmit={handlePseudo} className="flex gap-3">
              <input
                className="input-field flex-1"
                value={pseudo}
                onChange={(e) => setPseudo(e.target.value)}
                placeholder="Nouveau pseudo"
              />
              <button
                type="submit"
                disabled={loadingPseudo}
                className="btn-primary px-4 disabled:opacity-60"
              >
                {loadingPseudo ? (
                  <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                ) : (
                  <FontAwesomeIcon icon={faSave} />
                )}
              </button>
            </form>
          </div>

          {/* Changer mot de passe */}
          <div className="bg-white rounded-2xl shadow-sm border border-contact p-6 mb-6">
            <h2 className="font-bold text-navy text-sm uppercase tracking-wide mb-4 flex items-center gap-2">
              <FontAwesomeIcon icon={faLock} className="text-gold" />
              Modifier le mot de passe
            </h2>
            {errorPwd && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-2 rounded-xl mb-3">
                {errorPwd}
              </div>
            )}
            {successPwd && (
              <div className="bg-green-50 border border-green-200 text-green-600 text-sm px-4 py-2 rounded-xl mb-3 flex items-center gap-2">
                <FontAwesomeIcon icon={faCheck} /> Mot de passe mis à jour !
              </div>
            )}
            <form onSubmit={handlePassword} className="flex flex-col gap-3">
              <input
                type="password"
                className="input-field"
                placeholder="Mot de passe actuel"
                value={currentPwd}
                onChange={(e) => setCurrentPwd(e.target.value)}
              />
              <input
                type="password"
                className="input-field"
                placeholder="Nouveau mot de passe"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
              />
              <input
                type="password"
                className="input-field"
                placeholder="Confirmer le nouveau mot de passe"
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
              />
              <button
                type="submit"
                disabled={loadingPwd}
                className="btn-primary disabled:opacity-60"
              >
                {loadingPwd ? (
                  <FontAwesomeIcon
                    icon={faSpinner}
                    className="animate-spin mr-2"
                  />
                ) : null}
                Mettre à jour
              </button>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
