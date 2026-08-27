import React, { useState } from 'react';
import { Link } from 'react-router-dom-v6';
import { DEMO_DEAL } from '../packages/domain/src/demo-data';
import { Card, Field, PageHead, Status } from './ui';
import { DEMO_ACCOUNT } from './config';
import { readLocal, writeLocal } from './local-state';

export const BORROWER_PROFILE_SEED = Object.freeze({
  name: DEMO_ACCOUNT.name,
  organization: DEMO_ACCOUNT.organization,
  role: DEMO_ACCOUNT.role,
  email: DEMO_ACCOUNT.email,
  phone: '+49 30 5550 1842',
  registration: 'HRB 209147 B',
  jurisdiction: 'Germany',
  city: 'Berlin',
  website: 'https://berlin-living.example',
});

const initials = value => String(value || '')
  .split(' ')
  .filter(Boolean)
  .map(part => part[0])
  .join('')
  .slice(0, 2)
  .toUpperCase();

const ProfileSummary = ({ profile }) => (
  <section className="ph-card borrower-profile-hero" aria-labelledby="borrower-profile-name">
    <div className="borrower-profile-identity">
      <div className="borrower-profile-mark" aria-hidden="true">{initials(profile.organization)}</div>
      <div className="borrower-profile-identity-copy">
        <span className="borrower-profile-eyebrow">Borrower organization</span>
        <h2 id="borrower-profile-name">{profile.organization}</h2>
        <p>{profile.name} · {profile.role}</p>
      </div>
    </div>
    <div className="borrower-profile-badges" aria-label="Account status">
      <Status tone="good">Verified demo</Status>
      <Status>Borrower access</Status>
    </div>
    <div className="borrower-profile-summary">
      <div><span>Primary user</span><strong>{profile.name}</strong></div>
      <div><span>Role</span><strong>{profile.role}</strong></div>
      <div><span>Active application</span><strong>{DEMO_DEAL.id}</strong></div>
      <div><span>Workspace</span><strong>Borrower</strong></div>
    </div>
    <div className="borrower-profile-actions">
      <Link className="ph-button secondary" to="/account/edit">Edit Profile</Link>
      <Link className="ph-button secondary" to="/account/security">Reset Password</Link>
    </div>
  </section>
);

export function AccountProfile() {
  const profile = readLocal('account-profile', BORROWER_PROFILE_SEED);
  return <div className="ph-page-shell borrower-account-page">
    <PageHead
      eyebrow="Borrower / Account"
      title="Organization account"
      subtitle="Identity, organization details and borrower permissions use the same profile hierarchy as the Investor workspace."
      action={<Link className="ph-button primary" to="/account/edit">Edit Profile</Link>}
    />
    <ProfileSummary profile={profile} />
    <div className="borrower-profile-layout">
      <div className="borrower-profile-main">
        <Card title="Organization details">
          <dl className="borrower-profile-details">
            <div><dt>Legal organization</dt><dd>{profile.organization}</dd></div>
            <div><dt>Registration</dt><dd>{profile.registration}</dd></div>
            <div><dt>Jurisdiction</dt><dd>{profile.jurisdiction}</dd></div>
            <div><dt>Location</dt><dd>{profile.city}</dd></div>
            <div><dt>Email</dt><dd>{profile.email}</dd></div>
            <div><dt>Phone</dt><dd>{profile.phone}</dd></div>
            <div className="is-wide"><dt>Website</dt><dd>{profile.website}</dd></div>
          </dl>
        </Card>
        <Card title="Borrower access">
          <div className="borrower-access-list">
            <div><span>Financing products</span><Status tone="good">Enabled</Status></div>
            <div><span>Application management</span><Status tone="good">Enabled</Status></div>
            <div><span>Document exchange</span><Status tone="good">Enabled</Status></div>
            <div><span>Investor-only credit decisions</span><Status>Not visible</Status></div>
          </div>
        </Card>
      </div>
      <aside className="borrower-profile-side" aria-label="Account governance">
        <Card title="Session & security">
          <dl className="ph-kv">
            <dt>Authentication</dt><dd>Central PiHub access</dd>
            <dt>Demo state</dt><dd>Browser local</dd>
            <dt>Role</dt><dd>{profile.role}</dd>
            <dt>Password</dt><dd><Link to="/account/security">Reset Password</Link></dd>
          </dl>
        </Card>
        <Card title="Current financing context">
          <dl className="ph-kv">
            <dt>Deal</dt><dd>{DEMO_DEAL.id}</dd>
            <dt>Project</dt><dd>{DEMO_DEAL.name}</dd>
            <dt>Current owner</dt><dd>{DEMO_DEAL.owner}</dd>
            <dt>Next review</dt><dd>{DEMO_DEAL.nextReview}</dd>
          </dl>
        </Card>
      </aside>
    </div>
  </div>;
}

export function AccountEdit() {
  const [form, setForm] = useState(() => readLocal('account-profile', BORROWER_PROFILE_SEED));
  const [message, setMessage] = useState('');
  const update = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }));
  const save = event => {
    event.preventDefault();
    const normalized = {
      ...form,
      name: form.name.trim(),
      organization: form.organization.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      registration: form.registration.trim(),
      jurisdiction: form.jurisdiction.trim(),
      city: form.city.trim(),
      website: form.website.trim(),
    };
    writeLocal('account-profile', normalized);
    window.dispatchEvent(new CustomEvent('pihub:borrower-profile-updated', { detail: normalized }));
    setForm(normalized);
    setMessage('Profile changes saved locally.');
  };

  return <div className="ph-page-shell borrower-account-page">
    <PageHead
      eyebrow="Borrower / Profile"
      title="Edit Profile"
      subtitle="Update borrower-owned contact and organization details. Role and authorization remain administrator-controlled."
      action={<Link className="ph-button secondary" to="/account">Back to Profile</Link>}
    />
    {message ? <div className="ph-callout" role="status" aria-live="polite">{message}</div> : null}
    <form className="ph-card borrower-account-form" onSubmit={save}>
      <div className="borrower-form-section-head"><div><strong>Account identity</strong><span>These details appear in the Borrower workspace and profile menu.</span></div></div>
      <div className="ph-form-grid">
        <Field label="Full name"><input name="name" autoComplete="name" required value={form.name} onChange={update} /></Field>
        <Field label="Organization"><input name="organization" autoComplete="organization" required value={form.organization} onChange={update} /></Field>
        <Field label="Email"><input name="email" type="email" autoComplete="email" required value={form.email} onChange={update} /></Field>
        <Field label="Phone"><input name="phone" type="tel" autoComplete="tel" value={form.phone} onChange={update} /></Field>
      </div>
      <div className="borrower-form-section-head"><div><strong>Organization record</strong><span>Borrower-maintained profile information used through the financing workflow.</span></div></div>
      <div className="ph-form-grid">
        <Field label="Registration"><input name="registration" value={form.registration} onChange={update} /></Field>
        <Field label="Jurisdiction"><input name="jurisdiction" value={form.jurisdiction} onChange={update} /></Field>
        <Field label="City"><input name="city" autoComplete="address-level2" value={form.city} onChange={update} /></Field>
        <Field label="Website"><input name="website" type="url" autoComplete="url" value={form.website} onChange={update} /></Field>
        <Field label="Role" hint="Role changes are controlled by PiHub administrators."><input name="role" readOnly value={form.role} /></Field>
      </div>
      <div className="ph-form-actions borrower-account-form-actions">
        <button className="ph-button primary" type="submit">Save Profile</button>
        <Link className="ph-button secondary" to="/account">Cancel</Link>
      </div>
    </form>
  </div>;
}

export function AccountSecurity() {
  const [form, setForm] = useState({ currentPassword: '', nextPassword: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const update = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }));
  const save = event => {
    event.preventDefault();
    setError('');
    setMessage('');
    if (form.currentPassword !== DEMO_ACCOUNT.password) {
      setError('The current demo password is incorrect.');
      return;
    }
    if (form.nextPassword.length < 10) {
      setError('Use at least 10 characters for the new password.');
      return;
    }
    if (form.nextPassword !== form.confirmPassword) {
      setError('The new passwords do not match.');
      return;
    }
    writeLocal('account-security', { updatedAt: new Date().toISOString(), demoOnly: true });
    setForm({ currentPassword: '', nextPassword: '', confirmPassword: '' });
    setMessage('Password reset flow completed in demo mode. Production credentials remain server-managed.');
  };

  return <div className="ph-page-shell borrower-account-page">
    <PageHead
      eyebrow="Borrower / Security"
      title="Reset Password"
      subtitle="Use the same account-security pattern as Investor while keeping production authentication server-owned."
      action={<Link className="ph-button secondary" to="/account">Back to Profile</Link>}
    />
    <div className="borrower-security-layout">
      <form className="ph-card borrower-account-form" onSubmit={save}>
        <div className="borrower-form-section-head"><div><strong>Change password</strong><span>Demo validation is local; no credential is written into the URL or shared workflow state.</span></div></div>
        {error ? <div className="ph-callout borrower-callout-danger" role="alert">{error}</div> : null}
        {message ? <div className="ph-callout borrower-callout-success" role="status" aria-live="polite">{message}</div> : null}
        <div className="borrower-security-fields">
          <Field label="Current password"><input name="currentPassword" type="password" autoComplete="current-password" required value={form.currentPassword} onChange={update} /></Field>
          <Field label="New password" hint="Minimum 10 characters in this demo flow."><input name="nextPassword" type="password" autoComplete="new-password" required value={form.nextPassword} onChange={update} /></Field>
          <Field label="Confirm new password"><input name="confirmPassword" type="password" autoComplete="new-password" required value={form.confirmPassword} onChange={update} /></Field>
        </div>
        <div className="ph-form-actions borrower-account-form-actions"><button className="ph-button primary" type="submit">Reset Password</button></div>
      </form>
      <Card title="Security boundary">
        <div className="borrower-security-notes">
          <div><strong>Central authentication</strong><span>Borrower does not own a second login surface.</span></div>
          <div><strong>No URL credentials</strong><span>Passwords, emails and tokens never travel through workflow handoff query parameters.</span></div>
          <div><strong>Production authorization</strong><span>Roles, session revocation and password storage remain backend responsibilities.</span></div>
        </div>
      </Card>
    </div>
  </div>;
}