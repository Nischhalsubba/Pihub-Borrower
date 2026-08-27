import {
  createInitialDemoWorkflow,
  DEMO_WORKFLOW_DEAL_ID,
  sanitizeDemoWorkflow,
} from './demo-workflow';

const STORAGE_KEY = `pihub:demo-workflow:${DEMO_WORKFLOW_DEAL_ID}:v1`;
const HANDOFF_PARAM = 'pihub_workflow';
const SOURCE_PARAM = 'workflow_source';
const encoder = value => {
  const json = JSON.stringify(sanitizeDemoWorkflow(value));
  if (typeof Buffer !== 'undefined') return Buffer.from(json, 'utf8').toString('base64url');
  return btoa(unescape(encodeURIComponent(json))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const decoder = value => {
  const normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
  const json = typeof Buffer !== 'undefined'
    ? Buffer.from(padded, 'base64').toString('utf8')
    : decodeURIComponent(escape(atob(padded)));
  return sanitizeDemoWorkflow(JSON.parse(json));
};

const storage = () => typeof window === 'undefined' ? null : window.localStorage;

export const readDemoWorkflow = () => {
  try {
    const raw = storage()?.getItem(STORAGE_KEY);
    return raw ? sanitizeDemoWorkflow(JSON.parse(raw)) : createInitialDemoWorkflow();
  } catch {
    return createInitialDemoWorkflow();
  }
};

export const writeDemoWorkflow = snapshot => {
  const clean = sanitizeDemoWorkflow(snapshot);
  storage()?.setItem(STORAGE_KEY, JSON.stringify(clean));
  return clean;
};

export const resetDemoWorkflow = () => {
  storage()?.removeItem(STORAGE_KEY);
  return createInitialDemoWorkflow();
};

export const encodeDemoWorkflowHandoff = encoder;
export const decodeDemoWorkflowHandoff = decoder;

export const buildDemoWorkflowHandoffHref = ({ origin, snapshot, source }) => {
  try {
    const url = new URL(String(origin || '').trim());
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return '';
    url.searchParams.set(HANDOFF_PARAM, encoder(snapshot));
    url.searchParams.set(SOURCE_PARAM, String(source || '').trim().toLowerCase());
    return url.toString();
  } catch {
    return '';
  }
};

export const consumeDemoWorkflowHandoff = () => {
  if (typeof window === 'undefined') return null;
  try {
    const url = new URL(window.location.href);
    const encoded = url.searchParams.get(HANDOFF_PARAM);
    if (!encoded) return null;
    const snapshot = writeDemoWorkflow(decoder(encoded));
    url.searchParams.delete(HANDOFF_PARAM);
    url.searchParams.delete(SOURCE_PARAM);
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}` || '/');
    return snapshot;
  } catch {
    return null;
  }
};

export const getDefaultDemoDestinations = env => ({
  investor: env?.VITE_INVESTOR_APP_URL || 'https://pihub-investor.vercel.app/dashboard',
  borrower: env?.VITE_BORROWER_APP_URL || 'https://pihub-borrower-nischhalsubbas-projects.vercel.app/',
  advisory: env?.VITE_ADVISORY_APP_URL || 'https://pihub-advisory-nischhalsubbas-projects.vercel.app/',
  admin: env?.VITE_ADMIN_APP_URL || 'https://pihub-admin-nischhalsubbas-projects.vercel.app/',
});
