import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEMO_USERS, ROLE_DEFINITIONS } from '@/data/campus';
import { apiRequest } from '@/lib/api';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext(null);
const STORAGE_KEY = 'ecosathi_active_user';

function initialsFromName(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'ES';
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join('') || 'ES';
}

function loadSavedUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.role && ['administrator', 'worker', 'resident'].includes(parsed.role)) {
        return parsed;
      }
    }
  } catch {
    // Ignore localStorage parse errors
  }
  return DEMO_USERS[0]; // Default to Administrator
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(loadSavedUser);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);

  // Persist user whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentUser));
    } catch {
      // Ignore storage write errors
    }
  }, [currentUser]);

  // Optional background Supabase session sync (does not block if offline)
  useEffect(() => {
    if (!supabase) return undefined;

    let cancelled = false;

    async function syncSession(nextSession) {
      setSession(nextSession);
      if (!nextSession?.user) return;
      try {
        const me = await apiRequest('/api/me');
        if (!cancelled && me) {
          setCurrentUser((prev) => ({
            ...prev,
            id: me.id || prev.id,
            name: me.name || prev.name,
            role: me.role || prev.role || 'administrator',
            email: nextSession.user.email || prev.email,
          }));
        }
      } catch {
        // Backend not reachable; keep local profile
      }
    }

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!cancelled && data?.session) syncSession(data.session);
      })
      .catch(() => {
        // Network or DNS error; ignore and use local state
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      syncSession(nextSession);
    });

    return () => {
      cancelled = true;
      listener?.subscription?.unsubscribe?.();
    };
  }, []);

  const switchRole = useCallback((newRole) => {
    if (!['administrator', 'worker', 'resident'].includes(newRole)) return;
    const matchingDemo = DEMO_USERS.find((item) => item.role === newRole);
    setCurrentUser((prev) => {
      if (matchingDemo && prev.id?.startsWith('user-')) {
        return { ...matchingDemo };
      }
      return {
        ...prev,
        role: newRole,
      };
    });
    // Attempt backend role update if online
    apiRequest('/api/me/role', {
      method: 'PATCH',
      body: JSON.stringify({ role: newRole }),
    }).catch(() => {
      // Offline; local state already updated
    });
  }, []);

  const demoLogin = useCallback((role = 'administrator') => {
    const demo = DEMO_USERS.find((item) => item.role === role) || DEMO_USERS[0];
    setCurrentUser({ ...demo });
  }, []);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      // Try backend proxied login if available
      const sessionData = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (supabase && sessionData?.access_token) {
        await supabase.auth.setSession({
          access_token: sessionData.access_token,
          refresh_token: sessionData.refresh_token,
        });
      }
      // Fetch profile
      try {
        const me = await apiRequest('/api/me');
        setCurrentUser({
          id: me.id,
          name: me.name || email.split('@')[0],
          email,
          role: me.role || 'administrator',
        });
      } catch {
        setCurrentUser({
          id: 'user-logged-in',
          name: email.split('@')[0],
          email,
          role: 'administrator',
        });
      }
      return { ok: true };
    } catch (error) {
      // Check if matches a demo account
      const matchedDemo = DEMO_USERS.find(
        (u) => u.email.toLowerCase() === email.trim().toLowerCase()
      );
      if (matchedDemo) {
        setCurrentUser({ ...matchedDemo });
        return { ok: true, offline: true };
      }
      // If backend is unreachable, allow logging in locally
      if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
        const fallbackUser = {
          id: `user-${Date.now()}`,
          name: email.split('@')[0],
          email,
          role: 'administrator',
        };
        setCurrentUser(fallbackUser);
        return { ok: true, offline: true };
      }
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (name, email, password, role = 'resident') => {
    setLoading(true);
    try {
      await apiRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password, role }),
      });
      // Now login
      return await login(email, password);
    } catch (error) {
      // If backend is unreachable, register locally
      if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
        const localUser = {
          id: `user-${Date.now()}`,
          name,
          email,
          role: role || 'resident',
        };
        setCurrentUser(localUser);
        return { ok: true, offline: true };
      }
      throw error;
    } finally {
      setLoading(false);
    }
  }, [login]);

  const signOut = useCallback(async () => {
    try {
      if (supabase) await supabase.auth.signOut();
    } catch {
      // Ignore signout error
    }
    // Switch to Resident or Guest demo
    const residentDemo = DEMO_USERS.find((item) => item.role === 'resident') || DEMO_USERS[2];
    setCurrentUser({ ...residentDemo });
  }, []);

  const value = useMemo(() => {
    const role = currentUser?.role || 'administrator';
    const displayName = currentUser?.name || 'EcoSathi User';
    const email = currentUser?.email || 'user@ecosathi.campus';
    const roleMeta = ROLE_DEFINITIONS[role] || ROLE_DEFINITIONS.administrator;

    return {
      user: currentUser,
      session,
      profile: currentUser,
      role,
      roleMeta,
      displayName,
      email,
      initials: initialsFromName(displayName),
      loading,
      configured: Boolean(supabase),
      switchRole,
      demoLogin,
      login,
      register,
      signOut,
    };
  }, [currentUser, demoLogin, loading, login, register, session, signOut, switchRole]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
