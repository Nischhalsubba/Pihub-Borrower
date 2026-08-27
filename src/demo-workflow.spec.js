import { describe, expect, it } from 'vitest';
import {
  createInitialDemoWorkflow,
  getDemoWorkflowState,
  transitionDemoWorkflow,
} from '../packages/platform/src/demo-workflow';
import {
  buildDemoWorkflowHandoffHref,
  decodeDemoWorkflowHandoff,
  encodeDemoWorkflowHandoff,
} from '../packages/platform/src/demo-workflow-store';

const happyPath = [
  ['borrower', 'submit', 'borrower_submitted'],
  ['advisory', 'start_structuring', 'advisory_structuring'],
  ['advisory', 'start_due_diligence', 'due_diligence'],
  ['advisory', 'send_to_investor', 'investor_review'],
  ['investor', 'approve', 'approved'],
  ['advisory', 'start_documentation', 'documentation'],
  ['admin', 'clear_compliance', 'compliance_clearance'],
  ['investor', 'fund', 'funded'],
  ['investor', 'start_monitoring', 'portfolio_monitoring'],
  ['investor', 'close', 'closed'],
];

describe('canonical PiHub demo workflow', () => {
  it('has a defined owner, start and terminal state for the complete happy path', () => {
    let snapshot = createInitialDemoWorkflow();
    for (const [actor, event, expected] of happyPath) {
      const result = transitionDemoWorkflow(snapshot, { actor, event });
      expect(result.ok).toBe(true);
      snapshot = result.snapshot;
      expect(snapshot.state).toBe(expected);
    }
    expect(getDemoWorkflowState(snapshot.state)?.terminal).toBe(true);
    expect(snapshot.history).toHaveLength(happyPath.length);
  });

  it('rejects actions from the wrong module and invalid state jumps', () => {
    const initial = createInitialDemoWorkflow();
    expect(transitionDemoWorkflow(initial, { actor: 'investor', event: 'fund' }).ok).toBe(false);
    expect(transitionDemoWorkflow(initial, { actor: 'borrower', event: 'close' }).ok).toBe(false);
  });

  it('supports an explicit rejected terminal state', () => {
    let snapshot = createInitialDemoWorkflow();
    for (const [actor, event] of happyPath.slice(0, 4)) snapshot = transitionDemoWorkflow(snapshot, { actor, event }).snapshot;
    const rejected = transitionDemoWorkflow(snapshot, { actor: 'investor', event: 'reject', reason: 'Risk outside mandate' });
    expect(rejected.ok).toBe(true);
    expect(rejected.snapshot.state).toBe('rejected');
    expect(getDemoWorkflowState('rejected')?.terminal).toBe(true);
  });

  it('serializes only workflow state into a safe absolute handoff URL', () => {
    const snapshot = createInitialDemoWorkflow();
    const encoded = encodeDemoWorkflowHandoff(snapshot);
    expect(decodeDemoWorkflowHandoff(encoded)).toMatchObject({ dealId: snapshot.dealId, state: snapshot.state });
    const href = buildDemoWorkflowHandoffHref({ origin: 'https://advisory.example.test/', snapshot, source: 'borrower' });
    const url = new URL(href);
    expect(url.origin).toBe('https://advisory.example.test');
    expect(url.searchParams.get('pihub_workflow')).toBeTruthy();
    expect(url.search).not.toMatch(/password|token|email/i);
    expect(buildDemoWorkflowHandoffHref({ origin: 'javascript:alert(1)', snapshot, source: 'borrower' })).toBe('');
  });
});
