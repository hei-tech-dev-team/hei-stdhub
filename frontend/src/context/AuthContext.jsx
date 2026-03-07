import { createContext, useContext, useState, useEffect } from "react";
import api from "../api/axios";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("hei_token");
    const savedUser = localStorage.getItem("hei_user");

    if (!token) {
      setLoading(false);
      return;
    }

    // Charger l'user depuis localStorage immédiatement
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (_) {}
    }

    // Puis rafraîchir depuis l'API en arrière-plan
    api
      .get("/auth/me")
      .then(({ data }) => {
        setUser(data);
        localStorage.setItem("hei_user", JSON.stringify(data));
      })
      .catch((err) => {
        // Supprimer seulement si vrai 401
        if (err.response?.status === 401) {
          localStorage.removeItem("hei_token");
          localStorage.removeItem("hei_user");
          setUser(null);
        }
        // Erreur réseau = cold start Render, on garde l'user en cache
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (ref, password) => {
    const { data } = await api.post("/auth/login", { ref, password });
    localStorage.setItem("hei_token", data.token);
    localStorage.setItem("hei_user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const register = async (formData) => {
    const { data } = await api.post("/auth/register", formData);
    localStorage.setItem("hei_token", data.token);
    localStorage.setItem("hei_user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem("hei_token");
    localStorage.removeItem("hei_user");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, setUser, login, register, logout, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
