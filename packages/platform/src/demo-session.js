const keyFor = applicationId => `pihub:${applicationId}:demo-session:v1`;

const DEFAULT_CENTRAL_ACCESS_ORIGIN = 'https://pihub-investor.vercel.app';
const CENTRAL_ACCESS_PATHS = Object.freeze({
  investor: '/login',
  borrower: '/login/borrower',
  advisory: '/login/advisory',
  admin: '/login?next=admin',
  access: '/login'
});

const configuredCentralAccessOrigin = () => {
  try { return String(import.meta.env?.VITE_PIHUB_ACCESS_ORIGIN || DEFAULT_CENTRAL_ACCESS_ORIGIN).trim(); }
  catch { return DEFAULT_CENTRAL_ACCESS_ORIGIN; }
};

const sanitizeOrigin = value => {
  try {
    const url = new URL(String(value || '').trim());
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return DEFAULT_CENTRAL_ACCESS_ORIGIN;
    url.pathname = '/';
    url.search = '';
    url.hash = '';
    return url.toString().replace(/\/$/, '');
  } catch { return DEFAULT_CENTRAL_ACCESS_ORIGIN; }
};

export const getCentralAccessHref = (applicationId, options = {}) => {
  const id = String(applicationId || '').trim().toLowerCase();
  const origin = sanitizeOrigin(options.origin || configuredCentralAccessOrigin());
  return new URL(CENTRAL_ACCESS_PATHS[id] || CENTRAL_ACCESS_PATHS.investor, `${origin}/`).toString();
};

export const redirectToCentralAccess = (applicationId, options = {}) => {
  if (typeof window === 'undefined') return '';
  const href = getCentralAccessHref(applicationId, options);
  window.location.replace(href);
  return href;
};

export const readDemoSession = applicationId => {
  try { const raw = localStorage.getItem(keyFor(applicationId)); return raw ? JSON.parse(raw) : null; }
  catch { return null; }
};

export const writeDemoSession = (applicationId, session) => {
  localStorage.setItem(keyFor(applicationId), JSON.stringify(session));
  return session;
};

export const clearDemoSession = applicationId => localStorage.removeItem(keyFor(applicationId));

export const authenticateDemo = ({ applicationId, email, password, account }) => {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  if (normalizedEmail !== account.email.toLowerCase() || password !== account.password) return { ok: false, error: 'The demo email or password is incorrect.' };
  return {
    ok: true,
    session: {
      applicationId,
      user: { name: account.name, email: account.email, organization: account.organization, role: account.role },
      issuedAt: new Date().toISOString(),
      demo: true
    }
  };
};

export const consumeDemoAccessHandoff = ({ applicationId, account }) => {
  if (typeof window === 'undefined' || !account) return null;
  try {
    const url = new URL(window.location.href);
    const requestedApplication = url.searchParams.get('pihub_demo_access');
    const source = url.searchParams.get('source');
    const workflowHandoff = url.searchParams.has('pihub_workflow') && Boolean(url.searchParams.get('workflow_source'));
    const centralHandoff = requestedApplication === applicationId && source === 'investor-access';
    if (!centralHandoff && !workflowHandoff) return null;

    const result = authenticateDemo({ applicationId, email: account.email, password: account.password, account });
    if (!result.ok) return null;
    writeDemoSession(applicationId, result.session);
    url.searchParams.delete('pihub_demo_access');
    url.searchParams.delete('source');
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}` || '/');
    return result.session;
  } catch { return null; }
};
