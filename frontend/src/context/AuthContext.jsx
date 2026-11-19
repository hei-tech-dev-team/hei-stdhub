import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import api from "../api/axios";
import authApi from "../api/authApi";
import {
  applyAuthResponse,
  refreshAccessToken,
  clearAuth,
} from "../api/session";
import {
  hasSessionHint,
  isAccessTokenExpiringSoon,
  clearLegacyStorage,
} from "../api/tokenStore";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [firstLogin, setFirstLogin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const pushUserId = useRef(null);

  const connectSocket = useCallback(() => {
    import("../socket")
      .then(({ refreshSocket }) => refreshSocket().catch(() => {}))
      .catch(() => {});
  }, []);

  const maybeSubscribePush = useCallback((userId) => {
    if (!userId || pushUserId.current === userId) return;
    pushUserId.current = userId;
    import("../push")
      .then(({ subscribeToPush, isSubscribedToPush }) =>
        subscribeToPush()
          .then(() => isSubscribedToPush().then(setPushSubscribed))
          .catch(() => {}),
      )
      .catch(() => {});
  }, []);

  const handleRevoked = useCallback(() => {
    import("../socket")
      .then(({ disconnectSocket }) => disconnectSocket())
      .catch(() => {});
    clearAuth();
    setUser(null);
    setFirstLogin(false);
    pushUserId.current = null;
    if (window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
  }, []);

  useEffect(() => {
    clearLegacyStorage();

    if (!hasSessionHint()) {
      setLoading(false);
      return;
    }

    let active = true;
    refreshAccessToken()
      .then((data) => {
        if (!active) return;
        setUser(data.user);
        connectSocket();
        maybeSubscribePush(data.user.id);
      })
      .catch((err) => {
        if (!active) return;
        if ([401, 403].includes(err.response?.status)) clearAuth();
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [connectSocket, maybeSubscribePush]);

  useEffect(() => {
    const onRevoked = () => handleRevoked();
    window.addEventListener("auth:session-revoked", onRevoked);
    return () => window.removeEventListener("auth:session-revoked", onRevoked);
  }, [handleRevoked]);

  useEffect(() => {
    if (!user) return undefined;

    const refreshIfNeeded = () => {
      if (!isAccessTokenExpiringSoon(90)) return;
      refreshAccessToken().catch((err) => {
        if ([401, 403].includes(err.response?.status)) handleRevoked();
      });
    };

    const interval = setInterval(refreshIfNeeded, 30000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") refreshIfNeeded();
    };

    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [user, handleRevoked]);

  const applySession = useCallback(
    (data) => {
      applyAuthResponse(data);
      if (data.user) {
        setUser(data.user);
        maybeSubscribePush(data.user.id);
      }
      if (data.first_login) setFirstLogin(true);
      connectSocket();
      return data;
    },
    [connectSocket, maybeSubscribePush],
  );

  const login = async (ref, password) => {
    const { data } = await authApi.post("/login", { ref, password });
    applySession(data);
    return data.user;
  };

  const register = async (formData) => {
    const { data } = await authApi.post("/register", formData);
    applySession(data);
    return data.user;
  };

  const dismissOnboarding = () => setFirstLogin(false);

  const cleanupLocalSession = () => {
    import("../socket")
      .then(({ disconnectSocket }) => disconnectSocket())
      .catch(() => {});
    import("../push")
      .then(({ unsubscribeFromPush }) =>
        unsubscribeFromPush()
          .then(() => setPushSubscribed(false))
          .catch(() => {}),
      )
      .catch(() => {});
    clearAuth();
    setUser(null);
    setFirstLogin(false);
    pushUserId.current = null;
  };

  const logout = async () => {
    try {
      await authApi.post("/logout");
    } catch {}
    cleanupLocalSession();
  };

  const logoutAll = async () => {
    try {
      await api.post("/auth/logout-all");
    } catch {}
    cleanupLocalSession();
  };

  const changePassword = async (current, newPassword) => {
    const { data } = await api.patch("/auth/password", {
      current,
      newPassword,
    });
    applyAuthResponse(data);
    if (data.user) setUser(data.user);
    connectSocket();
    return data;
  };

  const setUserAndSync = (userData) => {
    setUser(userData);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser: setUserAndSync,
        login,
        register,
        logout,
        logoutAll,
        changePassword,
        applySession,
        loading,
        firstLogin,
        dismissOnboarding,
        pushSubscribed,
        setPushSubscribed,
      }}
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
