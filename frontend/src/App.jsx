import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import LoginPage    from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import HomePage     from "./pages/HomePage";
import ArchivesPage from "./pages/ArchivesPage";
import TDPage       from "./pages/TDPage";
import ChatPage     from "./pages/ChatPage";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  // Token en cours de vérification → écran de chargement
  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-navy border-t-gold
                          rounded-full animate-spin" />
          <p className="text-navy font-semibold text-sm">Chargement...</p>
        </div>
      </div>
    );
  }

  // Token invalide ou absent → login
  if (!user) return <Navigate to="/login" replace />;

  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login"    element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route path="/" element={
        <ProtectedRoute><HomePage /></ProtectedRoute>
      } />
      <Route path="/archives" element={
        <ProtectedRoute><ArchivesPage /></ProtectedRoute>
      } />
      <Route path="/td" element={
        <ProtectedRoute><TDPage /></ProtectedRoute>
      } />
      <Route path="/chat" element={
        <ProtectedRoute><ChatPage /></ProtectedRoute>
      } />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}