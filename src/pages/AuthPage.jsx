import { useState } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { Leaf, ArrowUpRight } from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export function AuthPage() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState(pathname === '/signup' ? 'signup' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Already logged in — go straight to dashboard
  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage('');
    setSuccess(false);
    if (!supabase) {
      return setMessage('Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local first.');
    }

    setSubmitting(true);
    try {
      if (mode === 'signup') {
        await apiRequest('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({ email, password, name }),
        });
        setSuccess(true);
        setMessage('Account created! Signing you in…');
      }

      // Use backend-proxied login for reliable sign-in with clear error messages
      const sessionData = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      // Establish the session client-side so AuthContext picks it up
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: sessionData.access_token,
        refresh_token: sessionData.refresh_token,
      });
      if (sessionError) {
        setSuccess(false);
        setMessage(`Session error: ${sessionError.message}`);
        return;
      }
      // Session is set — navigate to dashboard
      navigate('/', { replace: true });
    } catch (error) {
      setSuccess(false);
      setMessage(error.message || 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand"><span className="brand-mark"><Leaf size={19} /></span><b>Eco<span>Sathi</span></b></div>
        <div className="eyebrow">Campus operations workspace</div>
        <h1>{mode === 'login' ? 'Welcome back' : 'Create your workspace account'}</h1>
        <p className="auth-subtitle">
          {mode === 'login' ? 'Sign in to manage reports and collection routes.' : 'Start coordinating cleaner, healthier campus spaces.'}
        </p>
        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'signup' && <label>FULL NAME<input value={name} onChange={(event) => setName(event.target.value)} required /></label>}
          <label>EMAIL<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
          <label>PASSWORD<input type="password" minLength="6" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
          {message && (
            <p className={`auth-message ${success ? 'auth-success' : ''}`} role="status">
              {message}
            </p>
          )}
          <button type="submit" className="primary-btn full" disabled={submitting}>
            {submitting ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'} <ArrowUpRight size={16} />
          </button>
        </form>
        <button
          type="button"
          className="auth-switch"
          onClick={() => {
            setMode(mode === 'login' ? 'signup' : 'login');
            setMessage('');
            setSuccess(false);
          }}
        >
          {mode === 'login' ? 'New to EcoSathi? Create an account' : 'Already have an account? Sign in'}
        </button>
      </section>
    </main>
  );
}
