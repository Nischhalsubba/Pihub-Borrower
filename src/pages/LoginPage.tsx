import React, { useLayoutEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { gsap } from 'gsap';
import { Icon } from '../components/Icons';
import { useAuth } from '../auth/AuthContext';
import { trackUiEvent } from '../services/telemetry';

export function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const rootRef = useRef<HTMLElement>(null);
  const [email, setEmail] = useState(auth.demoCredentials?.email ?? '');
  const [password, setPassword] = useState(auth.demoCredentials?.password ?? '');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const media = gsap.matchMedia();

    media.add('(prefers-reduced-motion: no-preference)', () => {
      const context = gsap.context(() => {
        const left = root.querySelectorAll<HTMLElement>('[data-auth-motion="left"]');
        const right = root.querySelectorAll<HTMLElement>('[data-auth-motion="right"]');
        const atmosphere = root.querySelector<HTMLElement>('.auth-visual-atmosphere');
        const timeline = gsap.timeline({ defaults: { ease: 'power3.out' } });

        timeline.fromTo(
          left,
          { y: 12, willChange: 'transform' },
          {
            y: 0,
            duration: 0.42,
            stagger: 0.045,
            overwrite: 'auto',
            clearProps: 'transform,willChange',
          },
        );

        if (right.length) {
          timeline.fromTo(
            right,
            { y: 16, willChange: 'transform' },
            {
              y: 0,
              duration: 0.48,
              stagger: 0.05,
              overwrite: 'auto',
              clearProps: 'transform,willChange',
            },
            0.08,
          );
        }

        if (atmosphere) {
          timeline.fromTo(
            atmosphere,
            { x: 8, scale: 1.02, willChange: 'transform' },
            {
              x: 0,
              scale: 1,
              duration: 0.72,
              ease: 'power2.out',
              overwrite: 'auto',
              clearProps: 'transform,willChange',
            },
            0,
          );
        }
      }, root);

      return () => context.revert();
    });

    media.add('(prefers-reduced-motion: reduce)', () => {
      const targets = root.querySelectorAll<HTMLElement>('[data-auth-motion], .auth-visual-atmosphere');
      gsap.set(targets, { clearProps: 'transform,willChange' });
    });

    return () => media.revert();
  }, []);

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

  return <main ref={rootRef} className="auth-world auth-world-access" data-pihub-module="borrower">
    <section className="auth-form-panel">
      <div className="auth-card">
        <div className="auth-brand" aria-label="PiHub Borrower access" data-auth-motion="left">
          <span className="auth-brand-logo" aria-hidden="true">PH</span>
          <strong>PiHub Borrower</strong>
          <span className="auth-brand-context">SECURE ACCESS</span>
        </div>

        <div className="auth-eyebrow" data-auth-motion="left">BORROWER ACCESS</div>
        <h1 className="auth-title" data-auth-motion="left">Login</h1>
        <p className="auth-description" data-auth-motion="left">Enter your email address and password</p>

        <form onSubmit={submit} className="form-signin" noValidate data-auth-motion="left">
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

        <div className="auth-foot" data-auth-motion="left">Borrower access is provisioned through the PiHub identity and authorization service.</div>
      </div>
    </section>

    <aside className="auth-visual" aria-hidden="true">
      <div className="auth-visual-atmosphere" />
      <div className="auth-visual-copy">
        <span data-auth-motion="right">BORROWER FINANCING, STRUCTURED CLEARLY</span>
        <h2 data-auth-motion="right">One workspace from application through servicing.</h2>
        <p data-auth-motion="right">Complete financing requirements, answer PiHub requests, manage documents and follow every borrower milestone without unnecessary visual noise.</p>
        <div className="auth-proof" data-auth-motion="right">
          <div><strong>01</strong><small>APPLICATION</small></div>
          <div><strong>02</strong><small>REQUESTS</small></div>
          <div><strong>03</strong><small>SERVICING</small></div>
        </div>
      </div>
    </aside>
  </main>;
}
