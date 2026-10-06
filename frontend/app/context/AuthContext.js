"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  getStoredToken,
  setStoredToken,
  getStoredUser,
  setStoredUser,
  clearAuthStorage,
  fetchMeApi,
} from "../utils/api";

const AuthContext = createContext({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = getStoredToken();
      const storedUser = getStoredUser();

      if (storedToken) {
        setToken(storedToken);
        setUser(storedUser);

        try {
          // Verify token validity with backend
          const res = await fetchMeApi(storedToken);
          if (res?.user) {
            setUser(res.user);
            setStoredUser(res.user);
          }
        } catch (_err) {
          // Token is invalid or expired
          clearAuthStorage();
          setToken(null);
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    setStoredToken(authToken);
    setStoredUser(userData);
  };

  const logout = () => {
    clearAuthStorage();
    setUser(null);
    setToken(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
