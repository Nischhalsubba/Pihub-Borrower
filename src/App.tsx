import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { BorrowerStoreProvider, useBorrowerStore } from './state/store';
import { Shell } from './components/Shell';
import { ProductRouteMotion } from './components/ProductRouteMotion';
import { LoginPage } from './pages/LoginPage';

const OverviewPage = lazy(() => import('./pages/OverviewPage').then((m) => ({ default: m.OverviewPage })));
const ProductsPage = lazy(() => import('./pages/ProductsPage').then((m) => ({ default: m.ProductsPage })));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage').then((m) => ({ default: m.ProductDetailPage })));
const ApplicationsPage = lazy(() => import('./pages/ApplicationsPage').then((m) => ({ default: m.ApplicationsPage })));
const NewApplicationPage = lazy(() => import('./pages/NewApplicationPage').then((m) => ({ default: m.NewApplicationPage })));
const FinancingPage = lazy(() => import('./pages/FinancingPage').then((m) => ({ default: m.FinancingPage })));
const CompanyPage = lazy(() => import('./pages/CompanyPage').then((m) => ({ default: m.CompanyPage })));
const ProjectPage = lazy(() => import('./pages/ProjectPage').then((m) => ({ default: m.ProjectPage })));
const FinancialsPage = lazy(() => import('./pages/FinancialsPage').then((m) => ({ default: m.FinancialsPage })));
const DocumentsPage = lazy(() => import('./pages/DocumentsPage').then((m) => ({ default: m.DocumentsPage })));
const RequestsPage = lazy(() => import('./pages/RequestsPage').then((m) => ({ default: m.RequestsPage })));
const MessagesPage = lazy(() => import('./pages/MessagesPage').then((m) => ({ default: m.MessagesPage })));
const ActivityPage = lazy(() => import('./pages/ActivityPage').then((m) => ({ default: m.ActivityPage })));
const ClosingPage = lazy(() => import('./pages/ClosingPage').then((m) => ({ default: m.ClosingPage })));
const TeamPage = lazy(() => import('./pages/TeamPage').then((m) => ({ default: m.TeamPage })));
const AccountPage = lazy(() => import('./pages/AccountPage').then((m) => ({ default: m.AccountPage })));
const HelpPage = lazy(() => import('./pages/HelpPage').then((m) => ({ default: m.HelpPage })));
const VersionsPage = lazy(() => import('./pages/VersionsPage').then((m) => ({ default: m.VersionsPage })));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage').then((m) => ({ default: m.NotificationsPage })));
const ServicingPage = lazy(() => import('./pages/ServicingPage').then((m) => ({ default: m.ServicingPage })));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage').then((m) => ({ default: m.PrivacyPage })));
const PortfolioPage = lazy(() => import('./pages/PortfolioPage').then((m) => ({ default: m.PortfolioPage })));
const QualificationPage = lazy(() => import('./pages/QualificationPage').then((m) => ({ default: m.QualificationPage })));
const CapitalPage = lazy(() => import('./pages/CapitalPage').then((m) => ({ default: m.CapitalPage })));
const ConnectionsPage = lazy(() => import('./pages/ConnectionsPage').then((m) => ({ default: m.ConnectionsPage })));
const DataRoomPage = lazy(() => import('./pages/DataRoomPage').then((m) => ({ default: m.DataRoomPage })));
const DisclosuresPage = lazy(() => import('./pages/DisclosuresPage').then((m) => ({ default: m.DisclosuresPage })));
const ScenarioLabPage = lazy(() => import('./pages/ScenarioLabPage').then((m) => ({ default: m.ScenarioLabPage })));
const NegotiationPage = lazy(() => import('./pages/NegotiationPage').then((m) => ({ default: m.NegotiationPage })));
const CalendarPage = lazy(() => import('./pages/CalendarPage').then((m) => ({ default: m.CalendarPage })));
const CopilotPage = lazy(() => import('./pages/CopilotPage').then((m) => ({ default: m.CopilotPage })));
const ESGPage = lazy(() => import('./pages/ESGPage').then((m) => ({ default: m.ESGPage })));
const PaymentsPage = lazy(() => import('./pages/PaymentsPage').then((m) => ({ default: m.PaymentsPage })));
const ComplaintsPage = lazy(() => import('./pages/ComplaintsPage').then((m) => ({ default: m.ComplaintsPage })));

function RouteFallback() {
  return <div className="route-stage route-loading" role="status" aria-live="polite"><div className="skeleton skeleton-title"/><div className="skeleton skeleton-card"/><span className="sr-only">Loading Borrower workspace</span></div>;
}

function ProtectedApp() {
  const auth = useAuth();
  const store = useBorrowerStore();
  const location = useLocation();
  if (auth.status === 'checking') return <RouteFallback/>;
  if (auth.status !== 'authenticated') return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (store.mode === 'api' && !store.ready) {
    if (store.connectionStatus === 'error') return <main className="connection-error"><div className="connection-error-card" role="alert"><span className="eyebrow">PIHUB / BORROWER</span><h1>Borrower data is temporarily unavailable</h1><p>{store.connectionError ?? 'The PiHub API could not load your workspace.'}</p><button className="button primary" onClick={() => void store.reloadFromApi()}>Try again</button></div></main>;
    return <RouteFallback/>;
  }
  return <Shell><Suspense fallback={<RouteFallback/>}><ProductRouteMotion routeKey={location.pathname}><Routes>
    <Route path="/" element={<OverviewPage/>}/>
    <Route path="/portfolio" element={<PortfolioPage/>}/>
    <Route path="/qualification" element={<QualificationPage/>}/>
    <Route path="/products" element={<ProductsPage/>}/>
    <Route path="/products/:id" element={<ProductDetailPage/>}/>
    <Route path="/applications" element={<ApplicationsPage/>}/>
    <Route path="/applications/new" element={<NewApplicationPage/>}/>
    <Route path="/application" element={<FinancingPage/>}/>
    <Route path="/company" element={<CompanyPage/>}/>
    <Route path="/project" element={<ProjectPage/>}/>
    <Route path="/financials" element={<FinancialsPage/>}/>
    <Route path="/connections" element={<ConnectionsPage/>}/>
    <Route path="/data-room" element={<DataRoomPage/>}/>
    <Route path="/disclosures" element={<DisclosuresPage/>}/>
    <Route path="/documents" element={<DocumentsPage/>}/>
    <Route path="/requests" element={<RequestsPage/>}/>
    <Route path="/messages" element={<MessagesPage/>}/>
    <Route path="/activity" element={<ActivityPage/>}/>
    <Route path="/versions" element={<VersionsPage/>}/>
    <Route path="/notifications" element={<NotificationsPage/>}/>
    <Route path="/scenario-lab" element={<ScenarioLabPage/>}/>
    <Route path="/negotiation" element={<NegotiationPage/>}/>
    <Route path="/closing" element={<ClosingPage/>}/>
    <Route path="/capital" element={<CapitalPage/>}/>
    <Route path="/calendar" element={<CalendarPage/>}/>
    <Route path="/servicing" element={<ServicingPage/>}/>
    <Route path="/payments" element={<PaymentsPage/>}/>
    <Route path="/esg" element={<ESGPage/>}/>
    <Route path="/team" element={<TeamPage/>}/>
    <Route path="/account" element={<AccountPage/>}/>
    <Route path="/privacy" element={<PrivacyPage/>}/>
    <Route path="/complaints" element={<ComplaintsPage/>}/>
    <Route path="/copilot" element={<CopilotPage/>}/>
    <Route path="/help" element={<HelpPage/>}/>
    <Route path="*" element={<Navigate to="/" replace/>}/>
  </Routes></ProductRouteMotion></Suspense></Shell>;
}

export default function App() {
  return <BrowserRouter><AuthProvider><BorrowerStoreProvider><Routes>
    <Route path="/login" element={<LoginPage/>}/>
    <Route path="/*" element={<ProtectedApp/>}/>
  </Routes></BorrowerStoreProvider></AuthProvider></BrowserRouter>;
}
