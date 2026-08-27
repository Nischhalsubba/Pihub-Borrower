import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom-v6';
import {
  clearDemoSession,
  consumeDemoAccessHandoff,
  readDemoSession,
} from '../packages/platform/src/demo-session';
import { DEMO_DEAL } from '../packages/domain/src/demo-data';
import PlatformShell from '../packages/ui/src/PlatformShell';
import { APP_ID, APP_LABEL, DEMO_ACCOUNT } from './config';
import BorrowerLogin from './BorrowerLogin';
import Overview from './Overview';
import ProductMarketplace from './ProductMarketplace';
import ProductDetail from './ProductDetail';
import Applications from './Applications';
import ApplicationStart from './ApplicationStart';
import CorporateInformation from './CorporateInformation';
import FinancingRequest from './FinancingRequest';
import ProjectDetails from './ProjectDetails';
import FinancialDetails from './FinancialDetails';
import ClosingStatus from './ClosingStatus';
import { AccountEdit, AccountProfile, AccountSecurity, BORROWER_PROFILE_SEED } from './AccountCenter';
import { readLocal } from './local-state';
import { Documents, Requests } from './pages';

const ICONS = {
  overview: 'M4 13h6V4H4v9m10 7h6v-9h-6v9',
  products: 'M4 5h16v14H4zM8 9h8M8 13h5',
  applications: 'M6 3h9l4 4v14H6zM9 9h6M9 13h6M9 17h4',
  request: 'M7 3h10l3 3v15H7zM10 11h7M10 15h7',
  company: 'M4 21V8l8-4 8 4v13M9 21v-5h6v5',
  project: 'M3 21h18M5 21V9l7-5 7 5v12',
  financials: 'M4 19V9M10 19V5M16 19v-7M22 19H2',
  documents: 'M6 3h9l4 4 4v14H6zM9 13h7M9 17h5',
  requests: 'M4 5h16v12H8l-4 4zM8 9h8M8 13h5',
  closing: 'M4 12l5 5L20 6M4 18h12',
  account: 'M4 21a8 8 0 0 1 16 0M8 8a4 4 0 1 0 8 0',
};

const NAVIGATION = [
  { label: 'Workspace', items: [{ label: 'Overview', to: '/', iconPath: ICONS.overview }] },
  { label: 'Discover', items: [
    { label: 'Financing products', to: '/products', iconPath: ICONS.products },
    { label: 'My applications', to: '/applications', iconPath: ICONS.applications },
  ] },
  { label: 'Application', items: [
    { label: 'New application', to: '/applications/new', iconPath: ICONS.applications },
    { label: 'Financing request', to: '/financing', iconPath: ICONS.request },
    { label: 'Corporate information', to: '/corporate-information', iconPath: ICONS.company },
    { label: 'Project / Property', to: '/project', iconPath: ICONS.project },
    { label: 'Financials', to: '/financials', iconPath: ICONS.financials },
  ] },
  { label: 'Process', items: [
    { label: 'Documents', to: '/documents', iconPath: ICONS.documents },
    { label: 'PiHub requests', to: '/requests', iconPath: ICONS.requests },
    { label: 'Terms & closing', to: '/closing', iconPath: ICONS.closing },
    { label: 'Account', to: '/account', iconPath: ICONS.account },
  ] },
];

const NOTIFICATIONS = [
  { id: 'borrower-docs', title: 'Financial statements required', detail: 'FY2025 audited statements are still required for review.', to: '/documents' },
  { id: 'borrower-request', title: 'PiHub information request open', detail: 'Review outstanding borrower actions and due dates.', to: '/requests' },
];

const Workspace = ({ session, onLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(() => readLocal('account-profile', BORROWER_PROFILE_SEED));

  useEffect(() => {
    const updateProfile = event => setProfile(event.detail || readLocal('account-profile', BORROWER_PROFILE_SEED));
    window.addEventListener('pihub:borrower-profile-updated', updateProfile);
    return () => window.removeEventListener('pihub:borrower-profile-updated', updateProfile);
  }, []);

  const accountMenuItems = useMemo(() => [
    { label: 'Profile', icon: 'profile', onSelect: () => navigate('/account') },
    { label: 'Edit Profile', icon: 'edit', onSelect: () => navigate('/account/edit') },
    { label: 'Reset Password', icon: 'lock', onSelect: () => navigate('/account/security') },
  ], [navigate]);

  const shellUser = useMemo(() => ({
    ...session.user,
    name: profile.name || session.user.name,
    organization: profile.organization || session.user.organization,
    role: profile.role || session.user.role,
  }), [profile, session.user]);

  return (
    <PlatformShell
      applicationId={APP_ID}
      headerVariant="investor"
      brandTitle="PiHub Borrower"
      brandSubtitle="Origination workspace"
      workspaceBadge={APP_LABEL}
      workspaceTitle={DEMO_DEAL.id}
      workspaceSubtitle={DEMO_DEAL.name}
      environmentDetail="Local browser data · no live records"
      navigationSections={NAVIGATION}
      primaryAction={{ label: 'New application', to: '/applications/new' }}
      footerCopy="Borrower owns product discovery, application data and borrower-side closing actions for the shared deal."
      user={shellUser}
      onLogout={onLogout}
      onHome={() => navigate('/')}
      accountMenuItems={accountMenuItems}
      accountLogoutLabel="Logout"
      notifications={NOTIFICATIONS}
      routeKey={location.pathname}
      contentMaxWidth="1920px"
      mainGutter="clamp(28px, 2vw, 48px)"
      compactMainGutter="18px"
    >
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/products" element={<ProductMarketplace />} />
        <Route path="/products/:productId" element={<ProductDetail />} />
        <Route path="/applications" element={<Applications />} />
        <Route path="/applications/new" element={<ApplicationStart />} />
        <Route path="/financing" element={<FinancingRequest />} />
        <Route path="/corporate-information" element={<CorporateInformation />} />
        <Route path="/company" element={<Navigate to="/corporate-information" replace />} />
        <Route path="/project" element={<ProjectDetails />} />
        <Route path="/financials" element={<FinancialDetails />} />
        <Route path="/documents" element={<Documents />} />
        <Route path="/requests" element={<Requests />} />
        <Route path="/closing" element={<ClosingStatus />} />
        <Route path="/account" element={<AccountProfile />} />
        <Route path="/account/edit" element={<AccountEdit />} />
        <Route path="/account/security" element={<AccountSecurity />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </PlatformShell>
  );
};

export default function App() {
  const [session, setSession] = useState(() => consumeDemoAccessHandoff({ applicationId: APP_ID, account: DEMO_ACCOUNT }) || readDemoSession(APP_ID));

  if (!session) return <BorrowerLogin onAuthenticated={setSession} />;

  return (
    <Workspace
      session={session}
      onLogout={() => {
        clearDemoSession(APP_ID);
        setSession(null);
      }}
    />
  );
}
