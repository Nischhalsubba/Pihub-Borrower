import React, { useMemo, useState } from 'react';
import { Card, Field, PageHead, Status } from '../components/UI';
import { useAutosave } from '../hooks/useAutosave';
import { usePlatformIntegration } from '../platform/PlatformIntegrationContext';
import type { ApprovalGateType } from '../platform/types';
import { workflowReadiness } from '../state/advanced';
import { useBorrowerStore } from '../state/store';

const approvalLabels: Record<ApprovalGateType, string> = {
  finance: 'Finance review',
  legal: 'Legal review',
  signatory: 'Authorized signatory',
  submission: 'Final submission'
};

export function FinancingPage() {
  const { state, app, updateSection, submitApplication, completion } = useBorrowerStore();
  const { projection, setApproval, workingId, error: approvalError } = usePlatformIntegration();
  const workflow = useMemo(() => workflowReadiness(state, app.id), [state, app.id]);
  const requiredApprovals = (['finance', 'legal', 'signatory'] as ApprovalGateType[]).map((type) => projection?.approvals.find((item) => item.type === type) ?? { type, status: 'pending' as const, updatedAt: app.updatedAt });
  const approvalCount = requiredApprovals.filter((item) => item.status === 'approved').length;
  const organizationReady = projection?.submissionReady ?? false;
  const submissionReady = completion === 100 && workflow.ready && organizationReady && app.status === 'draft';
  const [draft, setDraft] = useState(app.financing);
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState<Record<string,string>>({});
  const isComplete = (value: typeof draft) => Boolean(value.purpose.trim() && value.amount > 0 && value.desiredFundingDate && value.structure.trim() && value.useOfProceeds.trim());
  useAutosave(draft, (value) => updateSection('financing', value, isComplete(value)), 1400);
  const validate = () => {
    const next: Record<string,string> = {};
    if (!draft.purpose.trim()) next.purpose = 'Describe the financing purpose.';
    if (draft.amount <= 0) next.amount = 'Enter the financing amount you want PiHub to assess.';
    if (!draft.desiredFundingDate) next.desiredFundingDate = 'Choose a target funding date.';
    if (!draft.structure.trim()) next.structure = 'Choose or describe a financing structure.';
    if (!draft.useOfProceeds.trim()) next.useOfProceeds = 'Explain how the financing will be used.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };
  const save = (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) return;
    updateSection('financing', draft, true);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return <div className="route-stage narrow-stage"><PageHead eyebrow="Borrower / Application" title="Financing request" subtitle="Define the financing requirement PiHub should assess and structure." />
    <Card title={workflow.profile.label} subtitle={workflow.profile.explanation}><div className="workflow-readiness-strip"><Status tone={workflow.ready ? 'success' : 'warning'}>{workflow.ready ? 'Product requirements complete' : `${workflow.percentage}% product ready`}</Status><span>{workflow.ready ? 'This structure has the information needed for submission.' : workflow.blockers[0]}</span></div></Card>
    <Card title="Organization approvals" subtitle="Finance, legal and an authorized signatory approve the same canonical application before final submission. The backend enforces the caller's organization role."><div className="approval-list">{requiredApprovals.map((approval) => <div className="approval-row" key={approval.type}><span className="approval-copy"><strong>{approvalLabels[approval.type]}</strong><small>{approval.status === 'approved' ? `Approved${approval.decidedAt ? ` · ${new Date(approval.decidedAt).toLocaleDateString()}` : ''}` : approval.status === 'rejected' ? 'Rejected. Review is required before submission.' : 'Approval required before submission.'}</small></span><span className="approval-actions"><Status tone={approval.status === 'approved' ? 'success' : approval.status === 'rejected' ? 'danger' : 'warning'}>{approval.status}</Status>{app.status === 'draft' && approval.status !== 'approved' && <button className="button secondary" type="button" disabled={workingId === `approval:${approval.type}`} onClick={() => void setApproval(approval.type, 'approved').catch(() => undefined)}>{workingId === `approval:${approval.type}` ? 'Updating…' : 'Approve'}</button>}</span></div>)}</div><div className="workflow-readiness-strip"><Status tone={organizationReady ? 'success' : 'warning'}>{approvalCount}/3 approved</Status><span>{organizationReady ? 'Organization approval gates are complete.' : 'Complete all three approval gates before submission.'}</span></div>{approvalError && <div className="platform-warning" role="alert">{approvalError}</div>}</Card>
    <form className="form-card" onSubmit={save} noValidate>
      <div className="form-grid two"><Field label="Financing purpose" error={errors.purpose}><input value={draft.purpose} onChange={(event)=>setDraft({...draft,purpose:event.target.value})} onBlur={validate}/></Field><Field label="Requested amount (€)" error={errors.amount}><input type="number" min="0" value={draft.amount || ''} onChange={(event)=>setDraft({...draft,amount:Number(event.target.value)})}/></Field></div>
      <div className="form-grid three"><Field label="Currency"><select value={draft.currency} onChange={(event)=>setDraft({...draft,currency:event.target.value as typeof draft.currency})}><option>EUR</option><option>USD</option><option>GBP</option></select></Field><Field label="Desired funding date" error={errors.desiredFundingDate}><input type="date" value={draft.desiredFundingDate} onChange={(event)=>setDraft({...draft,desiredFundingDate:event.target.value})}/></Field><Field label="Tenor (months)"><input type="number" min="1" value={draft.tenorMonths} onChange={(event)=>setDraft({...draft,tenorMonths:Number(event.target.value)})}/></Field></div>
      <Field label="Preferred financing structure" error={errors.structure}><input value={draft.structure} onChange={(event)=>setDraft({...draft,structure:event.target.value})}/></Field>
      <Field label="Use of proceeds" error={errors.useOfProceeds}><textarea rows={4} value={draft.useOfProceeds} onChange={(event)=>setDraft({...draft,useOfProceeds:event.target.value})}/></Field>
      <div className="form-grid two"><Field label="Sponsor equity (€)" helper="Amount of sponsor capital committed or already invested."><input type="number" min="0" value={draft.sponsorEquity || ''} onChange={(event)=>setDraft({...draft,sponsorEquity:Number(event.target.value)})}/></Field><Field label="Existing debt (€)" helper="Current debt that may remain in place or be refinanced."><input type="number" min="0" value={draft.existingDebt || ''} onChange={(event)=>setDraft({...draft,existingDebt:Number(event.target.value)})}/></Field></div><Field label="Repayment profile / source" helper="Describe the expected repayment event or cash-flow source."><textarea rows={3} value={draft.repaymentProfile} onChange={(event)=>setDraft({...draft,repaymentProfile:event.target.value})}/></Field>
      {saved && <div className="success-banner" role="status">Financing request saved.</div>}
      <div className="form-actions sticky-actions"><button className="button primary" type="submit">Save financing request</button><button className="button secondary" type="button" disabled={!submissionReady} onClick={submitApplication}>Submit application</button><span>{app.status !== 'draft' ? `Application is ${app.status.replaceAll('_',' ')}.` : completion < 100 ? `Complete all core sections before submission (${completion}%).` : !workflow.ready ? workflow.blockers[0] : !organizationReady ? `Organization approvals required (${approvalCount}/3 complete).` : 'Ready to submit.'}</span></div>
    </form>
  </div>;
}
