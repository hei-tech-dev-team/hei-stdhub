import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const AuthContext = createContext(null);

// URL de base de l'API
const API = "http://localhost:3001/api";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // vrai au démarrage

  // ── Au démarrage : si un token existe en localStorage, récupérer le profil ──
  useEffect(() => {
    const token = localStorage.getItem("hei_token");
    if (!token) {
      setLoading(false);
      return;
    }
    axios
      .get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(({ data }) => {
        setUser(data);
        // Injecter le token dans tous les futurs appels Axios
        axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      })
      .catch(() => {
        // Token expiré ou invalide → on nettoie
        localStorage.removeItem("hei_token");
      })
      .finally(() => setLoading(false));
  }, []);

  // ── Connexion ──
  const login = async (ref, password) => {
    const { data } = await axios.post(`${API}/auth/login`, { ref, password });
    localStorage.setItem("hei_token", data.token);
    axios.defaults.headers.common["Authorization"] = `Bearer ${data.token}`;
    setUser(data.user);
    return data.user;
  };

  // ── Inscription ──
  const register = async (formData) => {
    const { data } = await axios.post(`${API}/auth/register`, formData);
    localStorage.setItem("hei_token", data.token);
    axios.defaults.headers.common["Authorization"] = `Bearer ${data.token}`;
    setUser(data.user);
    return data.user;
  };

  // ── Déconnexion ──
  const logout = () => {
    localStorage.removeItem("hei_token");
    delete axios.defaults.headers.common["Authorization"];
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
