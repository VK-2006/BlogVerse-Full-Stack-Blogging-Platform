import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api from "../services/api";

const AuthContext = createContext(null);

function readSavedUser() {
  try {
    const saved = localStorage.getItem("blogverse_user");
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.warn("Invalid saved BlogVerse user was cleared.", error);
    localStorage.removeItem("blogverse_user");
    localStorage.removeItem("blogverse_token");
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readSavedUser);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [notice, setNotice] = useState(null);

  const clearSession = useCallback(() => {
    localStorage.removeItem("blogverse_token");
    localStorage.removeItem("blogverse_user");
    setUser(null);
    setAuthError("");
  }, []);

  const updateUser = useCallback((nextUser) => {
    if (!nextUser) {
      localStorage.removeItem("blogverse_user");
      setUser(null);
      return;
    }

    try {
      localStorage.setItem("blogverse_user", JSON.stringify(nextUser));
    } catch (error) {
      console.warn("Could not save BlogVerse user locally.", error);
    }
    setUser(nextUser);
    setAuthError("");
  }, []);

  const saveSession = useCallback((data) => {
    localStorage.setItem("blogverse_token", data.token);
    updateUser(data.user);
    setNotice({
      type: data.recovered ? "recovered" : "success",
      title: data.recovered ? "Account recovered" : "Welcome to BlogVerse",
      message: data.prompt || data.message || "Login successful."
    });
  }, [updateUser]);

  useEffect(() => {
    let active = true;
    const token = localStorage.getItem("blogverse_token");

    if (!token) {
      setLoading(false);
      return () => { active = false; };
    }

    const controller = new AbortController();
    const safetyTimer = window.setTimeout(() => {
      controller.abort();
      if (active) {
        setAuthError("Login verification took too long. You can retry by reloading the page.");
        setLoading(false);
      }
    }, 9000);

    api.get("/auth/me", { signal: controller.signal, skipRetry: true })
      .then(({ data }) => {
        if (active) updateUser(data.user);
      })
      .catch((error) => {
        if (!active) return;
        if (error.name === "CanceledError" || error.code === "ERR_CANCELED") return;

        if (["ACCOUNT_DISABLED", "ACCOUNT_PENDING_DELETION"].includes(error.code)) {
          clearSession();
          setNotice({
            type: "warning",
            title: error.code === "ACCOUNT_DISABLED" ? "Account disabled" : "Account deletion pending",
            message: error.message
          });
          return;
        }

        const isUnauthorized = error.status === 401 || /invalid|expired|authentication/i.test(error.message || "");
        if (isUnauthorized) clearSession();
        else setAuthError(error.message || "Unable to verify your session.");
      })
      .finally(() => {
        window.clearTimeout(safetyTimer);
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      window.clearTimeout(safetyTimer);
      controller.abort();
    };
  }, [clearSession, updateUser]);

  useEffect(() => {
    function handleAccountStatus(event) {
      clearSession();
      setNotice({
        type: "warning",
        title: event.detail?.code === "ACCOUNT_DISABLED" ? "Account disabled" : "Session ended",
        message: event.detail?.message || "Your account is no longer available."
      });
    }

    window.addEventListener("blogverse:account-status", handleAccountStatus);
    return () => window.removeEventListener("blogverse:account-status", handleAccountStatus);
  }, [clearSession]);

  useEffect(() => {
    const token = localStorage.getItem("blogverse_token");
    if (!user || !token) return undefined;

    let active = true;
    const heartbeat = () => {
      if (!active || document.visibilityState !== "visible") return;
      api.post("/auth/heartbeat", {}, { skipRetry: true }).catch((error) => {
        if (["ACCOUNT_DISABLED", "ACCOUNT_PENDING_DELETION"].includes(error.code)) {
          clearSession();
          setNotice({
            type: "warning",
            title: error.code === "ACCOUNT_DISABLED" ? "Account disabled" : "Account deletion pending",
            message: error.message
          });
        }
      });
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible") heartbeat();
    };

    const sendOffline = () => {
      const currentToken = localStorage.getItem("blogverse_token");
      if (!currentToken || !navigator.sendBeacon) return;
      const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
      const body = new URLSearchParams({ token: currentToken });
      navigator.sendBeacon(`${baseUrl}/auth/offline`, body);
    };

    heartbeat();
    const timer = window.setInterval(heartbeat, 30000);
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pagehide", sendOffline);

    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pagehide", sendOffline);
    };
  }, [user, clearSession]);

  async function login(credentials) {
    const { data } = await api.post("/auth/login", credentials);
    saveSession(data);
    return data;
  }

  async function register(payload) {
    const { data } = await api.post("/auth/register", payload);
    saveSession(data);
    return data;
  }

  async function recoverAccount(recoveryToken) {
    const { data } = await api.post("/auth/recover-account", { recoveryToken });
    saveSession(data);
    return data;
  }

  function logout(options = {}) {
    const token = localStorage.getItem("blogverse_token");
    if (token) api.post("/auth/offline", { token }, { skipRetry: true }).catch(() => {});
    clearSession();
    if (!options.silent) {
      setNotice({ type: "info", title: "Signed out", message: "You have been signed out safely." });
    }
  }

  const value = useMemo(
    () => ({
      user,
      loading,
      authError,
      notice,
      login,
      register,
      recoverAccount,
      logout,
      updateUser,
      clearNotice: () => setNotice(null),
      showNotice: setNotice,
      isAuthenticated: Boolean(user)
    }),
    [user, loading, authError, notice, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider.");
  return context;
}
