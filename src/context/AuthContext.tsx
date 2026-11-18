import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api, setAuthToken } from '../services/api';
import type { User } from '../types';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isDemoSession: boolean;
  isLoading: boolean;
  login: (email: string, password: string, isDemo?: boolean) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  loginDemo: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const SESSION_KEY = 'voxlead_session_token';
const DEMO_FLAG_KEY = 'voxlead_demo_session';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isDemoSession, setIsDemoSession] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const saved = sessionStorage.getItem(SESSION_KEY);
    const savedDemo = sessionStorage.getItem(DEMO_FLAG_KEY) === 'true';
    if (!saved) {
      setIsLoading(false);
      return;
    }

    setAuthToken(saved);
    api
      .me()
      .then((me) => {
        setUser(me);
        setIsDemoSession(savedDemo);
      })
      .catch(() => {
        sessionStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem(DEMO_FLAG_KEY);
        setAuthToken(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string, isDemo = false) => {
    const res = await api.login({ email, password });
    setAuthToken(res.access_token);
    sessionStorage.setItem(SESSION_KEY, res.access_token);
    sessionStorage.setItem(DEMO_FLAG_KEY, String(isDemo));
    setUser(res.user);
    setIsDemoSession(isDemo);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const res = await api.register({ name, email, password });
    setAuthToken(res.access_token);
    sessionStorage.setItem(SESSION_KEY, res.access_token);
    sessionStorage.setItem(DEMO_FLAG_KEY, 'false');
    setUser(res.user);
    setIsDemoSession(false);
  }, []);

  const loginDemo = useCallback(async () => {
    await login('demo@voxlead.ai', 'VoxLeadDemo2026!', true);
  }, [login]);

  const logout = useCallback(() => {
    setAuthToken(null);
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(DEMO_FLAG_KEY);
    setUser(null);
    setIsDemoSession(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isDemoSession,
        isLoading,
        login,
        register,
        loginDemo,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
