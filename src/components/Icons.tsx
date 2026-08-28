import React from 'react';

export type IconName = 'home' | 'search' | 'products' | 'applications' | 'plus' | 'money' | 'building' | 'project' | 'chart' | 'document' | 'request' | 'message' | 'activity' | 'closing' | 'team' | 'account' | 'help' | 'bell' | 'chevron' | 'check' | 'warning' | 'upload' | 'download' | 'trash' | 'edit' | 'menu' | 'x' | 'clock' | 'external';

const paths: Record<IconName, React.ReactNode> = {
  home: <><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-7h6v7"/></>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
  products: <><path d="M4 5h16v14H4z"/><path d="M4 9h16"/><path d="M8 13h3"/></>,
  applications: <><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3h6v4H9zM8 11h8M8 15h8"/></>,
  plus: <path d="M12 5v14M5 12h14"/>, money: <><circle cx="12" cy="12" r="9"/><path d="M15.5 8.5c-.9-.8-2-1.2-3.4-1.2-1.8 0-3 .9-3 2.2 0 3.5 6.8 1.4 6.8 5 0 1.4-1.3 2.5-3.4 2.5-1.5 0-2.8-.5-3.8-1.4M12 5v14"/></>,
  building: <><path d="M4 21V5l8-2v18M12 8h8v13M7 8h2M7 12h2M7 16h2M15 11h2M15 15h2"/></>,
  project: <><path d="M3 20h18"/><path d="m5 17 4-7 4 4 3-6 3 9"/></>, chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></>,
  document: <><path d="M6 2h8l4 4v16H6z"/><path d="M14 2v5h5M9 12h6M9 16h6"/></>,
  request: <><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 2-2.5 2.2-2.5 4M12 17h.01"/></>,
  message: <><path d="M4 5h16v12H8l-4 4z"/><path d="M8 9h8M8 13h5"/></>, activity: <><path d="M3 12h4l2-5 4 10 2-5h6"/></>,
  closing: <><path d="M5 3h14v18H5z"/><path d="m8 12 2.5 2.5L16 9"/></>, team: <><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 21c0-4 2.5-7 6-7s6 3 6 7M14 15.5c3.5 0 6 2.2 6 5.5"/></>,
  account: <><circle cx="12" cy="8" r="4"/><path d="M4 21c0-5 3.5-8 8-8s8 3 8 8"/></>, help: <><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 2-2.5 2.3-2.5 4M12 17h.01"/></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>, chevron: <path d="m9 18 6-6-6-6"/>, check: <path d="m5 12 4 4L19 6"/>, warning: <><path d="M12 3 2 21h20z"/><path d="M12 9v5M12 18h.01"/></>,
  upload: <><path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v4h16v-4"/></>, download: <><path d="M12 4v12M7 11l5 5 5-5"/><path d="M4 20h16"/></>, trash: <><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14"/></>, edit: <><path d="m4 20 4-.8L19 8l-3-3L5 16z"/><path d="m14.5 6.5 3 3"/></>,
  menu: <path d="M4 7h16M4 12h16M4 17h16"/>, x: <path d="M6 6l12 12M18 6 6 18"/>, clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>, external: <><path d="M14 4h6v6M20 4l-9 9"/><path d="M18 13v7H4V6h7"/></>
};

export function Icon({ name, size = 18, className = '' }: { name: IconName; size?: number; className?: string }) {
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
