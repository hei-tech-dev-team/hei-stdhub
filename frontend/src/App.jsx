import { lazy, Suspense, useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import OnboardingModal from "./components/ui/OnboardingModal";

const LoginPage = lazy(() => import("./pages/LoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const HomePage = lazy(() => import("./pages/HomePage"));
const ArchivesPage = lazy(() => import("./pages/ArchivesPage"));
const TDPage = lazy(() => import("./pages/TDPage"));
const ChatPage = lazy(() => import("./pages/ChatPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const SuggestionPage = lazy(() => import("./pages/SuggestionPage"));
const BDEPage = lazy(() => import("./pages/BDEPage"));
const UserProfilePage = lazy(() => import("./pages/UserProfilePage"));
const PingBoxPage = lazy(() => import("./pages/PingBoxPage"));
const STDnewsPage = lazy(() => import("./pages/STDnewsPage"));
const AlumniSpotlightPage = lazy(() => import("./pages/AlumniSpotlightPage"));

function LoadingFallback() {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 5000);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-navy border-t-gold rounded-full animate-spin" />
        <p className="text-navy font-semibold text-sm">
          {slow ? "Le chargement peut varier selon la connexion, merci de patienter..." : "Chargement..."}
        </p>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingFallback />;
  }

  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingFallback />;
  if (!user || user.role !== "admin") return <Navigate to="/" replace />;
  return children;
}

function BDERoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingFallback />;
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
        <meta name="google-site-verification" content="0aPPiamPtnQc4mFJun2ATrN1P8--rtRj2aaan-nNM3Q" />
        <link rel="canonical" href="https://hei-stdhub.vercel.app" />
      </Helmet>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
          <Route path="/archives" element={<ProtectedRoute><ArchivesPage /></ProtectedRoute>} />
          <Route path="/td" element={<ProtectedRoute><TDPage /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
          <Route path="/suggestions" element={<ProtectedRoute><SuggestionPage /></ProtectedRoute>} />
          <Route path="/bde" element={<BDERoute><BDEPage /></BDERoute>} />
          <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          <Route path="/user/:ref" element={<ProtectedRoute><UserProfilePage /></ProtectedRoute>} />
          <Route path="/pings" element={<ProtectedRoute><PingBoxPage /></ProtectedRoute>} />
          <Route path="/stdnews" element={<ProtectedRoute><STDnewsPage /></ProtectedRoute>} />
          <Route path="/alumni-spotlight" element={<ProtectedRoute><AlumniSpotlightPage /></ProtectedRoute>} />
        </Routes>
      </Suspense>
      {user && firstLogin && <OnboardingModal />}
    </>
  );
}
