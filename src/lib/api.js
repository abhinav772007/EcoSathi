import { supabase } from '@/lib/supabase';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export async function apiRequest(path, options = {}) {
  const { data } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(data.session?.access_token ? { Authorization: `Bearer ${data.session.access_token}` } : {}),
      ...options.headers,
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'Request failed');
  return body;
}
