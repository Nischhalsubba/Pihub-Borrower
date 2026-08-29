import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Application, BorrowerDocument, BorrowerState, PrivacyRequest, ServicingRequest, SupportTicket, TeamMember } from './model';
import type { BorrowerFeatureAction } from './advancedModel';
import { applyAdvancedAction, workflowReadiness } from './advanced';
import {
  activeApplication,
  completionPercentage,
  createApplication,
  createDraftFromVersion,
  createInitialState,
  createPrivacyRequest,
  createServicingRequest,
  createSupportTicket,
  decideTermSheet,
  inviteTeamMember,
  markNotificationRead,
  migrateState,
  removeDocument,
  reportPaymentMade,
  resendTeamInvitation,
  respondToRequest,
  setActiveApplication,
  setApplicationStatus,
  setLocale,
  submitReportingObligation,
  toggleClosingItem,
  toggleComparedProduct,
  toggleSavedProduct,
  withdrawServicingRequest,
  updateApplicationSection,
  updateProfile,
  updateTeamMember,
  upsertDocument,
  withdrawApplication
} from './core';
import { deleteDocumentBlob, getDocumentBlob, putDocumentBlob } from './indexedDb';
import { useAuth } from '../auth/AuthContext';
import { createDocumentUploadIntent, fetchBorrowerSnapshot, sendBorrowerCommand, type PlatformCommandResult } from '../services/platformApi';
import { runtimeMode } from '../services/runtime';

const STORAGE_KEY = 'pihub.borrower.v5';
const LEGACY_STORAGE_KEYS = ['pihub.borrower.v4', 'pihub.borrower.v3', 'pihub.borrower.v2'];
const COMMAND_RECONCILE_DELAY_MS = 4_000;

function loadState(): BorrowerState {
  if (runtimeMode() === 'api') return createInitialState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? LEGACY_STORAGE_KEYS.map((key) => localStorage.getItem(key)).find(Boolean);
    if (!raw) return createInitialState();
    return migrateState(JSON.parse(raw));
  } catch {
    return createInitialState();
  }
}

interface StoreApi {
  state: BorrowerState;
  mode: 'demo' | 'api';
  ready: boolean;
  connectionStatus: 'demo' | 'syncing' | 'synced' | 'error';
  connectionError?: string;
  reloadFromApi: () => Promise<void>;
  app: ReturnType<typeof activeApplication>;
  completion: number;
  saveLabel: string;
  createApplication: (name: string, productId?: string | null) => void;
  setActiveApplication: (applicationId: string) => void;
  createDraftFromVersion: (versionId: string) => void;
  withdrawApplication: (applicationId: string) => void;
  updateSection: <K extends keyof Pick<Application, 'financing' | 'company' | 'project' | 'financials'>>(section: K, patch: Partial<Application[K]>, complete?: boolean) => void;
  submitApplication: () => void;
  setApplicationStatus: (status: BorrowerState['applications'][number]['status']) => void;
  uploadDocument: (file: File, category: string, replaceId?: string) => Promise<void>;
  removeDocument: (id: string) => Promise<void>;
  downloadDocument: (document: BorrowerDocument) => Promise<boolean>;
  respondToRequest: (id: string, text: string, attachments?: string[]) => void;
  markNotificationRead: (id?: string) => void;
  inviteTeamMember: (input: Pick<TeamMember, 'name' | 'email' | 'role'>) => void;
  resendTeamInvitation: (memberId: string) => void;
  updateTeamMember: (id: string, patch: Partial<Pick<TeamMember, 'role' | 'status'>>) => void;
  decideTerm: (id: string, decision: 'accepted' | 'rejected') => void;
  toggleClosingItem: (id: string, complete: boolean) => void;
  toggleSavedProduct: (id: string) => void;
  toggleComparedProduct: (id: string) => void;
  createSupportTicket: (input: Pick<SupportTicket, 'category' | 'subject' | 'message'>) => void;
  createServicingRequest: (input: Pick<ServicingRequest, 'facilityId' | 'type' | 'subject' | 'description'>) => void;
  withdrawServicingRequest: (requestId: string) => void;
  submitReportingObligation: (obligationId: string, documentId?: string) => void;
  reportPaymentMade: (paymentId: string, note: string) => void;
  createPrivacyRequest: (type: PrivacyRequest['type'], note?: string) => void;
  feature: (action: BorrowerFeatureAction) => void;
  updateProfile: (patch: Partial<BorrowerState['profile']>) => void;
  setLocale: (locale: BorrowerState['locale']) => void;
  resetDemo: () => void;
}

const StoreContext = createContext<StoreApi | null>(null);

export function BorrowerStoreProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const mode = runtimeMode();
  const [state, setState] = useState<BorrowerState>(() => loadState());
  const [ready, setReady] = useState(mode === 'demo');
  const [connectionStatus, setConnectionStatus] = useState<'demo' | 'syncing' | 'synced' | 'error'>(mode === 'demo' ? 'demo' : 'syncing');
  const [connectionError, setConnectionError] = useState<string>();
  const reconcileTimerRef = useRef<number | null>(null);

  const clearReconciliationTimer = useCallback(() => {
    if (reconcileTimerRef.current !== null) {
      window.clearTimeout(reconcileTimerRef.current);
      reconcileTimerRef.current = null;
    }
  }, []);

  const loadFromApi = useCallback(async (force: boolean) => {
    if (mode !== 'api' || auth.status !== 'authenticated') return;
    clearReconciliationTimer();
    setConnectionStatus('syncing');
    setConnectionError(undefined);
    try {
      const snapshot = migrateState(await fetchBorrowerSnapshot({ force }));
      setState(snapshot);
      setReady(true);
      setConnectionStatus('synced');
    } catch (error) {
      setReady(false);
      setConnectionStatus('error');
      setConnectionError(error instanceof Error ? error.message : 'Unable to load Borrower data from PiHub.');
    }
  }, [auth.status, clearReconciliationTimer, mode]);

  const reloadFromApi = useCallback(() => loadFromApi(true), [loadFromApi]);

  const scheduleReconciliation = useCallback(() => {
    if (mode !== 'api' || auth.status !== 'authenticated') return;
    clearReconciliationTimer();
    reconcileTimerRef.current = window.setTimeout(() => {
      reconcileTimerRef.current = null;
      void loadFromApi(true);
    }, COMMAND_RECONCILE_DELAY_MS);
  }, [auth.status, clearReconciliationTimer, loadFromApi, mode]);

  const acceptCommandResult = useCallback((result: PlatformCommandResult) => {
    if (result.snapshot) {
      clearReconciliationTimer();
      setState(migrateState(result.snapshot));
      setReady(true);
      setConnectionStatus('synced');
      return;
    }
    scheduleReconciliation();
  }, [clearReconciliationTimer, scheduleReconciliation]);

  useEffect(() => {
    // Initial authentication hydration may reuse a snapshot already returned by
    // /session or /login. Explicit reloads and mutation reconciliation still force
    // authoritative reads so request reduction never turns into stale finance state.
    if (mode === 'api' && auth.status === 'authenticated') void loadFromApi(false);
    if (mode === 'api' && auth.status === 'unauthenticated') {
      clearReconciliationTimer();
      setReady(false);
    }
  }, [auth.status, clearReconciliationTimer, loadFromApi, mode]);

  useEffect(() => () => clearReconciliationTimer(), [clearReconciliationTimer]);

  useEffect(() => {
    if (mode === 'demo') localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    document.documentElement.lang = state.locale;
  }, [mode, state]);

  const update = useCallback((fn: (current: BorrowerState) => BorrowerState) => setState((current) => fn(current)), []);
  const dispatchCommand = useCallback((command: string, payload: Record<string, unknown>, aggregateId?: string) => {
    if (mode !== 'api' || auth.status !== 'authenticated') return;
    setConnectionStatus('syncing');
    setConnectionError(undefined);
    void sendBorrowerCommand({ idempotencyKey: crypto.randomUUID(), command, aggregateId, payload }).then((result) => {
      acceptCommandResult(result);
    }).catch(async (error) => {
      const message = error instanceof Error ? error.message : 'PiHub command failed.';
      clearReconciliationTimer();
      try { setState(migrateState(await fetchBorrowerSnapshot({ force: true }))); } catch { /* keep current recovery path */ }
      setConnectionStatus('error');
      setConnectionError(message);
    });
  }, [acceptCommandResult, auth.status, clearReconciliationTimer, mode]);
  const app = activeApplication(state);
  const completion = completionPercentage(app, state.documents);
  const saveLabel = useMemo(() => {
    if (mode === 'api') {
      if (connectionStatus === 'syncing') return 'Syncing…';
      if (connectionStatus === 'error') return 'Sync needs attention';
      return 'Synced with PiHub';
    }
    const d = new Date(state.lastSavedAt);
    return Number.isNaN(d.getTime()) ? 'Saved' : `Saved ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }, [connectionStatus, mode, state.lastSavedAt]);

  const api: StoreApi = {
    state,
    mode,
    ready,
    connectionStatus,
    connectionError,
    reloadFromApi,
    app,
    completion,
    saveLabel,
    createApplication: (name, productId) => { update((s) => createApplication(s, { name, productId })); dispatchCommand('application.create', { name, productId: productId ?? null }); },
    setActiveApplication: (applicationId) => update((s) => setActiveApplication(s, applicationId)),
    createDraftFromVersion: (versionId) => { update((s) => createDraftFromVersion(s, versionId)); dispatchCommand('application.create_from_version', { versionId }); },
    withdrawApplication: (applicationId) => { update((s) => withdrawApplication(s, applicationId)); dispatchCommand('application.withdraw', {}, applicationId); },
    updateSection: (section, patch, complete = true) => { const applicationId = state.activeApplicationId; update((s) => updateApplicationSection(s, section, patch, complete)); dispatchCommand('application.section.update', { section, patch: patch as Record<string, unknown>, complete }, applicationId); },
    submitApplication: () => { const applicationId = state.activeApplicationId; const currentApp = activeApplication(state); const ready = completionPercentage(currentApp, state.documents) === 100 && workflowReadiness(state, applicationId).ready; if (!ready || currentApp.status !== 'draft') return; if (mode === 'demo') update((s) => setApplicationStatus(s, 'submitted')); dispatchCommand('application.submit', {}, applicationId); },
    setApplicationStatus: (status) => { const applicationId = state.activeApplicationId; update((s) => setApplicationStatus(s, status)); dispatchCommand('application.status.request', { status }, applicationId); },
    uploadDocument: async (file, category, replaceId) => {
      if (mode === 'api') {
        setConnectionStatus('syncing');
        setConnectionError(undefined);
        const applicationId = state.activeApplicationId;
        const intent = await createDocumentUploadIntent({ applicationId, name: file.name, contentType: file.type || 'application/octet-stream', size: file.size, category });
        const upload = await fetch(intent.uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type || 'application/octet-stream', ...(intent.headers ?? {}) } });
        if (!upload.ok) throw new Error(`Secure document upload failed (${upload.status}).`);
        const result = await sendBorrowerCommand({ idempotencyKey: crypto.randomUUID(), command: 'document.upload.finalize', aggregateId: intent.documentId, payload: { applicationId, versionId: intent.versionId, replaceId: replaceId ?? null, category } });
        acceptCommandResult(result);
        return;
      }
      const key = `blob:${replaceId ?? crypto.randomUUID()}`;
      await putDocumentBlob(key, file);
      update((s) => upsertDocument(s, {
        ...(replaceId ? { id: replaceId } : {}),
        applicationId: activeApplication(s).id,
        category,
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        required: replaceId ? (state.documents.find((item) => item.id === replaceId)?.required ?? false) : false,
        blobKey: key
      }));
    },
    removeDocument: async (documentId) => {
      if (mode === 'api') {
        setConnectionStatus('syncing');
        setConnectionError(undefined);
        const result = await sendBorrowerCommand({ idempotencyKey: crypto.randomUUID(), command: 'document.remove', aggregateId: documentId, payload: {} });
        acceptCommandResult(result);
        return;
      }
      const doc = state.documents.find((item) => item.id === documentId);
      if (doc?.blobKey) await deleteDocumentBlob(doc.blobKey);
      update((s) => removeDocument(s, documentId));
    },
    downloadDocument: async (document) => {
      if (mode === 'api') {
        const base = (import.meta.env.VITE_PIHUB_API_BASE_URL ?? '').replace(/\/$/, '');
        if (!base) return false;
        const response = await fetch(`${base}/api/v1/borrower/documents/${encodeURIComponent(document.id)}/download`, { credentials: 'include', redirect: 'follow' });
        if (!response.ok) return false;
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const anchor = window.document.createElement('a'); anchor.href = url; anchor.download = document.name; anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        return true;
      }
      if (!document.blobKey) return false;
      const blob = await getDocumentBlob(document.blobKey);
      if (!blob) return false;
      const url = URL.createObjectURL(blob);
      const anchor = window.document.createElement('a');
      anchor.href = url;
      anchor.download = document.name;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      return true;
    },
    respondToRequest: (requestId, text, attachments = []) => { update((s) => respondToRequest(s, requestId, text, attachments)); dispatchCommand('request.respond', { text, attachmentDocumentIds: attachments }, requestId); },
    markNotificationRead: (notificationId) => { update((s) => markNotificationRead(s, notificationId)); dispatchCommand(notificationId ? 'notification.read' : 'notification.read_all', notificationId ? { notificationId } : {}); },
    inviteTeamMember: (input) => { update((s) => inviteTeamMember(s, input)); dispatchCommand('organization.member.invite', input as unknown as Record<string, unknown>, state.organization.id); },
    resendTeamInvitation: (memberId) => { update((s) => resendTeamInvitation(s, memberId)); dispatchCommand('organization.member.invitation.resend', { memberId }, state.organization.id); },
    updateTeamMember: (memberId, patch) => { update((s) => updateTeamMember(s, memberId, patch)); dispatchCommand('organization.member.update', { memberId, patch }, state.organization.id); },
    decideTerm: (termId, decision) => { update((s) => decideTermSheet(s, termId, decision)); dispatchCommand('terms.decide', { decision }, termId); },
    toggleClosingItem: (itemId, complete) => { update((s) => toggleClosingItem(s, itemId, complete)); dispatchCommand('closing.item.set', { complete }, itemId); },
    toggleSavedProduct: (productId) => { update((s) => toggleSavedProduct(s, productId)); dispatchCommand('preference.product.saved.toggle', { productId }); },
    toggleComparedProduct: (productId) => { update((s) => toggleComparedProduct(s, productId)); dispatchCommand('preference.product.compare.toggle', { productId }); },
    createSupportTicket: (input) => { update((s) => createSupportTicket(s, input)); dispatchCommand('support.request.create', input as unknown as Record<string, unknown>, state.activeApplicationId); },
    createServicingRequest: (input) => { update((s) => createServicingRequest(s, input)); dispatchCommand('servicing.request.create', input as unknown as Record<string, unknown>, input.facilityId); },
    withdrawServicingRequest: (requestId) => { update((s) => withdrawServicingRequest(s, requestId)); dispatchCommand('servicing.request.withdraw', {}, requestId); },
    submitReportingObligation: (obligationId, documentId) => { update((s) => submitReportingObligation(s, obligationId, documentId)); dispatchCommand('reporting.submit', { documentId: documentId ?? null }, obligationId); },
    reportPaymentMade: (paymentId, note) => { update((s) => reportPaymentMade(s, paymentId, note)); dispatchCommand('payment.notice.create', { note }, paymentId); },
    createPrivacyRequest: (type, note = '') => { update((s) => createPrivacyRequest(s, type, note)); dispatchCommand('privacy.request.create', { type, note }, state.organization.id); },
    feature: (action) => { if (mode === 'demo') update((s) => applyAdvancedAction(s, action)); dispatchCommand('borrower.feature', action as unknown as Record<string, unknown>, state.activeApplicationId); },
    updateProfile: (patch) => { update((s) => updateProfile(s, patch)); dispatchCommand('profile.update', { patch }); },
    setLocale: (locale) => { update((s) => setLocale(s, locale)); dispatchCommand('profile.locale.set', { locale }); },
    resetDemo: () => { if (mode === 'demo') setState(createInitialState()); }
  };

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>;
}

export function useBorrowerStore(): StoreApi {
  const value = useContext(StoreContext);
  if (!value) throw new Error('useBorrowerStore must be used inside BorrowerStoreProvider');
  return value;
}
