import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import {
  completeBorrowerPlatformWorkItem,
  fetchBorrowerIntegrationProjection,
  setBorrowerPlatformApproval
} from '../services/platformApi';
import type { ApplicationStatus, BorrowerState, ModuleId } from '../state/model';
import { useBorrowerStore } from '../state/store';
import type {
  ApprovalGateStatus,
  ApprovalGateType,
  BorrowerPlatformProjection,
  PlatformModuleState,
  PlatformWorkflowState
} from './types';

interface PlatformIntegrationApi {
  projection: BorrowerPlatformProjection | null;
  status: 'idle' | 'syncing' | 'ready' | 'error';
  error?: string;
  workingId?: string;
  refresh: () => Promise<void>;
  completeWorkItem: (workItemId: string) => Promise<void>;
  setApproval: (type: ApprovalGateType, decision: Exclude<ApprovalGateStatus, 'pending'>, note?: string) => Promise<void>;
}

const PlatformIntegrationContext = createContext<PlatformIntegrationApi | null>(null);
const APP_STAGE: Record<ApplicationStatus, number> = {
  draft: 0,
  submitted: 1,
  pihub_review: 1,
  information_required: 1,
  structuring: 2,
  due_diligence: 2,
  investor_review: 3,
  indicative_terms: 4,
  terms_accepted: 4,
  documentation: 4,
  conditions_precedent: 5,
  ready_to_fund: 5,
  funded: 6,
  declined: -1,
  withdrawn: -1,
  archived: -1
};

function stateFor(module: ModuleId, appStatus: ApplicationStatus, compliance: PlatformWorkflowState): PlatformWorkflowState {
  if (APP_STAGE[appStatus] < 0) return 'closed';
  const stage = APP_STAGE[appStatus];
  if (module === 'borrower') return stage === 0 ? 'in_progress' : 'completed';
  if (module === 'admin') return compliance;
  if (module === 'advisory') {
    if (stage < 1) return 'not_started';
    if (stage <= 3) return 'in_progress';
    return 'completed';
  }
  if (stage < 3) return 'not_started';
  if (stage === 3) return 'in_progress';
  return 'completed';
}

function buildDemoProjection(state: BorrowerState, applicationId: string): BorrowerPlatformProjection {
  const app = state.applications.find((item) => item.id === applicationId) ?? state.applications[0];
  const complianceState = state.organization.verificationStatus === 'verified'
    ? 'cleared'
    : state.organization.verificationStatus === 'action_required'
      ? 'action_required'
      : 'under_review';
  const adminWorkflow: PlatformWorkflowState = complianceState === 'cleared'
    ? 'completed'
    : complianceState === 'action_required'
      ? 'blocked'
      : 'in_progress';
  const updatedAt = app.updatedAt;
  const modules: ModuleId[] = ['borrower', 'advisory', 'admin', 'investor'];
  const moduleStates: PlatformModuleState[] = modules.map((module, index) => ({
    module,
    state: stateFor(module, app.status, adminWorkflow),
    revision: index + 1,
    updatedAt
  }));
  const alreadySubmitted = APP_STAGE[app.status] > 0;
  const approvalStatus: ApprovalGateStatus = alreadySubmitted ? 'approved' : 'pending';
  const approvals = (['finance', 'legal', 'signatory'] as ApprovalGateType[]).map((type) => ({
    type,
    status: approvalStatus,
    decidedAt: alreadySubmitted ? app.submittedAt ?? updatedAt : null,
    updatedAt
  }));

  const workItems = state.organization.verificationStatus === 'action_required' ? [{
    id: '66666666-6666-4666-8666-666666666666',
    sourceModule: 'admin' as const,
    kind: 'compliance_action',
    title: 'Update organization verification information',
    description: 'PiHub needs updated borrower-facing organization information before the financing process can continue.',
    status: 'open' as const,
    priority: 'high' as const,
    dueAt: null,
    actionHref: '/company',
    borrowerCompletable: false,
    createdAt: updatedAt,
    updatedAt
  }] : [];

  return {
    applicationId: app.id,
    projectionRevision: Math.max(...moduleStates.map((item) => item.revision), 0),
    moduleStates,
    borrowerHandoffs: alreadySubmitted ? [{
      id: `demo-handoff-${app.id}`,
      fromModule: 'borrower',
      toModule: 'advisory',
      type: 'application_submission',
      status: 'accepted',
      createdAt: app.submittedAt ?? updatedAt,
      updatedAt
    }] : [],
    workItems,
    compliance: { state: complianceState, openCount: workItems.length },
    approvals,
    submissionReady: approvals.every((item) => item.status === 'approved'),
    vaultItems: state.advanced.companyVault.map((item) => ({
      id: item.id,
      documentId: item.documentId,
      label: item.label,
      category: item.category,
      validUntil: item.validUntil ?? null,
      reusable: item.reusable
    }))
  };
}

function demoStorageKey(applicationId: string, createdAt: string): string {
  return `pihub.borrower.platform.v1:${applicationId}:${createdAt}`;
}

function loadDemoProjection(state: BorrowerState, applicationId: string): BorrowerPlatformProjection {
  const app = state.applications.find((item) => item.id === applicationId) ?? state.applications[0];
  const fallback = buildDemoProjection(state, applicationId);
  try {
    const raw = localStorage.getItem(demoStorageKey(app.id, app.createdAt));
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as BorrowerPlatformProjection;
    if (parsed.applicationId !== app.id) return fallback;

    const approvals = parsed.approvals?.length ? parsed.approvals : fallback.approvals;
    const persistedWork = new Map((parsed.workItems ?? []).map((item) => [item.id, item]));
    const workItems = fallback.workItems.map((item) => {
      const persisted = persistedWork.get(item.id);
      return persisted ? { ...item, status: persisted.status, updatedAt: persisted.updatedAt } : item;
    });
    const submissionReady = (['finance', 'legal', 'signatory'] as ApprovalGateType[])
      .every((gate) => approvals.some((item) => item.type === gate && item.status === 'approved'));

    return {
      ...fallback,
      projectionRevision: Math.max(fallback.projectionRevision, parsed.projectionRevision ?? 0),
      approvals,
      submissionReady,
      workItems
    };
  } catch {
    return fallback;
  }
}

export function PlatformIntegrationProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const store = useBorrowerStore();
  const [projection, setProjection] = useState<BorrowerPlatformProjection | null>(null);
  const [status, setStatus] = useState<PlatformIntegrationApi['status']>('idle');
  const [error, setError] = useState<string>();
  const [workingId, setWorkingId] = useState<string>();
  const app = store.app;

  const refresh = useCallback(async () => {
    setError(undefined);
    if (store.mode === 'demo') {
      setProjection(loadDemoProjection(store.state, app.id));
      setStatus('ready');
      return;
    }
    if (auth.status !== 'authenticated') {
      setProjection(null);
      setStatus('idle');
      return;
    }
    setStatus('syncing');
    try {
      setProjection(await fetchBorrowerIntegrationProjection(app.id, { force: true }));
      setStatus('ready');
    } catch (reason) {
      setStatus('error');
      setError(reason instanceof Error ? reason.message : 'Unable to load shared PiHub workflow state.');
    }
  }, [app.id, auth.status, store.mode, store.state]);

  useEffect(() => {
    void refresh();
  }, [app.id, app.createdAt, app.status, auth.status, store.mode, store.state.organization.verificationStatus, store.state.advanced.companyVault.length]);

  useEffect(() => {
    if (store.mode !== 'demo' || !projection) return;
    try {
      localStorage.setItem(demoStorageKey(app.id, app.createdAt), JSON.stringify(projection));
    } catch { /* demo persistence is best-effort */ }
  }, [app.createdAt, app.id, projection, store.mode]);

  const completeWorkItem = useCallback(async (workItemId: string) => {
    if (!projection) return;
    setWorkingId(workItemId);
    setError(undefined);
    try {
      if (store.mode === 'demo') {
        setProjection((current) => current ? {
          ...current,
          projectionRevision: current.projectionRevision + 1,
          workItems: current.workItems.map((item) => item.id === workItemId
            ? { ...item, status: 'done', updatedAt: new Date().toISOString() }
            : item)
        } : current);
      } else {
        await completeBorrowerPlatformWorkItem(workItemId);
        setProjection(await fetchBorrowerIntegrationProjection(app.id, { force: true }));
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to complete this PiHub work item.');
      throw reason;
    } finally {
      setWorkingId(undefined);
    }
  }, [app.id, projection, store.mode]);

  const setApproval = useCallback(async (type: ApprovalGateType, decision: Exclude<ApprovalGateStatus, 'pending'>, note = '') => {
    if (!projection) return;
    setWorkingId(`approval:${type}`);
    setError(undefined);
    try {
      if (store.mode === 'demo') {
        setProjection((current) => {
          if (!current) return current;
          const now = new Date().toISOString();
          const approvals = current.approvals.some((item) => item.type === type)
            ? current.approvals.map((item) => item.type === type ? { ...item, status: decision, decidedAt: now, updatedAt: now } : item)
            : [...current.approvals, { type, status: decision, decidedAt: now, updatedAt: now }];
          return {
            ...current,
            projectionRevision: current.projectionRevision + 1,
            approvals,
            submissionReady: (['finance', 'legal', 'signatory'] as ApprovalGateType[]).every((gate) => approvals.some((item) => item.type === gate && item.status === 'approved'))
          };
        });
      } else {
        await setBorrowerPlatformApproval(app.id, type, decision, note);
        setProjection(await fetchBorrowerIntegrationProjection(app.id, { force: true }));
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to update this organization approval.');
      throw reason;
    } finally {
      setWorkingId(undefined);
    }
  }, [app.id, projection, store.mode]);

  const value = useMemo<PlatformIntegrationApi>(() => ({
    projection,
    status,
    error,
    workingId,
    refresh,
    completeWorkItem,
    setApproval
  }), [completeWorkItem, error, projection, refresh, setApproval, status, workingId]);

  return <PlatformIntegrationContext.Provider value={value}>{children}</PlatformIntegrationContext.Provider>;
}

export function usePlatformIntegration(): PlatformIntegrationApi {
  const value = useContext(PlatformIntegrationContext);
  if (!value) throw new Error('usePlatformIntegration must be used inside PlatformIntegrationProvider');
  return value;
}
