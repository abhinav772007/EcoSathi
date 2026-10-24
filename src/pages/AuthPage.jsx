import { useState } from 'react';
import { Leaf, ArrowUpRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export function AuthPage() {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage('');
    if (!supabase) return setMessage('Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env.local first.');
    setSubmitting(true);
    const result = mode === 'login'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } });
    setSubmitting(false);
    if (result.error) return setMessage(result.error.message);
    if (mode === 'signup' && !result.data.session) setMessage('Account created. Check your email to confirm it, then log in.');
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
          {message && <p className="auth-message" role="alert">{message}</p>}
          <button type="submit" className="primary-btn full" disabled={submitting}>
            {submitting ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'} <ArrowUpRight size={16} />
          </button>
        </form>
        <button type="button" className="auth-switch" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setMessage(''); }}>
          {mode === 'login' ? 'New to EcoSathi? Create an account' : 'Already have an account? Sign in'}
        </button>
      </section>
    </main>
  );
}
