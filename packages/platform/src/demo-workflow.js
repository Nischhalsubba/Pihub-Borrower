export const DEMO_WORKFLOW_VERSION = 1;
export const DEMO_WORKFLOW_DEAL_ID = 'PH-2026-0147';

export const DEMO_WORKFLOW_STATES = Object.freeze([
  Object.freeze({ id: 'borrower_draft', label: 'Draft', owner: 'borrower', action: 'Submit financing request', event: 'submit', next: 'borrower_submitted' }),
  Object.freeze({ id: 'borrower_submitted', label: 'Submitted', owner: 'advisory', action: 'Start structuring', event: 'start_structuring', next: 'advisory_structuring' }),
  Object.freeze({ id: 'advisory_structuring', label: 'Structuring', owner: 'advisory', action: 'Start due diligence', event: 'start_due_diligence', next: 'due_diligence' }),
  Object.freeze({ id: 'due_diligence', label: 'Due diligence', owner: 'advisory', action: 'Send to Investor', event: 'send_to_investor', next: 'investor_review' }),
  Object.freeze({ id: 'investor_review', label: 'Investor review', owner: 'investor', action: 'Approve for documentation', event: 'approve', next: 'approved', alternate: Object.freeze({ action: 'Reject request', event: 'reject', next: 'rejected' }) }),
  Object.freeze({ id: 'approved', label: 'Approved', owner: 'advisory', action: 'Start documentation', event: 'start_documentation', next: 'documentation' }),
  Object.freeze({ id: 'documentation', label: 'Documentation', owner: 'admin', action: 'Clear compliance conditions', event: 'clear_compliance', next: 'compliance_clearance' }),
  Object.freeze({ id: 'compliance_clearance', label: 'Compliance clear', owner: 'investor', action: 'Confirm funding', event: 'fund', next: 'funded' }),
  Object.freeze({ id: 'funded', label: 'Funded', owner: 'investor', action: 'Start portfolio monitoring', event: 'start_monitoring', next: 'portfolio_monitoring' }),
  Object.freeze({ id: 'portfolio_monitoring', label: 'Monitoring', owner: 'investor', action: 'Close completed facility', event: 'close', next: 'closed' }),
  Object.freeze({ id: 'rejected', label: 'Rejected', owner: null, terminal: true }),
  Object.freeze({ id: 'closed', label: 'Closed', owner: null, terminal: true }),
]);

const STATE_MAP = new Map(DEMO_WORKFLOW_STATES.map(state => [state.id, state]));
const safeText = (value, limit = 160) => String(value || '').trim().slice(0, limit);

export const getDemoWorkflowState = id => STATE_MAP.get(String(id || '')) || null;

export const createInitialDemoWorkflow = () => ({
  version: DEMO_WORKFLOW_VERSION,
  dealId: DEMO_WORKFLOW_DEAL_ID,
  state: 'borrower_draft',
  revision: 0,
  updatedAt: new Date(0).toISOString(),
  history: [],
});

export const sanitizeDemoWorkflow = value => {
  const source = value && typeof value === 'object' ? value : {};
  const state = getDemoWorkflowState(source.state) ? source.state : 'borrower_draft';
  const revision = Number.isInteger(Number(source.revision)) && Number(source.revision) >= 0 ? Number(source.revision) : 0;
  const history = Array.isArray(source.history) ? source.history.slice(-25).flatMap(item => {
    if (!item || typeof item !== 'object' || !getDemoWorkflowState(item.to)) return [];
    return [{
      event: safeText(item.event, 48),
      from: getDemoWorkflowState(item.from) ? item.from : '',
      to: item.to,
      actor: safeText(item.actor, 32),
      reason: safeText(item.reason, 180),
      at: safeText(item.at, 40),
    }];
  }) : [];

  return {
    version: DEMO_WORKFLOW_VERSION,
    dealId: source.dealId === DEMO_WORKFLOW_DEAL_ID ? source.dealId : DEMO_WORKFLOW_DEAL_ID,
    state,
    revision,
    updatedAt: safeText(source.updatedAt, 40) || new Date(0).toISOString(),
    history,
  };
};

export const transitionDemoWorkflow = (snapshot, { event, actor, reason = '' }) => {
  const current = sanitizeDemoWorkflow(snapshot);
  const definition = getDemoWorkflowState(current.state);
  if (!definition || definition.terminal) return { ok: false, error: 'This workflow is already in a terminal state.', snapshot: current };
  if (definition.owner !== actor) return { ok: false, error: `${definition.label} is owned by the ${definition.owner} workspace.`, snapshot: current };

  const primary = event === definition.event ? definition.next : null;
  const alternate = definition.alternate && event === definition.alternate.event ? definition.alternate.next : null;
  const next = primary || alternate;
  if (!next || !getDemoWorkflowState(next)) return { ok: false, error: 'That transition is not allowed from the current state.', snapshot: current };

  const at = new Date().toISOString();
  const updated = {
    ...current,
    state: next,
    revision: current.revision + 1,
    updatedAt: at,
    history: [...current.history, { event, from: current.state, to: next, actor, reason: safeText(reason, 180), at }].slice(-25),
  };
  return { ok: true, snapshot: updated };
};

export const getDemoWorkflowProgress = snapshot => {
  const current = sanitizeDemoWorkflow(snapshot);
  const visible = DEMO_WORKFLOW_STATES.filter(state => !state.terminal || state.id === current.state);
  const index = Math.max(0, visible.findIndex(state => state.id === current.state));
  return { current, visible, index, percent: Math.round((index / Math.max(1, visible.length - 1)) * 100) };
};
