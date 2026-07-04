import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import Sidebar from "../components/layout/Sidebar";
import Navbar from "../components/layout/Navbar";
import Avatar from "../components/ui/Avatar";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBell,
  faCheck,
  faTimes,
  faSpinner,
  faBellSlash,
  faCommentDots,
  faInbox,
  faPaperPlane,
} from "@fortawesome/free-solid-svg-icons";
 
const STATUS_CFG = {
  pending: { label: "En attente", cls: "bg-yellow-100 text-yellow-700" },
  accepted: { label: "Accepté", cls: "bg-green-100 text-green-700" },
  refused: { label: "Refusé", cls: "bg-red-100 text-red-700" },
};
 
function PingCard({ ping, isSent, onAccept, onRefuse, processingId }) {
  const person = isSent
    ? { pseudo: ping.receiver_pseudo, avatar: ping.receiver_avatar, ref: ping.receiver_ref, role: ping.receiver_role }
    : { pseudo: ping.sender_pseudo, avatar: ping.sender_avatar, ref: ping.sender_ref, role: ping.sender_role };
  if (!person || !person.ref) return null;
  const statusCfg = STATUS_CFG[ping.status] || STATUS_CFG.pending;
 
  return (
    <div className="bg-white rounded-2xl shadow-card overflow-hidden p-4 sm:p-5">
      <div className="flex items-center gap-4">
        <Link to={`/user/${person.ref}`} className="shrink-0">
          {person.avatar ? (
            <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-gold/20">
              <img src={person.avatar} alt={person.pseudo} className="w-full h-full object-cover" />
            </div>
          ) : (
            <Avatar name={person.pseudo} size="lg" color="bg-gold" />
          )}
        </Link>
 
        <div className="flex-1 min-w-0">
          <Link
            to={`/user/${person.ref}`}
            className="font-bold text-navy text-sm hover:text-gold transition-colors truncate block"
          >
            {person.pseudo}
          </Link>
          <p className="text-xs text-gray-400 mt-0.5">
            {isSent ? "Envoyé" : "Reçu"} — {new Date(ping.created_at).toLocaleDateString("fr-FR", {
              day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
            })}
          </p>
          <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 ${statusCfg.cls}`}>
            {statusCfg.label}
          </span>
        </div>
 
        <div className="flex items-center gap-2 shrink-0">
          {!isSent && ping.status === "pending" && (
            <>
              <button
                type="button"
                onClick={() => onAccept(ping.id)}
                disabled={processingId === ping.id}
                className="w-9 h-9 rounded-xl bg-green-50 text-green-600 flex items-center justify-center hover:bg-green-100 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                title="Accepter"
              >
                {processingId === ping.id ? (
                  <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                ) : (
                  <FontAwesomeIcon icon={faCheck} />
                )}
              </button>
              <button
                type="button"
                onClick={() => onRefuse(ping.id)}
                disabled={processingId === ping.id}
                className="w-9 h-9 rounded-xl bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                title="Refuser"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </>
          )}
          {ping.status === "accepted" && (
            <Link
              to="/chat"
              className="w-9 h-9 rounded-xl bg-gold/15 text-gold flex items-center justify-center hover:bg-gold/25 hover:scale-105 active:scale-95 transition-all"
              title="Discuter"
            >
              <FontAwesomeIcon icon={faCommentDots} />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
 
export default function PingBoxPage() {
  const { user } = useAuth();
  const [pings, setPings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [tab, setTab] = useState("received");
  const [mounted, setMounted] = useState(false);
 
  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
  }, []);
 
  const fetchPings = async () => {
    try {
      const { data } = await api.get("/pings");
      setPings(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
 
  useEffect(() => {
    fetchPings();
  }, []);
 
  const handleAccept = async (id) => {
    setProcessingId(id);
    try {
      await api.patch(`/pings/${id}/accept`);
      fetchPings();
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };
 
  const handleRefuse = async (id) => {
    setProcessingId(id);
    try {
      await api.patch(`/pings/${id}/refuse`);
      fetchPings();
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };
 
  const received = pings.filter((p) => p.receiver_id === user.id);
  const sent = pings.filter((p) => p.sender_id === user.id);
  const pendingCount = received.filter((p) => p.status === "pending").length;
  const hasPending = pendingCount > 0;
 
  const activePings = tab === "received" ? received : sent;
 
  return (
    <div className="flex h-screen bg-surface overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col min-h-0">
        <Navbar title="Ping Box" />
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="relative">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-24 -right-24 w-96 h-96 bg-gold/5 rounded-full blur-3xl" />
              <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-navy/[0.03] rounded-full blur-3xl" />
            </div>
            <div className={`relative transition-all duration-700 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
              {/* Hero */}
              <div className="bg-gradient-to-br from-navy via-navy-dark to-navy px-4 sm:px-6 lg:px-8 pt-8 pb-10 sm:pt-10 sm:pb-12 lg:pt-12 lg:pb-14">
                <div className="flex items-center gap-4 sm:gap-5">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center shrink-0 ring-1 ring-white/20">
                    <FontAwesomeIcon icon={faBell} className="text-gold text-lg sm:text-xl" />
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white tracking-tight">
                      Ping Box
                    </h1>
                    <p className="text-sm sm:text-base text-white/60 mt-1 font-medium">
                      {hasPending
                        ? `Vous avez ${pendingCount} ping${pendingCount > 1 ? "s" : ""} en attente`
                        : "Consultez vos pings reçus et envoyés"}
                    </p>
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
              </div>
 
              {/* Content */}
              <div className="px-4 sm:px-6 lg:px-8 -mt-4 sm:-mt-5 pb-6 sm:pb-8">
                <div className="max-w-2xl mx-auto">
                  {/* Tabs */}
                  <div className="bg-white rounded-2xl shadow-card p-1.5 flex gap-1.5 mb-5">
                    <button
                      type="button"
                      onClick={() => setTab("received")}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 relative flex items-center justify-center gap-2 ${
                        tab === "received"
                          ? "bg-navy text-white shadow-sm"
                          : "text-gray-400 hover:text-navy hover:bg-surface"
                      }`}
                    >
                      <FontAwesomeIcon icon={faInbox} className="text-xs" />
                      Reçus ({received.length})
                      {hasPending && (
                        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                          {pendingCount}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setTab("sent")}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 ${
                        tab === "sent"
                          ? "bg-navy text-white shadow-sm"
                          : "text-gray-400 hover:text-navy hover:bg-surface"
                      }`}
                    >
                      <FontAwesomeIcon icon={faPaperPlane} className="text-xs" />
                      Envoyés ({sent.length})
                    </button>
                  </div>
 
                  {/* Ping list */}
                  {loading ? (
                    <div className="flex justify-center py-16">
                      <FontAwesomeIcon icon={faSpinner} className="text-navy text-3xl animate-spin" />
                    </div>
                  ) : activePings.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-card p-8 text-center">
                      <FontAwesomeIcon icon={faBellSlash} className="text-4xl text-gray-300 mb-3" />
                      <p className="text-gray-500 text-sm font-semibold">
                        {tab === "received" ? "Aucun ping reçu" : "Aucun ping envoyé"}
                      </p>
                      <p className="text-gray-400 text-xs mt-1">
                        {tab === "received"
                          ? "Quand quelqu'un vous enverra un ping, il apparaîtra ici."
                          : "Allez sur le profil d'un utilisateur pour lui envoyer un ping."}
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {activePings.map((ping) => (
                        <PingCard
                          key={ping.id}
                          ping={ping}
                          isSent={tab === "sent"}
                          onAccept={handleAccept}
                          onRefuse={handleRefuse}
                          processingId={processingId}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}