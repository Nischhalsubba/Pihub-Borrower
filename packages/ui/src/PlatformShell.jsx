import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom-v6';
import WorkspaceAccount from './WorkspaceAccount';
import PlatformRouteMotion from './PlatformRouteMotion';

const SearchIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>;
const GlobeIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/></svg>;
const BellIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>;

const NavIcon = ({ path }) => (
  <span className="ph-nav-icon" aria-hidden="true">
    <svg viewBox="0 0 24 24"><path d={path || 'M4 5h16v14H4zM8 9h8M8 13h8'} /></svg>
  </span>
);

const renderNavigationLink = item => (
  <NavLink
    key={item.to}
    to={item.to}
    end={item.to === '/'}
    className={({ isActive }) => `ph-nav-link${isActive ? ' active' : ''}`}
  >
    <NavIcon path={item.iconPath} />
    <span>{item.label}</span>
  </NavLink>
);

const shortcutLabel = () => {
  if (typeof navigator === 'undefined') return 'Ctrl K';
  return /Mac|iPhone|iPad|iPod/i.test(`${navigator.platform || ''} ${navigator.userAgent || ''}`) ? '⌘K' : 'Ctrl K';
};

export default function PlatformShell({
  applicationId,
  brandTitle,
  brandSubtitle,
  workspaceBadge,
  environmentDetail,
  navigationSections,
  primaryAction,
  footerCopy,
  footerMeta = 'EUR',
  user,
  onLogout,
  onHome,
  accountSecondaryAction,
  accountMenuItems,
  accountLogoutLabel = 'Sign out',
  notifications = [],
  routeKey,
  headerVariant = 'investor',
  contentMaxWidth,
  mainGutter,
  compactMainGutter,
  children,
}) {
  const navigate = useNavigate();
  const [commandOpen, setCommandOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [language, setLanguage] = useState(() => {
    if (typeof window === 'undefined') return 'en';
    return window.localStorage.getItem('pihub:workspace-language') === 'de' ? 'de' : 'en';
  });
  const notificationRoot = useRef(null);
  const commandInput = useRef(null);
  const items = useMemo(() => navigationSections.flatMap(section => section.items), [navigationSections]);
  const commandItems = useMemo(() => {
    const primary = primaryAction ? [{ ...primaryAction, label: primaryAction.label, to: primaryAction.to, meta: 'Primary action' }] : [];
    return [...primary, ...items.map(item => ({ ...item, meta: 'Workspace destination' }))]
      .filter((item, index, all) => all.findIndex(candidate => candidate.to === item.to) === index);
  }, [items, primaryAction]);
  const filteredCommands = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return commandItems;
    return commandItems.filter(item => `${item.label} ${item.meta || ''}`.toLowerCase().includes(needle));
  }, [commandItems, query]);
  const unread = notifications.filter(item => item.unread !== false).length;
  const shortcut = shortcutLabel();
  const shellStyle = useMemo(() => {
    const style = {};
    if (contentMaxWidth) style['--pi-shell-content-max'] = contentMaxWidth;
    if (mainGutter) style['--pi-main-gutter'] = mainGutter;
    if (compactMainGutter) style['--pi-main-gutter-compact'] = compactMainGutter;
    return Object.keys(style).length ? style : undefined;
  }, [compactMainGutter, contentMaxWidth, mainGutter]);

  useEffect(() => {
    const key = event => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setNotificationOpen(false);
        setCommandOpen(true);
      }
      if (event.key === 'Escape') {
        setCommandOpen(false);
        setNotificationOpen(false);
      }
    };
    const pointer = event => {
      if (notificationOpen && notificationRoot.current && !notificationRoot.current.contains(event.target)) setNotificationOpen(false);
    };
    document.addEventListener('keydown', key);
    document.addEventListener('pointerdown', pointer);
    return () => {
      document.removeEventListener('keydown', key);
      document.removeEventListener('pointerdown', pointer);
    };
  }, [notificationOpen]);

  useEffect(() => {
    if (!commandOpen) return undefined;
    const id = window.setTimeout(() => commandInput.current?.focus(), 20);
    return () => window.clearTimeout(id);
  }, [commandOpen]);

  useEffect(() => {
    document.documentElement.lang = language;
    window.localStorage.setItem('pihub:workspace-language', language);
  }, [language]);

  const runCommand = item => {
    setCommandOpen(false);
    setQuery('');
    navigate(item.to);
  };

  const openNotification = item => {
    setNotificationOpen(false);
    if (item.to) navigate(item.to);
  };

  return (
    <div className="ph-app" data-workspace={applicationId} data-header-variant={headerVariant} style={shellStyle}>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <header className="ph-topbar" aria-label={`${workspaceBadge} workspace header`}>
        <div className="ph-topbar-leading">
          <button className="ph-brand" type="button" onClick={onHome} aria-label={`${brandTitle} home`}>
            <span className="ph-brandmark">PH</span>
            <span className="ph-brand-copy">
              <strong>{brandTitle}</strong>
              <small>{brandSubtitle}</small>
            </span>
          </button>
          <div className="ph-workspace-context">
            <div className="ph-environment-chip" role="status" aria-label={`Demo workspace. ${environmentDetail}`}>
              <span className="ph-environment-dot" aria-hidden="true" />
              <span className="ph-environment-copy">
                <strong>Demo workspace</strong>
                <small>{environmentDetail}</small>
              </span>
            </div>
          </div>
        </div>
        <div className="ph-topbar-spacer" />
        <div className="ph-topbar-controls" aria-label="Workspace utilities">
          <button className="ph-command-trigger" type="button" onClick={() => { setNotificationOpen(false); setCommandOpen(true); }} aria-label={`Open search and command menu, ${shortcut}`}>
            <SearchIcon />
            <span>Search or command</span>
            <kbd>{shortcut}</kbd>
          </button>
          <div className="ph-language" role="group" aria-label="Language selector">
            <span className="ph-language-glyph" aria-hidden="true"><GlobeIcon /></span>
            <button type="button" aria-pressed={language === 'en'} aria-label="Use English" title="English" onClick={() => setLanguage('en')}>EN</button>
            <button type="button" aria-pressed={language === 'de'} aria-label="Deutsch verwenden" title="Deutsch" onClick={() => setLanguage('de')}>DE</button>
          </div>
          <div className="ph-notification-root" ref={notificationRoot}>
            <button className="ph-icon-button" type="button" aria-label={`${unread} unread notifications. Open notification center.`} aria-expanded={notificationOpen} onClick={() => { setCommandOpen(false); setNotificationOpen(value => !value); }}>
              <BellIcon />
              {unread ? <span className="ph-notification-count">{unread}</span> : null}
            </button>
            {notificationOpen ? (
              <div className="ph-popover" role="dialog" aria-label="Notification center">
                <div className="ph-popover-head"><strong>Notifications</strong><span>{unread ? `${unread} unread` : 'All caught up'}</span></div>
                {notifications.length ? <div className="ph-notification-list">{notifications.map(item => (
                  <button className="ph-notification-item" type="button" key={item.id || item.title} onClick={() => openNotification(item)}>
                    <strong>{item.title}</strong><span>{item.detail}</span>
                  </button>
                ))}</div> : <div className="ph-command-empty">No workspace notifications.</div>}
              </div>
            ) : null}
          </div>
          <WorkspaceAccount
            user={user}
            onLogout={onLogout}
            onHome={onHome}
            secondaryAction={accountSecondaryAction}
            menuItems={accountMenuItems}
            logoutLabel={accountLogoutLabel}
          />
        </div>
      </header>

      <nav className="ph-mobile-nav" aria-label={`${workspaceBadge} navigation`}>
        {items.map(renderNavigationLink)}
      </nav>

      <div className="ph-shell">
        <aside className="ph-sidebar">
          {primaryAction ? (
            <div className="ph-sidebar-primary">
              <Link className="ph-button primary" to={primaryAction.to}>{primaryAction.label}</Link>
            </div>
          ) : null}
          {navigationSections.map(section => (
            <div className="ph-sidebar-section" key={section.label}>
              <div className="ph-nav-label">{section.label}</div>
              {section.items.map(renderNavigationLink)}
            </div>
          ))}
          <div className="ph-sidebar-foot">
            <div className="ph-sidebar-foot-copy">{footerCopy}</div>
            <div className="ph-system-line"><i /><b>DEMO DATA</b><span>{footerMeta}</span></div>
          </div>
        </aside>

        <main id="main-content" className="ph-main" tabIndex="-1">
          <PlatformRouteMotion routeKey={routeKey}>{children}</PlatformRouteMotion>
        </main>
      </div>

      {commandOpen ? (
        <div className="ph-command-overlay" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setCommandOpen(false); }}>
          <div className="ph-command-panel" role="dialog" aria-modal="true" aria-label="Search or command">
            <div className="ph-command-input-wrap"><SearchIcon /><input ref={commandInput} className="ph-command-input" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search workspace destinations…" aria-label="Search workspace destinations" /></div>
            <div className="ph-command-results">{filteredCommands.length ? filteredCommands.map(item => (
              <button className="ph-command-result" type="button" key={`${item.to}-${item.label}`} onClick={() => runCommand(item)}>
                <span><strong>{item.label}</strong><br/><small>{item.meta}</small></span><small>{item.to}</small>
              </button>
            )) : <div className="ph-command-empty">No matching destination.</div>}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
