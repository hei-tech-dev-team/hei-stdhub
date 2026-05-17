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
} from "@fortawesome/free-solid-svg-icons";

const STATUS_CFG = {
  pending: { label: "En attente", cls: "bg-yellow-500/20 text-yellow-300" },
  accepted: { label: "Accepté", cls: "bg-green-500/20 text-green-300" },
  refused: { label: "Refusé", cls: "bg-red-500/20 text-red-300" },
};

function PingCard({ ping, isSent, onAccept, onRefuse, processingId }) {
  const person = isSent ? ping.receiver : ping.sender;
  const statusCfg = STATUS_CFG[ping.status] || STATUS_CFG.pending;

  return (
    <div
      className="rounded-2xl overflow-hidden p-4 sm:p-5 transition-all duration-200"
      style={{
        background: "white",
        border: "1px solid rgba(0,0,0,0.08)",
      }}
    >
      <div className="flex items-center gap-4">
        <Link to={`/user/${person.ref}`} className="shrink-0">
          {person.avatar ? (
            <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-white/20">
              <img src={person.avatar} alt={person.pseudo} className="w-full h-full object-cover" />
            </div>
          ) : (
            <Avatar name={person.pseudo} size="lg" color="bg-gold" />
          )}
        </Link>

        <div className="flex-1 min-w-0">
          <Link
            to={`/user/${person.ref}`}
            className="font-bold text-gray-800 text-sm hover:text-gold transition-colors truncate block"
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
                className="w-9 h-9 rounded-xl bg-green-500/20 text-green-300 flex items-center justify-center hover:bg-green-500/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
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
                className="w-9 h-9 rounded-xl bg-red-500/20 text-red-300 flex items-center justify-center hover:bg-red-500/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                title="Refuser"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </>
          )}
          {ping.status === "accepted" && (
            <Link
              to="/chat"
              className="w-9 h-9 rounded-xl bg-gold/20 text-gold flex items-center justify-center hover:bg-gold/30 hover:scale-105 active:scale-95 transition-all"
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
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
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

  const activePings = tab === "received" ? received : sent;
  const hasPending = received.some((p) => p.status === "pending");

  return (
    <div className="flex h-screen bg-surface overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar title="Ping Box" />
        <main className="flex-1 overflow-y-auto relative">
          <div className="max-w-2xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 relative z-10">
            {/* Header card */}
            <div
              className={`transition-all duration-700 ease-out mb-6 ${
                visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              }`}
            >
              <div
                className="rounded-2xl overflow-hidden p-5 sm:p-6"
                style={{
                  background: "linear-gradient(135deg, rgba(10,26,51,0.95), rgba(0,25,72,0.98))",
                  border: "1px solid rgba(255,255,255,0.08)",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
                }}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "rgba(212,175,55,0.15)" }}
                  >
                    <FontAwesomeIcon icon={faBell} className="text-gold text-lg" />
                  </div>
                  <div>
                    <h1 className="text-white font-bold text-lg">Ping Box</h1>
                    <p className="text-white/50 text-sm mt-0.5">
                      {hasPending
                        ? "Vous avez des pings en attente !"
                        : "Consultez vos pings reçus et envoyés"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div
              className={`flex gap-2 mb-5 transition-all duration-700 ease-out ${
                visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              }`}
              style={{ transitionDelay: "100ms" }}
            >
              <button
                type="button"
                onClick={() => setTab("received")}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 relative ${
                  tab === "received"
                    ? "text-white"
                    : "text-gray-400 hover:text-gray-200 bg-white/5"
                }`}
                style={tab === "received" ? {
                  background: "linear-gradient(135deg, #D4AF37, #B8860B)",
                  boxShadow: "0 2px 12px rgba(212,175,55,0.25)",
                } : {}}
              >
                Reçus ({received.length})
                {hasPending && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {received.filter((p) => p.status === "pending").length}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setTab("sent")}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                  tab === "sent"
                    ? "text-white"
                    : "text-gray-400 hover:text-gray-200 bg-white/5"
                }`}
                style={tab === "sent" ? {
                  background: "linear-gradient(135deg, #D4AF37, #B8860B)",
                  boxShadow: "0 2px 12px rgba(212,175,55,0.25)",
                } : {}}
              >
                Envoyés ({sent.length})
              </button>
            </div>

            {/* Ping list */}
            <div
              className={`transition-all duration-700 ease-out ${
                visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
              }`}
              style={{ transitionDelay: "200ms" }}
            >
              {loading ? (
                <div className="flex justify-center py-16">
                  <FontAwesomeIcon icon={faSpinner} className="text-gold text-3xl animate-spin" />
                </div>
              ) : activePings.length === 0 ? (
                <div
                  className="rounded-2xl overflow-hidden p-8 text-center"
                  style={{
                    background: "white",
                    border: "1px solid rgba(0,0,0,0.08)",
                  }}
                >
                  <FontAwesomeIcon icon={faBellSlash} className="text-gray-300 text-3xl mb-3" />
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
        </main>
      </div>
    </div>
  );
}
