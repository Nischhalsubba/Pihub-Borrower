import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { useAuth } from '../auth/AuthContext';
import { trackUiEvent } from '../services/telemetry';

const accessApplications = ['Investor', 'Borrower', 'Advisory', 'Admin'] as const;

export function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState(auth.demoCredentials?.email ?? '');
  const [password, setPassword] = useState(auth.demoCredentials?.password ?? '');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  if (auth.status === 'authenticated') return <Navigate to="/" replace/>;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(''); setNotice(''); setSubmitting(true);
    try {
      await auth.signIn(email, password);
      trackUiEvent('borrower_login_success', { mode: auth.mode });
      navigate('/', { replace: true });
    } catch (reason) {
      trackUiEvent('borrower_login_failure', { mode: auth.mode });
      setError(reason instanceof Error ? reason.message : 'Sign-in failed. Check your details and try again.');
    } finally { setSubmitting(false); }
  };

  const resetPassword = async () => {
    setError(''); setNotice('');
    if (auth.mode === 'demo') {
      setNotice('Password reset is owned by the production PiHub identity service. The Borrower demo credentials remain prefilled here.');
      return;
    }
    if (!email.trim()) { setError('Enter your email address before requesting a password reset.'); return; }
    try {
      await auth.resetPassword(email.trim());
      setNotice('If this email is eligible, PiHub will send password-reset instructions.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Password-reset request failed. Try again.'); }
  };

  return <main className="auth-world auth-world-access" data-pihub-module="borrower">
    <section className="auth-form-panel">
      <div className="auth-card" data-motion="auth-card">
        <div className="auth-brand" aria-label="PiHub Borrower access">
          <span className="auth-brand-logo" aria-hidden="true">PH</span>
          <strong>PiHub</strong>
          <span className="auth-brand-context">BORROWER / ACCESS</span>
        </div>

        <div className="pihub-access-tabs" aria-label="PiHub workspace family">
          {accessApplications.map((application) => <span key={application} className={application === 'Borrower' ? 'is-active' : ''} aria-current={application === 'Borrower' ? 'page' : undefined}>{application}</span>)}
        </div>

        <div className="auth-eyebrow">SECURE BORROWER ACCESS</div>
        <h1 className="auth-title">Login</h1>
        <p className="auth-description">Enter your email address and password</p>

        <form onSubmit={submit} className="form-signin" noValidate>
          {auth.demoCredentials && <div className="auth-demo-banner" role="status"><strong>Borrower demo sign in</strong><span>Demo credentials are prefilled in this demo build. Production sign-in never exposes demo credentials.</span></div>}
          <div className="auth-field">
            <label htmlFor="borrower-login-email">Email Address</label>
            <input id="borrower-login-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required aria-invalid={Boolean(error) || undefined} />
          </div>
          <div className="auth-field">
            <label htmlFor="borrower-login-password">Password</label>
            <input id="borrower-login-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required aria-invalid={Boolean(error) || undefined} />
          </div>
          <div className="auth-meta"><button className="auth-link-button" type="button" onClick={resetPassword}>Forgot Password?</button></div>
          {error && <div className="auth-error" role="alert"><Icon name="warning" size={17}/><span>{error}</span></div>}
          {notice && <div className="auth-notice" role="status">{notice}</div>}
          <button className="auth-submit" type="submit" disabled={submitting} aria-label="Open Borrower">{submitting ? 'SIGNING IN…' : 'LOGIN'}</button>
        </form>

        <div className="auth-foot">Borrower access is provisioned through the PiHub identity and authorization service.</div>
      </div>
    </section>

    <aside className="auth-visual" aria-hidden="true">
      <div className="auth-visual-atmosphere" />
      <div className="auth-visual-copy" data-motion="auth-visual-copy">
        <span>FINANCING DECISIONS, STRUCTURED CLEARLY</span>
        <h2>One workspace for financing, execution and servicing.</h2>
        <p>Complete borrower requirements, answer PiHub requests, manage documents and follow every financing milestone without unnecessary visual noise.</p>
        <div className="auth-proof">
          <div><strong>01</strong><small>APPLICATIONS</small></div>
          <div><strong>02</strong><small>PIHUB REQUESTS</small></div>
          <div><strong>03</strong><small>SERVICING</small></div>
        </div>
      </div>
    </aside>
  </main>;
}
