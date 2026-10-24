import { useState } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { Leaf, ArrowUpRight, ShieldCheck, Truck, User, Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export function AuthPage() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, login, register, demoLogin } = useAuth();

  const [mode, setMode] = useState(pathname === '/signup' ? 'signup' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [selectedRole, setSelectedRole] = useState('resident');
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // If already logged in, navigate to home
  // (Note: AuthContext defaults to a demo user, but if user explicitly browses to /login or /signup,
  // we let them test login/signup unless they proceed)
  const [allowBrowsingAuth, setAllowBrowsingAuth] = useState(true);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage('');
    setSuccess(false);
    setSubmitting(true);

    try {
      if (mode === 'signup') {
        const result = await register(name, email, password, selectedRole);
        setSuccess(true);
        setMessage(
          result?.offline
            ? 'Local account created! Welcome to EcoSathi.'
            : 'Account registered and authenticated!'
        );
      } else {
        const result = await login(email, password);
        setSuccess(true);
        setMessage(
          result?.offline
            ? 'Signed in with local profile.'
            : 'Authenticated successfully!'
        );
      }
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 400);
    } catch (error) {
      setSuccess(false);
      setMessage(error.message || 'Something went wrong. Please check your credentials.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleDemoAccess(role) {
    demoLogin(role);
    navigate('/', { replace: true });
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand">
          <span className="brand-mark">
            <Leaf size={19} />
          </span>
          <b>
            Eco<span>Sathi</span>
          </b>
        </div>
        <div className="eyebrow">Campus operations workspace</div>
        <h1>{mode === 'login' ? 'Welcome back' : 'Create campus account'}</h1>
        <p className="auth-subtitle">
          {mode === 'login'
            ? 'Sign in to coordinate clean campus waste collection.'
            : 'Select your role and start contributing to sustainable campus ops.'}
        </p>

        {/* Quick Demo Access Bar */}
        <div className="demo-access-panel">
          <div className="demo-access-header">
            <Sparkles size={13} />
            <b>Quick 1-Click Demo Access</b>
          </div>
          <div className="demo-buttons-grid">
            <button
              type="button"
              className="demo-btn admin"
              onClick={() => handleDemoAccess('administrator')}
              title="Test with Administrator permissions"
            >
              <ShieldCheck size={14} />
              <span>Administrator</span>
            </button>
            <button
              type="button"
              className="demo-btn worker"
              onClick={() => handleDemoAccess('worker')}
              title="Test with Collection Worker permissions"
            >
              <Truck size={14} />
              <span>Worker</span>
            </button>
            <button
              type="button"
              className="demo-btn resident"
              onClick={() => handleDemoAccess('resident')}
              title="Test with Resident / Student permissions"
            >
              <User size={14} />
              <span>Resident</span>
            </button>
          </div>
        </div>

        <div className="auth-divider">
          <span>or sign in with credentials</span>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'signup' && (
            <>
              <label>
                FULL NAME
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Aarav Sharma"
                  required
                />
              </label>

              <label>
                CAMPUS ROLE
                <select
                  value={selectedRole}
                  onChange={(event) => setSelectedRole(event.target.value)}
                  className="role-select"
                  required
                >
                  <option value="resident">Resident / Student (Voice & text reports, tracking)</option>
                  <option value="worker">Collection Worker (Route execution & stop completion)</option>
                  <option value="administrator">Administrator (Queue triage & route dispatch)</option>
                </select>
              </label>
            </>
          )}

          <label>
            EMAIL
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="e.g. resident@ecosathi.campus"
              required
            />
          </label>

          <label>
            PASSWORD
            <input
              type="password"
              minLength="6"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              required
            />
          </label>

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
          {mode === 'login'
            ? 'New to EcoSathi? Create an account with a role'
            : 'Already have an account? Sign in'}
        </button>
      </section>
    </main>
  );
}
