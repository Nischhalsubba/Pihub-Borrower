import React from 'react';
import { getDefaultDemoDestinations, readDemoWorkflow } from '../packages/platform/src/demo-workflow-store';
import { getDemoWorkflowState } from '../packages/platform/src/demo-workflow';
import { Card, PageHead, Status } from '../packages/ui/src/Primitives';
import WorkflowJourney from '../packages/ui/src/WorkflowJourney';

const stateIndex = state => ({
  borrower_draft: 0,
  borrower_submitted: 0,
  advisory_structuring: 0,
  due_diligence: 0,
  investor_review: 0,
  approved: 1,
  documentation: 1,
  compliance_clearance: 1,
  funded: 2,
  portfolio_monitoring: 2,
  closed: 3,
  rejected: -1,
}[state] ?? 0);

export default function ClosingStatus() {
  const workflow = readDemoWorkflow();
  const definition = getDemoWorkflowState(workflow.state);
  const index = stateIndex(workflow.state);
  const rejected = workflow.state === 'rejected';
  const tone = stage => rejected ? 'bad' : index > stage ? 'good' : index === stage ? 'warn' : '';
  const label = stage => rejected ? 'Stopped' : index > stage ? 'Complete' : index === stage ? 'Current' : 'Pending';

  return <div className="ph-page-shell">
    <PageHead eyebrow="Borrower / Closing" title="Terms & closing" subtitle="Follow commercial terms, documentation, compliance conditions and funding against the same canonical workflow used by Advisory, Investor and Admin." />
    <section className="ph-kpi-tape" aria-label="Closing summary">
      <article className="ph-kpi is-signal"><span className="ph-kpi-label"><i/>Deal state</span><strong className="ph-kpi-value" style={{ fontSize: 20 }}>{definition?.label || workflow.state}</strong><span className="ph-kpi-detail">Revision {workflow.revision}</span></article>
      <article className="ph-kpi"><span className="ph-kpi-label"><i/>Current owner</span><strong className="ph-kpi-value" style={{ fontSize: 20 }}>{definition?.owner || 'Complete'}</strong><span className="ph-kpi-detail">Owner of the next lifecycle action</span></article>
      <article className="ph-kpi"><span className="ph-kpi-label"><i/>Updated</span><strong className="ph-kpi-value" style={{ fontSize: 16 }}>{workflow.updatedAt?.slice(0, 10) || '—'}</strong><span className="ph-kpi-detail">Browser-local demo timestamp</span></article>
    </section>
    <div className="ph-grid cols-3">
      <Card title="1. Indicative terms"><Status tone={tone(0)}>{label(0)}</Status><p className="ph-subtitle">Structuring, diligence and investor review establish the commercial basis for documentation.</p></Card>
      <Card title="2. Documentation & compliance"><Status tone={tone(1)}>{label(1)}</Status><p className="ph-subtitle">Facility documentation and Admin compliance clearance must complete before funding.</p></Card>
      <Card title="3. Funding & monitoring"><Status tone={tone(2)}>{label(2)}</Status><p className="ph-subtitle">Funding moves the transaction into the Investor portfolio and monitoring lifecycle.</p></Card>
    </div>
    <WorkflowJourney applicationId="borrower" destinations={getDefaultDemoDestinations(import.meta.env)} />
  </div>;
}
