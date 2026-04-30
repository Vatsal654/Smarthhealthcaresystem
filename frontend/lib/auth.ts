'use client';

import { useEffect, useState } from 'react';
import { api } from './api';

export type Role = 'patient' | 'doctor' | 'admin';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl?: string;
}

export function saveSession(token: string, user: AuthUser) {
  localStorage.setItem('shs_token', token);
  localStorage.setItem('shs_user', JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem('shs_token');
  localStorage.removeItem('shs_user');
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('shs_user');
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('shs_token');
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    setUser(getStoredUser());
    api
      .get('/auth/me')
      .then(({ data }) => {
        setUser(data.user);
        localStorage.setItem('shs_user', JSON.stringify(data.user));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { user, loading, setUser };
}
