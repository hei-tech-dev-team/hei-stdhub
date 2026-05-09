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
  const [firstLogin, setFirstLogin] = useState(false);
  const [loading, setLoading] = useState(() =>
    Boolean(localStorage.getItem("hei_token")),
  );

  useEffect(() => {
    const token = localStorage.getItem("hei_token");

    if (!token) return;

    api
      .get("/auth/me")
      .then(({ data }) => {
        setUser(data);
        localStorage.setItem("hei_user", JSON.stringify(data));
      })
      .catch((err) => {
        if (err.response?.status === 401) {
          localStorage.removeItem("hei_token");
          localStorage.removeItem("hei_user");
          setUser(null);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (ref, password) => {
    const { data } = await api.post("/auth/login", { ref, password });
    localStorage.setItem("hei_token", data.token);
    localStorage.setItem("hei_user", JSON.stringify(data.user));
    setUser(data.user);
    if (data.first_login) setFirstLogin(true);
    return data.user;
  };

  const register = async (formData) => {
    const { data } = await api.post("/auth/register", formData);
    localStorage.setItem("hei_token", data.token);
    localStorage.setItem("hei_user", JSON.stringify(data.user));
    setUser(data.user);
    if (data.first_login) setFirstLogin(true);
    return data.user;
  };

  const dismissOnboarding = () => setFirstLogin(false);

  const logout = () => {
    localStorage.removeItem("hei_token");
    localStorage.removeItem("hei_user");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, setUser, login, register, logout, loading, firstLogin, dismissOnboarding }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
