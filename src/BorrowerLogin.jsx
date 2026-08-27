import React, { useState } from 'react';
import { authenticateDemo, writeDemoSession } from '../packages/platform/src/demo-session';
import { APP_ID, DEMO_ACCOUNT } from './config';

export default function BorrowerLogin({ onAuthenticated }) {
  const [email, setEmail] = useState(DEMO_ACCOUNT.email);
  const [password, setPassword] = useState(DEMO_ACCOUNT.password);
  const [error, setError] = useState('');

  const submit = event => {
    event.preventDefault();
    setError('');
    const result = authenticateDemo({
      applicationId: APP_ID,
      email,
      password,
      account: DEMO_ACCOUNT,
    });

    if (!result.ok) {
      setError(result.error);
      return;
    }

    writeDemoSession(APP_ID, result.session);
    onAuthenticated(result.session);
  };

  return (
    <main className="ph-login" aria-label="PiHub Borrower sign in">
      <section className="ph-login-main">
        <div className="ph-login-card">
          <div className="ph-login-brand" aria-label="PiHub Borrower">
            <span className="ph-brandmark" aria-hidden="true">PH</span>
            <span>PiHub Borrower</span>
          </div>

          <div className="ph-eyebrow">Borrower secure access</div>
          <h1 className="ph-title">Borrower login</h1>
          <p className="ph-subtitle">Access financing applications, company information, documents and closing actions.</p>

          <div className="ph-callout" role="note">
            This access screen belongs only to the Borrower workspace. Investor, Advisory and Admin sign-in are not available here.
          </div>

          <form className="ph-login-form" onSubmit={submit}>
            <div className="ph-field">
              <label htmlFor="borrower-email">Email Address</label>
              <input
                id="borrower-email"
                name="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={event => setEmail(event.target.value)}
              />
            </div>

            <div className="ph-field">
              <label htmlFor="borrower-password">Password</label>
              <input
                id="borrower-password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={event => setPassword(event.target.value)}
              />
            </div>

            {error ? <div className="ph-status bad" role="alert">{error}</div> : null}

            <button className="ph-button primary" type="submit">Open Borrower</button>
          </form>

          <p className="ph-login-hint">Demo credentials are prefilled for the Borrower account. Production authentication will replace this browser-local demo session.</p>
        </div>
      </section>

      <aside className="ph-login-side" aria-label="Borrower workspace introduction">
        <div>
          <div className="ph-eyebrow">Origination workspace</div>
          <h2>One borrower workspace for the financing journey.</h2>
          <p>Prepare the financing request, maintain borrower information, respond to PiHub requests and follow the deal through closing without exposing access to other PiHub modules.</p>
        </div>
      </aside>
    </main>
  );
}
