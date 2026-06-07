import { createContext, useContext, useState, useEffect, useRef } from "react";
import api from "../api/axios";
import { refreshSocket, disconnectSocket } from "../socket";
import { isSubscribedToPush, subscribeToPush, unsubscribeFromPush } from "../push";

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
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const subscribeAttempted = useRef(false);

  useEffect(() => {
    const token = localStorage.getItem("hei_token");

    if (!token) {
      setLoading(false);
      return;
    }

    api
      .get("/auth/me")
      .then(({ data }) => {
        setUser(data);
        localStorage.setItem("hei_user", JSON.stringify(data));
        if (!subscribeAttempted.current) {
          subscribeAttempted.current = true;
          subscribeToPush().then(() => isSubscribedToPush().then(setPushSubscribed));
        }
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

  useEffect(() => {
    subscribeAttempted.current = false;
  }, [user?.id]);

  const login = async (ref, password) => {
    const { data } = await api.post("/auth/login", { ref, password });
    localStorage.setItem("hei_token", data.token);
    localStorage.setItem("hei_user", JSON.stringify(data.user));
    setUser(data.user);
    if (data.first_login) setFirstLogin(true);
    refreshSocket().catch(() => {});
    return data.user;
  };

  const register = async (formData) => {
    const { data } = await api.post("/auth/register", formData);
    localStorage.setItem("hei_token", data.token);
    localStorage.setItem("hei_user", JSON.stringify(data.user));
    setUser(data.user);
    if (data.first_login) setFirstLogin(true);
    refreshSocket().catch(() => {});
    return data.user;
  };

  const dismissOnboarding = () => setFirstLogin(false);

  const logout = () => {
    disconnectSocket();
    unsubscribeFromPush().then(() => setPushSubscribed(false));
    localStorage.removeItem("hei_token");
    localStorage.removeItem("hei_user");
    setUser(null);
  };

  const setUserAndSync = (userData) => {
    setUser(userData);
    if (userData) localStorage.setItem("hei_user", JSON.stringify(userData));
    else localStorage.removeItem("hei_user");
  };

  return (
    <AuthContext.Provider
      value={{ user, setUser: setUserAndSync, login, register, logout, loading, firstLogin, dismissOnboarding, pushSubscribed, setPushSubscribed }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
