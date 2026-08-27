import { describe, expect, it } from 'vitest';
import {
  createInitialDemoWorkflow,
  getDemoWorkflowState,
  transitionDemoWorkflow,
} from '../packages/platform/src/demo-workflow';

const advance = (snapshot, actor) => {
  const definition = getDemoWorkflowState(snapshot.state);
  const result = transitionDemoWorkflow(snapshot, { event: definition.event, actor, reason: `QA ${definition.event}` });
  expect(result.ok).toBe(true);
  return result.snapshot;
};

describe('canonical PiHub financing lifecycle', () => {
  it('runs from Borrower draft through Advisory, Investor, Admin, funding and close', () => {
    let workflow = createInitialDemoWorkflow();
    const expected = [
      ['borrower', 'borrower_submitted'],
      ['advisory', 'advisory_structuring'],
      ['advisory', 'due_diligence'],
      ['advisory', 'investor_review'],
      ['investor', 'approved'],
      ['advisory', 'documentation'],
      ['admin', 'compliance_clearance'],
      ['investor', 'funded'],
      ['investor', 'portfolio_monitoring'],
      ['investor', 'closed'],
    ];

    for (const [actor, state] of expected) {
      workflow = advance(workflow, actor);
      expect(workflow.state).toBe(state);
    }

    expect(workflow.revision).toBe(expected.length);
    expect(workflow.history).toHaveLength(expected.length);
    expect(getDemoWorkflowState(workflow.state)?.terminal).toBe(true);
    const impossible = transitionDemoWorkflow(workflow, { event: 'fund', actor: 'investor' });
    expect(impossible.ok).toBe(false);
  });

  it('rejects wrong-workspace actions and supports the explicit rejection terminal path', () => {
    let workflow = createInitialDemoWorkflow();
    const wrongOwner = transitionDemoWorkflow(workflow, { event: 'submit', actor: 'advisory' });
    expect(wrongOwner.ok).toBe(false);
    expect(wrongOwner.snapshot.state).toBe('borrower_draft');

    workflow = advance(workflow, 'borrower');
    workflow = advance(workflow, 'advisory');
    workflow = advance(workflow, 'advisory');
    workflow = advance(workflow, 'advisory');
    expect(workflow.state).toBe('investor_review');

    const rejected = transitionDemoWorkflow(workflow, { event: 'reject', actor: 'investor', reason: 'QA decline path' });
    expect(rejected.ok).toBe(true);
    expect(rejected.snapshot.state).toBe('rejected');
    expect(getDemoWorkflowState(rejected.snapshot.state)?.terminal).toBe(true);
  });
});
