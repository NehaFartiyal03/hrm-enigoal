import { createContext, useContext, useEffect, useState } from "react";
import api from "../api/axios";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadMe = async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data.data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (localStorage.getItem("hrm_token")) loadMe();
    else setLoading(false);
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("hrm_token", data.token);
    await loadMe();
    return data.user;
  };

  const logout = async () => {
    try { await api.post("/auth/logout"); } catch { /* already gone */ }
    localStorage.removeItem("hrm_token");
    setUser(null);
  };

  const can = (...roles) => roles.includes(user?.role);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, can, refresh: loadMe }}>
      {children}
    </AuthContext.Provider>
  );
}
