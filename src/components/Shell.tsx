import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Icon } from './Icons';
import type { IconName } from './Icons';
import { t } from '../i18n';
import type { TranslationKey } from '../i18n';
import { useBorrowerStore } from '../state/store';
import { useAuth } from '../auth/AuthContext';
import { trackUiEvent } from '../services/telemetry';

type NavEntry = readonly [string, TranslationKey, IconName];
type NavSection = { label: string; items: readonly NavEntry[] };

const navSections: readonly NavSection[] = [
  { label: 'Workspace', items: [
    ['/', 'overview', 'home'], ['/portfolio', 'portfolio', 'applications'], ['/products', 'products', 'products'], ['/qualification', 'qualification', 'activity'], ['/applications', 'applications', 'applications'], ['/applications/new', 'newApplication', 'plus']
  ]},
  { label: 'Application', items: [
    ['/application', 'financing', 'money'], ['/company', 'company', 'building'], ['/project', 'project', 'project'], ['/financials', 'financials', 'chart'], ['/connections', 'connections', 'external'], ['/data-room', 'dataRoom', 'document'], ['/requests', 'requests', 'request'], ['/messages', 'messages', 'message'], ['/activity', 'activity', 'activity'], ['/versions', 'versions', 'activity']
  ]},
  { label: 'Execution', items: [
    ['/scenario-lab', 'scenarioLab', 'chart'], ['/negotiation', 'negotiation', 'message'], ['/closing', 'closing', 'closing'], ['/capital', 'capital', 'money'], ['/calendar', 'calendar', 'activity']
  ]},
  { label: 'Post-funding', items: [
    ['/servicing', 'servicing', 'activity'], ['/payments', 'payments', 'money'], ['/esg', 'esg', 'project']
  ]},
  { label: 'Organization', items: [
    ['/disclosures', 'disclosures', 'document'], ['/team', 'team', 'team'], ['/account', 'account', 'account'], ['/privacy', 'privacy', 'document'], ['/complaints', 'complaints', 'request'], ['/copilot', 'copilot', 'help'], ['/help', 'help', 'help']
  ]}
];

const nav: NavEntry[] = navSections.flatMap((section) => [...section.items]);

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

  return <div className="app-shell" data-workspace="borrower">
    <a className="skip-link" href="#main-content">Skip to main content</a>
    <aside className={`sidebar ${navOpen ? 'is-open' : ''}`} aria-label="Borrower navigation">
      <div className="brand"><span className="brand-mark">PH</span><div><strong>PiHub</strong><small>Borrower</small></div></div>
      <div className="sidebar-context"><span>Workspace</span><strong>Borrower</strong><small>{app.id}</small></div>
      <nav>
        {navSections.map((section)=><div className="nav-section" key={section.label}><span className="nav-section-label">{section.label}</span>{section.items.map(([href,key,icon])=><NavLink key={href} to={href} end={href==='/' } className={({isActive})=>`nav-item ${isActive?'active':''}`} onClick={()=>setNavOpen(false)}><Icon name={icon} size={17}/><span>{t(state.locale,key)}</span></NavLink>)}</div>)}
      </nav>
      <div className="sidebar-foot"><span className="demo-dot" />{mode === 'demo' ? t(state.locale, 'demo') : 'PiHub connected'}<small>{mode === 'demo' ? 'Local browser data · integration events queued' : 'Server session · canonical platform records'}</small></div>
    </aside>

    {navOpen && <button className="nav-scrim" aria-label="Close navigation" onClick={() => setNavOpen(false)} />}

    <header className="topbar">
      <div className="topbar-left">
        <button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setNavOpen(true)}><Icon name="menu" /></button>
        <div className="crumb"><strong>Borrower</strong><span>{app.name}</span></div>
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
          <button className={state.locale === 'en' ? 'active' : ''} onClick={() => setLocale('en')}>EN</button>
          <button className={state.locale === 'de' ? 'active' : ''} onClick={() => setLocale('de')}>DE</button>
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

    <main id="main-content" className="main-content" tabIndex={-1} data-route={location.pathname}>{connectionStatus === 'error' && <div className="sync-warning" role="alert"><span><strong>PiHub sync needs attention.</strong><small>{connectionError ?? 'The last server update was not confirmed.'}</small></span><button className="button secondary" onClick={() => void reloadFromApi()}>Reload server state</button></div>}{children}</main>
  </div>;
}
