import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '@/lib/api';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext(null);

function initialsFromName(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'ES';
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join('') || 'ES';
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(Boolean(supabase));

  useEffect(() => {
    if (!supabase) return undefined;

    let cancelled = false;

    async function syncSession(nextSession) {
      setSession(nextSession);
      if (!nextSession?.user) {
        setProfile(null);
        setLoading(false);
        return;
      }
      try {
        const me = await apiRequest('/api/me');
        if (!cancelled) {
          setProfile({
            id: me.id,
            name: me.name || nextSession.user.user_metadata?.full_name || nextSession.user.email || 'EcoSathi user',
            role: me.role || 'resident',
          });
        }
      } catch {
        if (!cancelled) {
          const fallbackName =
            nextSession.user.user_metadata?.full_name || nextSession.user.email || 'EcoSathi user';
          setProfile({
            id: nextSession.user.id,
            name: fallbackName,
            role: 'resident',
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    supabase.auth.getSession().then(({ data }) => syncSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setLoading(true);
      syncSession(nextSession);
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(() => {
    const displayName = profile?.name || session?.user?.user_metadata?.full_name || session?.user?.email || 'EcoSathi user';
    const role = profile?.role || 'resident';
    return {
      session,
      user: session?.user ?? null,
      profile,
      displayName,
      role,
      initials: initialsFromName(displayName),
      loading,
      configured: Boolean(supabase),
      signOut: () => supabase?.auth.signOut(),
    };
  }, [loading, profile, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
