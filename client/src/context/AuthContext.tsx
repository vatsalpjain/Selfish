import { createContext, useState, useEffect, type ReactNode } from "react";
import { login as apiLogin, register as apiRegister, getMe } from "../services/api";

interface User {
  id: string;
  username: string;
  email: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Check for existing token on app load
    const checkAuth = async () => {
      const savedToken = localStorage.getItem("token");
      if (savedToken) {
        try {
          // Verify token by fetching user data
          const userData = await getMe();
          setToken(savedToken);
          setUser(userData);
        } catch (error) {
          // Token invalid, clear it
          localStorage.removeItem("token");
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  // Login Function
  const login = async (email: string, password: string) => {
    const data = await apiLogin(email, password);
    setToken(data.token);
    setUser({
      id: data.id,
      username: data.username,
      email: data.email
    });
    localStorage.setItem("token", data.token);
  };

  // Register Function
  const register = async (username: string, email: string, password: string) => {
    const data = await apiRegister(username, email, password);
    setToken(data.token);
    setUser({
      id: data.id,
      username: data.username,
      email: data.email
    });
    localStorage.setItem("token", data.token);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
  };

  const value = { user, token, login, register, logout, loading };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};