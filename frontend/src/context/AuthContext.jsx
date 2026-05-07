/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from "react";
import api from "../api/axios";

const AuthContext = createContext(null);

const getSavedUser = () => {
  const savedUser = localStorage.getItem("hei_user");
  if (!savedUser) return null;

  try {
    return JSON.parse(savedUser);
  } catch {
    localStorage.removeItem("hei_user");
    return null;
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getSavedUser);
  const [loading, setLoading] = useState(() =>
    Boolean(localStorage.getItem("hei_token")),
  );

  useEffect(() => {
    const token = localStorage.getItem("hei_token");

    if (!token) return;

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
