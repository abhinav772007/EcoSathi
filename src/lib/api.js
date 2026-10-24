import { supabase } from '@/lib/supabase';

const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3001').replace(/\/$/, '');

function errorMessage(body) {
  const detail = body?.detail ?? body?.error;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map((item) => item?.msg || JSON.stringify(item)).join('; ') || 'Request failed';
  }
  if (detail && typeof detail === 'object') return detail.message || JSON.stringify(detail);
  return 'Request failed';
}

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
  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json')
    ? await response.json().catch(() => ({}))
    : {};
  if (!response.ok) throw new Error(errorMessage(body));
  return body;
}
