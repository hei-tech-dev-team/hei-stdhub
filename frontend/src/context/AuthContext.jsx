import { createContext, useContext, useState, useEffect } from "react";
import api from "../api/axios";
import { getSocket } from "../socket";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

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
        const socket = getSocket();
        if (!socket.connected) {
          socket.connect();
          socket.emit("user:join", data.id);
        }
      })
      .catch(() => localStorage.removeItem("hei_token"))
      .finally(() => setLoading(false));
  }, []);

  const login = async (ref, password) => {
    const { data } = await api.post("/auth/login", { ref, password });
    localStorage.setItem("hei_token", data.token);
    setUser(data.user);
    const socket = getSocket();
    if (!socket.connected) {
      socket.connect();
      socket.emit("user:join", data.user.id);
    }
    return data.user;
  };

  const register = async (formData) => {
    const { data } = await api.post("/auth/register", formData);
    localStorage.setItem("hei_token", data.token);
    setUser(data.user);
    const socket = getSocket();
    if (!socket.connected) {
      socket.connect();
      socket.emit("user:join", data.user.id);
    }
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem("hei_token");
    const socket = getSocket();
    socket.disconnect();
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
