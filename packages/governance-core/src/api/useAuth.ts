import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, getToken, setToken } from './client';
import type { ApiUser, Role } from './types';

interface AuthResponse {
  token: string;
  user: ApiUser;
}

export function useAuth() {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hydrate = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const res = await api.get<{ user: ApiUser }>('/api/auth/me');
      setUser(res.user);
    } catch {
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      const res = await api.post<AuthResponse>('/api/auth/login', { email, password }, { auth: false });
      setToken(res.token);
      setUser(res.user);
      return true;
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not reach the server');
      return false;
    }
  }, []);

  const register = useCallback(async (email: string, password: string, displayName: string, role: Role) => {
    setError(null);
    try {
      const res = await api.post<AuthResponse>('/api/auth/register', { email, password, displayName, role }, { auth: false });
      setToken(res.token);
      setUser(res.user);
      return true;
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not reach the server');
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (patch: { displayName?: string; role?: Role }) => {
    try {
      const res = await api.patch<{ user: ApiUser }>('/api/auth/me', patch);
      setUser(res.user);
      return true;
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not reach the server');
      return false;
    }
  }, []);

  return { user, loading, error, login, register, logout, updateProfile };
}
