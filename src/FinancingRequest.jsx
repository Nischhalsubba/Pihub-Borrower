import React, { useState } from 'react';
import { useLocation } from 'react-router-dom-v6';
import { DEMO_DEAL, euro } from '../packages/domain/src/demo-data';
import { getDefaultDemoDestinations, readDemoWorkflow } from '../packages/platform/src/demo-workflow-store';
import { getDemoWorkflowState } from '../packages/platform/src/demo-workflow';
import { Card, Field, PageHead, Status } from '../packages/ui/src/Primitives';
import WorkflowJourney from '../packages/ui/src/WorkflowJourney';
import { readLocal, writeLocal } from './local-state';

const financingSeed = {
  amount: String(DEMO_DEAL.requestedAmount),
  purpose: 'Construction and stabilization of the Berlin multifamily development',
  timing: 'Q4 2026',
  structure: DEMO_DEAL.structure,
  notes: 'Senior facility with staged drawdowns tied to construction milestones.',
};

export default function FinancingRequest() {
  const location = useLocation();
  const [form, setForm] = useState(() => readLocal('financing', financingSeed));
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState({});
  const application = readLocal('application', { id: DEMO_DEAL.id, status: 'Draft', company: DEMO_DEAL.borrower, project: DEMO_DEAL.name });
  const workflow = readDemoWorkflow();
  const workflowState = getDemoWorkflowState(workflow.state);
  const created = new URLSearchParams(location.search).get('created') === '1';

  const update = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }));
  const save = event => {
    event.preventDefault();
    const nextErrors = {};
    ['amount', 'purpose', 'timing', 'structure'].forEach(key => {
      if (!String(form[key] || '').trim()) nextErrors[key] = 'Required';
    });
    const amount = Number(form.amount);
    if (!nextErrors.amount && (!Number.isFinite(amount) || amount <= 0)) nextErrors.amount = 'Enter a valid amount greater than zero';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    writeLocal('financing', { ...form, amount: String(amount) });
    writeLocal('application', { ...application, status: workflow.state === 'borrower_draft' ? 'Draft' : workflowState?.label || application.status, updatedAt: new Date().toISOString() });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  return <div className="ph-page-shell">
    <PageHead eyebrow="Borrower / Application" title="Financing request" subtitle="Keep the financing need, purpose and timing clear. Saving preserves the borrower draft; submitting the canonical workflow moves the same deal to Advisory." />
    {created ? <div className="ph-callout" role="status">Application created. Complete or review the financing details below, save the draft, then submit the deal from the lifecycle panel.</div> : null}
    <div className="ph-workspace-split">
      <form className="ph-card ph-stack" onSubmit={save} noValidate>
        <div>
          <h2 style={{ marginBottom: 4 }}>Financing terms</h2>
          <p className="ph-section-note">The requested terms remain editable until the Borrower submits the application into PiHub review.</p>
        </div>
        <div className="ph-form-grid">
          <Field label="Requested amount (EUR)" error={errors.amount}><input name="amount" inputMode="decimal" value={form.amount} onChange={update}/></Field>
          <Field label="Preferred structure" error={errors.structure}><select name="structure" value={form.structure} onChange={update}><option>Senior Development Facility</option><option>Bridge Loan</option><option>Whole Loan</option><option>Mezzanine</option></select></Field>
          <Field label="Target funding timing" error={errors.timing}><input name="timing" value={form.timing} onChange={update}/></Field>
          <Field label="Financing purpose" error={errors.purpose}><input name="purpose" value={form.purpose} onChange={update}/></Field>
        </div>
        <Field label="Additional context"><textarea name="notes" value={form.notes} onChange={update}/></Field>
        <div className="ph-form-actions"><button className="ph-button primary" type="submit">Save financing request</button>{saved ? <Status tone="good">Saved locally</Status> : <span className="ph-section-note">Saving does not submit the application.</span>}</div>
      </form>
      <aside className="ph-sticky-rail" aria-label="Financing request context">
        <Card title="Application"><dl className="ph-kv"><dt>Reference</dt><dd>{application.id || DEMO_DEAL.id}</dd><dt>Company</dt><dd>{application.company || DEMO_DEAL.borrower}</dd><dt>Project</dt><dd>{application.project || DEMO_DEAL.name}</dd><dt>Requested</dt><dd>{euro(Number(form.amount) || 0)}</dd></dl></Card>
        <Card title="Workflow ownership"><div className="ph-stack"><Status tone={workflow.state === 'borrower_draft' ? 'warn' : 'good'}>{workflowState?.label || workflow.state}</Status><p className="ph-section-note">{workflow.state === 'borrower_draft' ? 'Borrower owns this draft. Submit it below when the application is ready for Advisory structuring.' : `Current lifecycle owner: ${workflowState?.owner || 'Complete'}.`}</p></div></Card>
        <Card title="Before submission"><ul className="ph-list"><li><span>Financing terms</span><Status tone="good">Captured</Status></li><li><span>Company & project</span><Status>Review</Status></li><li><span>Financials & documents</span><Status>Complete as required</Status></li></ul></Card>
      </aside>
    </div>
    <WorkflowJourney applicationId="borrower" destinations={getDefaultDemoDestinations(import.meta.env)} />
  </div>;
}
