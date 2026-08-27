import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';

const initials = name => String(name || '').split(' ').filter(Boolean).map(part => part[0]).join('').slice(0, 2).toUpperCase();

const ICON_PATHS = Object.freeze({
  profile: 'M4 21a8 8 0 0 1 16 0M8 8a4 4 0 1 0 8 0',
  edit: 'M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4',
  lock: 'M5 10h14v10H5zM8 10V7a4 4 0 0 1 8 0v3',
  home: 'M4 11 12 4l8 7v9h-6v-6h-4v6H4z',
  logout: 'M10 5H5v14h5M14 8l4 4-4 4M18 12H9',
});

const MenuIcon = ({ name }) => (
  <span className="ph-account-menu-icon" aria-hidden="true">
    <svg viewBox="0 0 24 24"><path d={ICON_PATHS[name] || ICON_PATHS.profile} /></svg>
  </span>
);

const prefersReducedMotion = () => typeof window !== 'undefined'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function WorkspaceAccount({
  user,
  onLogout,
  onHome,
  secondaryAction,
  menuItems,
  subtitle,
  logoutLabel = 'Sign out',
}) {
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  const menu = useRef(null);
  const hasExplicitInvestorMenu = Array.isArray(menuItems) && menuItems.length > 0;
  const accountSubtitle = subtitle || (hasExplicitInvestorMenu
    ? user.role
    : [user.organization, user.role].filter(Boolean).join(' · '));

  const close = () => setOpen(false);

  useEffect(() => {
    const pointer = event => {
      if (open && root.current && !root.current.contains(event.target)) close();
    };
    const key = event => {
      if (event.key === 'Escape' && open) {
        close();
        root.current?.querySelector('.ph-user-card')?.focus();
      }
    };
    document.addEventListener('pointerdown', pointer);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('pointerdown', pointer);
      document.removeEventListener('keydown', key);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!menu.current) return undefined;
    gsap.killTweensOf(menu.current);

    if (prefersReducedMotion()) {
      gsap.set(menu.current, {
        autoAlpha: open ? 1 : 0,
        y: 0,
        pointerEvents: open ? 'auto' : 'none',
      });
      return () => gsap.killTweensOf(menu.current);
    }

    if (open) {
      // Investor's account popover has fixed geometry. Animate position and
      // opacity only so its 260px contract does not briefly shrink mid-open.
      gsap.fromTo(menu.current,
        { autoAlpha: 0, y: -6, pointerEvents: 'none' },
        {
          autoAlpha: 1,
          y: 0,
          pointerEvents: 'auto',
          duration: 0.16,
          ease: 'power2.out',
          overwrite: 'auto',
          clearProps: 'transform',
        });
    } else {
      gsap.to(menu.current, {
        autoAlpha: 0,
        y: -4,
        pointerEvents: 'none',
        duration: 0.11,
        ease: 'power1.in',
        overwrite: 'auto',
      });
    }

    return () => gsap.killTweensOf(menu.current);
  }, [open]);

  const fallbackItems = [
    onHome ? { label: 'Workspace overview', icon: 'home', onSelect: onHome } : null,
    secondaryAction ? { ...secondaryAction, icon: secondaryAction.icon || 'profile' } : null,
  ].filter(Boolean);
  const items = hasExplicitInvestorMenu ? menuItems : fallbackItems;

  const run = item => {
    close();
    item.onSelect?.();
  };

  return (
    <div className="ph-account" ref={root}>
      <button
        className="ph-user-card"
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="workspace-account-menu"
        aria-label="Open account menu"
        onClick={() => setOpen(value => !value)}
      >
        <span className="ph-avatar" aria-hidden="true">{initials(user.name)}</span>
        <span className="ph-user-copy"><strong>{user.name}</strong><small>{accountSubtitle}</small></span>
        <span className="ph-account-chevron" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="m7 9 5 5 5-5" /></svg>
        </span>
      </button>

      <div
        id="workspace-account-menu"
        className={`ph-account-menu${open ? ' is-open' : ''}`}
        role="menu"
        aria-hidden={!open}
        ref={menu}
      >
        <div className="ph-account-menu-head" aria-hidden="true">
          <strong>{user.name}</strong>
          <span>{accountSubtitle}</span>
        </div>
        {items.map(item => (
          <button
            type="button"
            role="menuitem"
            tabIndex={open ? 0 : -1}
            key={item.label}
            className={item.danger ? 'is-danger' : undefined}
            onClick={() => run(item)}
          >
            <MenuIcon name={item.icon} />
            <span>{item.label}</span>
          </button>
        ))}
        <div className="ph-account-menu-divider" role="separator" />
        <button className="is-danger" type="button" role="menuitem" tabIndex={open ? 0 : -1} onClick={onLogout}>
          <MenuIcon name="logout" />
          <span>{logoutLabel}</span>
        </button>
      </div>
    </div>
  );
}
