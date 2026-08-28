import React, { useMemo, useState } from 'react';
import { Card, Field, PageHead, Status } from '../components/UI';
import { useBorrowerStore } from '../state/store';
import { useAutosave } from '../hooks/useAutosave';
import { workflowReadiness } from '../state/advanced';

export function FinancingPage() {
  const { state, app, updateSection, submitApplication, completion } = useBorrowerStore();
  const workflow = useMemo(() => workflowReadiness(state, app.id), [state, app.id]);
  const submissionReady = completion === 100 && workflow.ready && app.status === 'draft';
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
    setErrors(next); return Object.keys(next).length === 0;
  };
  const save = (e: React.FormEvent) => { e.preventDefault(); if (!validate()) return; updateSection('financing', draft, true); setSaved(true); setTimeout(() => setSaved(false), 2500); };
  return <div className="route-stage narrow-stage"><PageHead eyebrow="Borrower / Application" title="Financing request" subtitle="Define the financing requirement PiHub should assess and structure." />
    <Card title={workflow.profile.label} subtitle={workflow.profile.explanation}><div className="workflow-readiness-strip"><Status tone={workflow.ready ? 'success' : 'warning'}>{workflow.ready ? 'Product requirements complete' : `${workflow.percentage}% product ready`}</Status><span>{workflow.ready ? 'This structure has the information needed for submission.' : workflow.blockers[0]}</span></div></Card>
    <form className="form-card" onSubmit={save} noValidate>
      <div className="form-grid two"><Field label="Financing purpose" error={errors.purpose}><input value={draft.purpose} onChange={(e)=>setDraft({...draft,purpose:e.target.value})} onBlur={validate}/></Field><Field label="Requested amount (€)" error={errors.amount}><input type="number" min="0" value={draft.amount || ''} onChange={(e)=>setDraft({...draft,amount:Number(e.target.value)})}/></Field></div>
      <div className="form-grid three"><Field label="Currency"><select value={draft.currency} onChange={(e)=>setDraft({...draft,currency:e.target.value as typeof draft.currency})}><option>EUR</option><option>USD</option><option>GBP</option></select></Field><Field label="Desired funding date" error={errors.desiredFundingDate}><input type="date" value={draft.desiredFundingDate} onChange={(e)=>setDraft({...draft,desiredFundingDate:e.target.value})}/></Field><Field label="Tenor (months)"><input type="number" min="1" value={draft.tenorMonths} onChange={(e)=>setDraft({...draft,tenorMonths:Number(e.target.value)})}/></Field></div>
      <Field label="Preferred financing structure" error={errors.structure}><input value={draft.structure} onChange={(e)=>setDraft({...draft,structure:e.target.value})}/></Field>
      <Field label="Use of proceeds" error={errors.useOfProceeds}><textarea rows={4} value={draft.useOfProceeds} onChange={(e)=>setDraft({...draft,useOfProceeds:e.target.value})}/></Field>
      <div className="form-grid two"><Field label="Sponsor equity (€)" helper="Amount of sponsor capital committed or already invested."><input type="number" min="0" value={draft.sponsorEquity || ''} onChange={(e)=>setDraft({...draft,sponsorEquity:Number(e.target.value)})}/></Field><Field label="Existing debt (€)" helper="Current debt that may remain in place or be refinanced."><input type="number" min="0" value={draft.existingDebt || ''} onChange={(e)=>setDraft({...draft,existingDebt:Number(e.target.value)})}/></Field></div><Field label="Repayment profile / source" helper="Describe the expected repayment event or cash-flow source."><textarea rows={3} value={draft.repaymentProfile} onChange={(e)=>setDraft({...draft,repaymentProfile:e.target.value})}/></Field>
      {saved && <div className="success-banner" role="status">Financing request saved.</div>}
      <div className="form-actions sticky-actions"><button className="button primary" type="submit">Save financing request</button><button className="button secondary" type="button" disabled={!submissionReady} onClick={submitApplication}>Submit application</button><span>{app.status !== 'draft' ? `Application is ${app.status.replaceAll('_',' ')}.` : completion < 100 ? `Complete all core sections before submission (${completion}%).` : !workflow.ready ? workflow.blockers[0] : 'Ready to submit.'}</span></div>
    </form>
  </div>;
}
