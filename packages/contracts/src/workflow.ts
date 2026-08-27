export type PiHubApplicationId = 'investor' | 'borrower' | 'advisory' | 'admin' | 'access';

export type DealWorkflowState =
  | 'borrower_draft'
  | 'borrower_submitted'
  | 'advisory_structuring'
  | 'due_diligence'
  | 'investor_review'
  | 'approved'
  | 'documentation'
  | 'compliance_clearance'
  | 'funded'
  | 'portfolio_monitoring'
  | 'rejected'
  | 'closed';

export interface DealWorkflowEvent {
  event: string;
  from: DealWorkflowState;
  to: DealWorkflowState;
  actor: Exclude<PiHubApplicationId, 'access'>;
  reason: string;
  at: string;
}

export interface DealWorkflowSnapshot {
  version: 1;
  dealId: string;
  state: DealWorkflowState;
  revision: number;
  updatedAt: string;
  history: DealWorkflowEvent[];
}

/**
 * Production implementations must persist this contract on the server and
 * enforce authorization there. Browser-local demo storage is not a security
 * or data-consistency boundary.
 */
export interface TransitionDealWorkflowCommand {
  dealId: string;
  expectedRevision: number;
  event: string;
  reason?: string;
}
