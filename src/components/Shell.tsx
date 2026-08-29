import React, { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Icon } from './Icons';
import type { IconName } from './Icons';
import { t } from '../i18n';
import type { TranslationKey } from '../i18n';
import { useBorrowerStore } from '../state/store';
import { useAuth } from '../auth/AuthContext';
import { trackUiEvent } from '../services/telemetry';

type NavEntry = readonly [string, TranslationKey, IconName];
type PrimaryNavItem = {
  href: string;
  key: TranslationKey;
  icon: IconName;
  routes: readonly string[];
  items: readonly NavEntry[];
};

const primaryNav: readonly PrimaryNavItem[] = [
  { href: '/', key: 'overview', icon: 'home', routes: ['/'], items: [] },
  { href: '/products', key: 'financingWorkspace', icon: 'products', routes: ['/products', '/qualification'], items: [
    ['/products', 'products', 'products'], ['/qualification', 'qualification', 'activity']
  ]},
  { href: '/applications', key: 'applicationsWorkspace', icon: 'applications', routes: ['/applications', '/application', '/company', '/project', '/financials', '/connections', '/data-room', '/documents', '/requests', '/messages', '/activity', '/versions'], items: [
    ['/applications', 'applications', 'applications'], ['/applications/new', 'newApplication', 'plus'], ['/application', 'financing', 'money'], ['/company', 'company', 'building'], ['/project', 'project', 'project'], ['/financials', 'financials', 'chart'], ['/connections', 'connections', 'external'], ['/data-room', 'dataRoom', 'document'], ['/documents', 'documents', 'document'], ['/requests', 'requests', 'request'], ['/messages', 'messages', 'message'], ['/activity', 'activity', 'activity'], ['/versions', 'versions', 'activity']
  ]},
  { href: '/scenario-lab', key: 'executionWorkspace', icon: 'chart', routes: ['/scenario-lab', '/negotiation', '/closing', '/capital', '/calendar'], items: [
    ['/scenario-lab', 'scenarioLab', 'chart'], ['/negotiation', 'negotiation', 'message'], ['/closing', 'closing', 'closing'], ['/capital', 'capital', 'money'], ['/calendar', 'calendar', 'activity']
  ]},
  { href: '/servicing', key: 'servicingWorkspace', icon: 'activity', routes: ['/portfolio', '/servicing', '/payments', '/esg'], items: [
    ['/servicing', 'servicing', 'activity'], ['/portfolio', 'portfolio', 'applications'], ['/payments', 'payments', 'money'], ['/esg', 'esg', 'project']
  ]},
  { href: '/team', key: 'organizationWorkspace', icon: 'team', routes: ['/disclosures', '/team', '/account', '/privacy', '/complaints'], items: [
    ['/team', 'team', 'team'], ['/disclosures', 'disclosures', 'document'], ['/account', 'account', 'account'], ['/privacy', 'privacy', 'document'], ['/complaints', 'complaints', 'request']
  ]},
  { href: '/copilot', key: 'copilot', icon: 'help', routes: ['/copilot'], items: [] },
  { href: '/help', key: 'help', icon: 'help', routes: ['/help'], items: [] }
];

const routeMatches = (pathname: string, route: string) => route === '/' ? pathname === '/' : pathname === route || pathname.startsWith(`${route}/`);
const nav: NavEntry[] = primaryNav.flatMap((section) => section.items.length ? [...section.items] : [[section.href, section.key, section.icon] as NavEntry]);
const searchItems = [...nav.map(([href, key]) => ({ href, key })), { href: '/notifications', key: 'notificationsPage' as const }];

export function Shell({ children }: { children: React.ReactNode }) {
  const { state, app, saveLabel, mode, connectionStatus, connectionError, reloadFromApi, markNotificationRead, setLocale, resetDemo } = useBorrowerStore();
  const auth = useAuth();
  const [navOpen, setNavOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const unread = state.notifications.filter((item) => !item.read).length;
  const currentSection = primaryNav.find((section) => section.routes.some((route) => routeMatches(location.pathname, route)));
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const navigation = searchItems
      .filter((item) => t(state.locale, item.key).toLowerCase().includes(q))
      .map((item) => ({ href: item.href, label: t(state.locale, item.key), meta: 'Page' }));
    const applications = state.applications
      .filter((item) => `${item.name} ${item.id} ${item.financing.structure}`.toLowerCase().includes(q))
      .map((item) => ({ href: '/applications', label: item.name, meta: `Application ${item.id}` }));
    const documents = state.documents
      .filter((item) => `${item.name} ${item.category} ${item.status}`.toLowerCase().includes(q))
      .map((item) => ({ href: '/documents', label: item.name, meta: `Document · ${item.status.replaceAll('_', ' ')}` }));
    const requests = state.requests
      .filter((item) => `${item.title} ${item.description} ${item.status}`.toLowerCase().includes(q))
      .map((item) => ({ href: '/requests', label: item.title, meta: `PiHub request · ${item.status}` }));
    const facilities = state.facilities
      .filter((item) => `${item.id} ${item.provider} ${item.status}`.toLowerCase().includes(q))
      .map((item) => ({ href: '/servicing', label: item.id, meta: `Facility · ${item.provider}` }));
    const team = state.team
      .filter((item) => `${item.name} ${item.email} ${item.role}`.toLowerCase().includes(q))
      .map((item) => ({ href: '/team', label: item.name, meta: `Team · ${item.role}` }));
    const advanced = [
      ...state.advanced.drawRequests.map((item)=>({href:'/capital',label:`Draw ${item.number}`,meta:`Capital · ${item.status}`})),
      ...state.advanced.disclosures.map((item)=>({href:'/disclosures',label:item.providerName,meta:`Disclosure · ${item.status}`})),
      ...state.advanced.complaints.map((item)=>({href:'/complaints',label:item.subject,meta:`Complaint · ${item.status}`})),
      ...state.advanced.professionals.map((item)=>({href:'/team',label:item.name,meta:`Professional · ${item.profession.replaceAll('_',' ')}`}))
    ].filter((item)=>`${item.label} ${item.meta}`.toLowerCase().includes(q));
    return [...navigation, ...applications, ...documents, ...requests, ...facilities, ...team, ...advanced].slice(0, 12);
  }, [query, state]);

  useEffect(() => {
    const main = document.getElementById('main-content');
    main?.focus({ preventScroll: true });
    setNotificationsOpen(false);
    setAccountOpen(false);
    trackUiEvent('borrower_route_view', { route: location.pathname });
  }, [location.pathname]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setNavOpen(false);
      setNotificationsOpen(false);
      setAccountOpen(false);
      setQuery('');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const go = (href: string) => {
    setQuery('');
    setNavOpen(false);
    navigate(href);
  };

  const signOut = async () => {
    await auth.signOut();
    setAccountOpen(false);
    navigate('/login', { replace: true });
  };

  return <div className="app-shell pihub-shell" data-workspace="borrower">
    <a className="skip-link" href="#main-content">Skip to main content</a>
    <aside className={`sidebar pihub-sidebar ${navOpen ? 'is-open' : ''}`} aria-label="Borrower navigation">
      <div className="brand pihub-brand"><span className="brand-mark">PH</span><div><strong>PiHub Borrower</strong><small>BORROWER WORKSPACE</small></div></div>
      <nav className="pihub-sidebar-nav" aria-label="Workspace">
        <div className="nav-section"><span className="nav-section-label">Workspace</span>{primaryNav.map((section) => {
          const isActive = section.routes.some((route) => routeMatches(location.pathname, route));
          return <Link key={section.href} to={section.href} className={`nav-item ap-nav-item ${isActive ? 'active' : ''}`} aria-current={isActive ? 'page' : undefined} onClick={()=>setNavOpen(false)}><Icon name={section.icon} size={17}/><span className="ap-nav-label">{t(state.locale, section.key)}</span></Link>;
        })}</div>
      </nav>
      <div className="sidebar-foot pihub-sidebar-foot"><div className="pihub-system-line"><span className="demo-dot" /><strong>{mode === 'demo' ? 'DEMO DATA' : 'LIVE WORKSPACE'}</strong><span>EUR</span></div><small>{mode === 'demo' ? 'Local browser data · integration events queued' : 'Server session · canonical platform records'}</small></div>
    </aside>

    {navOpen && <button className="nav-scrim" aria-label="Close navigation" onClick={() => setNavOpen(false)} />}

    <header className="topbar pihub-topbar">
      <div className="topbar-left">
        <button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setNavOpen(true)}><Icon name="menu" /></button>
        <div className={`pihub-environment-chip ${mode === 'demo' ? 'is-demo' : 'is-live'}`}>
          <span className="pihub-environment-dot" />
          <span className="pihub-environment-copy"><strong>{mode === 'demo' ? 'Demo workspace' : 'PiHub connected'}</strong><small>{mode === 'demo' ? 'Local browser data · no live records' : `${app.name} · canonical platform records`}</small></span>
        </div>
      </div>
      <div className="topbar-actions">
        <div className={`save-pill ${connectionStatus === 'error' ? 'is-error' : ''}`} aria-live="polite" title={connectionError}><span className="save-dot" />{saveLabel}</div>
        <div className="global-search">
          <Icon name="search" size={16}/>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t(state.locale, 'search')} aria-label={t(state.locale, 'search')} />
          {results.length > 0 && <div className="search-results" role="listbox">
            {results.map((item, index) => <button key={`${item.href}-${item.label}-${index}`} role="option" onClick={() => go(item.href)}><span><strong>{item.label}</strong><small>{item.meta}</small></span><Icon name="chevron" size={14}/></button>)}
          </div>}
        </div>
        <div className="language-switch" aria-label="Language">
          <button className={state.locale === 'en' ? 'active' : ''} aria-pressed={state.locale === 'en'} onClick={() => setLocale('en')}>EN</button>
          <button className={state.locale === 'de' ? 'active' : ''} aria-pressed={state.locale === 'de'} onClick={() => setLocale('de')}>DE</button>
        </div>
        <button className="icon-button notification-button" aria-label={`${t(state.locale, 'notifications')}${unread ? `, ${unread} unread` : ''}`} onClick={() => setNotificationsOpen((value) => !value)}>
          <Icon name="bell" />{unread > 0 && <span className="badge">{unread}</span>}
        </button>
        <button className="account-button" onClick={() => setAccountOpen((value) => !value)} aria-expanded={accountOpen}>
          <span className="avatar">MK</span><span className="account-copy"><strong>{state.profile.name}</strong><small>{state.organization.name}</small></span><Icon name="chevron" size={14}/>
        </button>
      </div>

      {notificationsOpen && <div className="popover notification-popover">
        <div className="popover-head"><strong>{t(state.locale, 'notifications')}</strong><button onClick={() => markNotificationRead()}>{t(state.locale, 'markAllRead')}</button></div>
        <div className="notification-list">
          {state.notifications.length === 0 ? <p className="popover-empty">No notifications</p> : state.notifications.slice(0, 8).map((item) => <button key={item.id} className={item.read ? '' : 'unread'} onClick={() => { markNotificationRead(item.id); go(item.href); setNotificationsOpen(false); }}>
            <span className="notification-dot"/><span><strong>{item.title}</strong><small>{item.body}</small></span><Icon name="chevron" size={14}/>
          </button>)}
        </div>
        <button className="popover-footer" onClick={() => { go('/notifications'); setNotificationsOpen(false); }}>View all notifications</button>
      </div>}

      {accountOpen && <div className="popover account-popover">
        <button onClick={() => { go('/account'); setAccountOpen(false); }}><Icon name="account" size={16}/>Account settings</button>
        <button onClick={() => { go('/team'); setAccountOpen(false); }}><Icon name="team" size={16}/>Organization & team</button>
        <button onClick={() => { go('/privacy'); setAccountOpen(false); }}><Icon name="document" size={16}/>Privacy & data rights</button>
        {mode === 'demo' && <button onClick={() => { resetDemo(); setAccountOpen(false); go('/'); }}><Icon name="activity" size={16}/>{t(state.locale, 'resetDemo')}</button>}
        <button className="danger" onClick={signOut}><Icon name="external" size={16}/>{t(state.locale, 'signOut')}</button>
      </div>}
    </header>

    <main id="main-content" className="main-content pihub-workspace" tabIndex={-1} data-route={location.pathname}>
      {connectionStatus === 'error' && <div className="sync-warning" role="alert"><span><strong>PiHub sync needs attention.</strong><small>{connectionError ?? 'The last server update was not confirmed.'}</small></span><button className="button secondary" onClick={() => void reloadFromApi()}>Reload server state</button></div>}
      {currentSection && currentSection.items.length > 1 && <section className="workspace-context-shell" aria-label={`${t(state.locale, currentSection.key)} workflow`}>
        <div className="workspace-context-heading"><span className="eyebrow">{t(state.locale, currentSection.key)}</span><small>{t(state.locale, 'sectionNavigationHint')}</small></div>
        <nav className="workspace-context-nav" aria-label={`${t(state.locale, currentSection.key)} sections`}>
          {currentSection.items.map(([href, key, icon]) => {
            const active = routeMatches(location.pathname, href);
            return <NavLink key={href} to={href} className={() => `workspace-context-link ${active ? 'active' : ''}`} aria-current={active ? 'page' : undefined}><Icon name={icon} size={15}/><span>{t(state.locale, key)}</span></NavLink>;
          })}
        </nav>
      </section>}
      {children}
    </main>
  </div>;
}
