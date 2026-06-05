import { Helmet } from "react-helmet-async";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import HomePage from "./pages/HomePage";
import ArchivesPage from "./pages/ArchivesPage";
import TDPage from "./pages/TDPage";
import ChatPage from "./pages/ChatPage";
import AdminPage from "./pages/AdminPage";
import ProfilePage from "./pages/ProfilePage";
import SuggestionPage from "./pages/SuggestionPage";
import BDEPage from "./pages/BDEPage";
import UserProfilePage from "./pages/UserProfilePage";
import PingBoxPage from "./pages/PingBoxPage";
import STDnewsPage from "./pages/STDnewsPage";
import AlumniSpotlightPage from "./pages/AlumniSpotlightPage";
import OnboardingModal from "./components/ui/OnboardingModal";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-10 h-10 border-4 border-navy border-t-gold
                          rounded-full animate-spin"
          />
          <p className="text-navy font-semibold text-sm">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user || user.role !== "admin") return <Navigate to="/" replace />;
  return children;
}

function BDERoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user || user.role !== "bde") return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const { user, firstLogin } = useAuth();

  return (
    <>
      <Helmet>
        <title>HEI STDhub</title>
        <meta name="description" content="HEI STDhub – la plateforme étudiante de l'HEI pour partager les cours, TDs, archives et suivre l'actualité du campus. Connexion entre étudiants et enseignants." />
        <meta name="keywords" content="HEI STDhub, HEI stdhub, hei-stdhub, HEI students, HEI étudiants, HEI cours, HEI TD, HEI archives, HEI campus" />
        <meta name="robots" content="index, follow" />
        <meta name="google-site-verification" content="XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" />
        <link rel="canonical" href="https://hei-stdhub.vercel.app" />
      </Helmet>
      <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/archives"
        element={
          <ProtectedRoute>
            <ArchivesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/td"
        element={
          <ProtectedRoute>
            <TDPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <ChatPage />
          </ProtectedRoute>
        }
      />
      <Route
        // Open to both students and teachers
        path="/suggestions"
        element={
          <ProtectedRoute>
            <SuggestionPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/bde"
        element={
          <BDERoute>
            <BDEPage />
          </BDERoute>
        }
      />
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminPage />
          </AdminRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/user/:ref"
        element={
          <ProtectedRoute>
            <UserProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pings"
        element={
          <ProtectedRoute>
            <PingBoxPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/stdnews"
        element={
          <ProtectedRoute>
            <STDnewsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/alumni-spotlight"
                element={
                  <ProtectedRoute>
            <AlumniSpotlightPage />
          </ProtectedRoute>
        }
      />

      </Routes>
      {user && firstLogin && <OnboardingModal />}
    </>
  );
}
