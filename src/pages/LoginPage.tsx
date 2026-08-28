import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icons';
import { useAuth } from '../auth/AuthContext';
import { trackUiEvent } from '../services/telemetry';

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

  return <main className="login-screen">
    <section className="login-panel">
      <div className="login-brand"><span className="brand-mark">PH</span><div><strong>PiHub</strong><small>Borrower</small></div></div>
      <div className="login-copy"><span>FINANCING WORKSPACE</span><h1>Sign in</h1><p>Guided financing origination and loan-servicing workspace for borrowers and sponsors.</p></div>
      <form onSubmit={submit} className="login-form">
        <label>Email address<input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
        <label>Password<input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
        {error && <div className="form-alert" role="alert"><Icon name="warning" size={18}/>{error}</div>}
        <button className="button primary" type="submit" disabled={submitting}>{submitting ? 'Signing in…' : 'Open Borrower'}</button>
        <button className="text-button" type="button" onClick={resetPassword}>Forgot password?</button>
        {notice&&<div className="form-note" role="status">{notice}</div>}
      </form>
      {auth.demoCredentials && <div className="demo-credentials"><strong>Borrower demo account</strong><span>{auth.demoCredentials.email}</span><span>{auth.demoCredentials.password}</span></div>}
    </section>
    <aside className="login-hero">
      <div className="login-hero-content"><span>PIHUB / BORROWER</span><h2>Move financing requests from application through servicing with less friction.</h2><p>Complete requirements, answer PiHub requests, manage documents, follow financing milestones and handle borrower obligations after funding.</p>
        <div className="hero-metrics"><div><strong>1</strong><span>Canonical deal lifecycle</span></div><div><strong>2</strong><span>Origination + servicing</span></div><div><strong>0</strong><span>Cross-module login leakage</span></div></div>
      </div>
    </aside>
  </main>;
}
