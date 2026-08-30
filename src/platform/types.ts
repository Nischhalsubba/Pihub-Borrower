import type { ModuleId } from '../state/model';

export type PlatformWorkflowState = 'not_started' | 'ready' | 'in_progress' | 'blocked' | 'completed' | 'closed';
export type PlatformWorkItemStatus = 'open' | 'in_progress' | 'blocked' | 'done' | 'cancelled';
export type PlatformWorkItemPriority = 'low' | 'normal' | 'high' | 'critical';
export type ComplianceReadinessState = 'not_started' | 'under_review' | 'action_required' | 'cleared' | 'blocked';
export type ApprovalGateType = 'finance' | 'legal' | 'signatory' | 'submission';
export type ApprovalGateStatus = 'pending' | 'approved' | 'rejected' | 'revoked';

export interface PlatformModuleState {
  module: ModuleId;
  state: PlatformWorkflowState;
  revision: number;
  updatedAt: string;
}

export interface BorrowerHandoff {
  id: string;
  fromModule: ModuleId;
  toModule: ModuleId;
  type: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface BorrowerPlatformWorkItem {
  id: string;
  sourceModule: ModuleId;
  kind: string;
  title: string;
  description: string;
  status: PlatformWorkItemStatus;
  priority: PlatformWorkItemPriority;
  dueAt?: string | null;
  actionHref?: string | null;
  borrowerCompletable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BorrowerComplianceReadiness {
  state: ComplianceReadinessState;
  openCount: number;
}

export interface BorrowerApprovalGate {
  type: ApprovalGateType;
  status: ApprovalGateStatus;
  decidedAt?: string | null;
  updatedAt: string;
}

export interface SharedVaultItem {
  id: string;
  documentId: string;
  label: string;
  category: string;
  validUntil?: string | null;
  reusable: boolean;
}

export interface BorrowerPlatformProjection {
  applicationId: string;
  projectionRevision: number;
  moduleStates: PlatformModuleState[];
  borrowerHandoffs: BorrowerHandoff[];
  workItems: BorrowerPlatformWorkItem[];
  compliance: BorrowerComplianceReadiness;
  approvals: BorrowerApprovalGate[];
  submissionReady: boolean;
  vaultItems: SharedVaultItem[];
}

export function moduleDisplayName(module: ModuleId): string {
  if (module === 'borrower') return 'Borrower';
  if (module === 'advisory') return 'Advisory';
  if (module === 'investor') return 'Investor';
  return 'Admin / Compliance';
}
