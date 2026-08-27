export const APPLICATIONS = Object.freeze({
  investor: { id: 'investor', label: 'Investor', kind: 'business', env: 'VITE_INVESTOR_APP_URL', targetOrigin: 'https://investor.pihub-pi.com' },
  borrower: { id: 'borrower', label: 'Borrower', kind: 'business', env: 'VITE_BORROWER_APP_URL', targetOrigin: 'https://borrower.pihub-pi.com' },
  advisory: { id: 'advisory', label: 'Advisory', kind: 'business', env: 'VITE_ADVISORY_APP_URL', targetOrigin: 'https://advisory.pihub-pi.com' },
  admin: { id: 'admin', label: 'Admin', kind: 'support', env: 'VITE_ADMIN_APP_URL', targetOrigin: 'https://admin.pihub-pi.com' },
  access: { id: 'access', label: 'Access', kind: 'support', env: 'VITE_ACCESS_APP_URL', targetOrigin: 'https://access.pihub-pi.com' }
});

export const BUSINESS_MODULE_IDS = Object.freeze(['investor', 'borrower', 'advisory']);
export const SUPPORT_APPLICATION_IDS = Object.freeze(['admin', 'access']);

export const sanitizeAppOrigin = value => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    const url = new URL(raw);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return '';
    url.hash = '';
    url.search = '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return '';
  }
};

export const joinAppPath = (origin, path = '/') => {
  const base = sanitizeAppOrigin(origin);
  if (!base) return '';
  const normalizedPath = String(path || '/').startsWith('/') ? String(path || '/') : `/${path}`;
  return new URL(normalizedPath.replace(/^\//, ''), `${base}/`).toString();
};
