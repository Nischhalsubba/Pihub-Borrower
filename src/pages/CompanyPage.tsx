import React, { useMemo, useState } from 'react';
import { Field, PageHead } from '../components/UI';
import { FormWorkflowSummary, StickyFormActions, useFormDirty } from '../components/FormWorkflow';
import { useBorrowerStore } from '../state/store';
import { useAutosave } from '../hooks/useAutosave';

export function CompanyPage() {
  const { app, updateSection } = useBorrowerStore();
  const [draft, setDraft] = useState(app.company);
  const [message, setMessage] = useState('');
  const issues = useMemo(() => [
    ['company-legal-name','Legal name',draft.legalName.trim()],['company-registration','Registration number',draft.registrationNumber.trim()],['company-industry','Industry',draft.industry.trim()],['company-description','Business description',draft.description.trim()],['company-ownership','Ownership summary',draft.ownershipSummary.trim()],['company-ubos','Ultimate beneficial owners',draft.uboNames.trim()]
  ].filter(([, , value]) => !value).map(([id,label]) => ({ id, label })), [draft]);
  const completion = Math.round(((6 - issues.length) / 6) * 100);
  const isComplete = (value: typeof draft) => Boolean(value.legalName.trim() && value.registrationNumber.trim() && value.industry.trim() && value.description.trim() && value.ownershipSummary.trim() && value.uboNames.trim());
  useAutosave(draft, (value) => updateSection('company', value, isComplete(value)), 1400);
  const dirty = useFormDirty(app.company, draft);
  const save = (e: React.FormEvent) => { e.preventDefault(); const complete=isComplete(draft); updateSection('company',draft,complete); setMessage(complete?'Company information saved.':'Draft saved. Complete the required company fields before submission.'); };
  return <div className="route-stage narrow-stage"><PageHead eyebrow="Borrower / Organization" title="Company information" subtitle="Corporate identity, ownership context and operating profile used for origination and due diligence." />
    <form className="form-card" onSubmit={save} noValidate>
      <FormWorkflowSummary completion={completion} issues={issues} dirty={dirty} message={message}/>
      <div className="form-grid two"><Field label="Legal name"><input id="company-legal-name" required value={draft.legalName} onChange={(e)=>setDraft({...draft,legalName:e.target.value})}/></Field><Field label="Registration number"><input id="company-registration" required value={draft.registrationNumber} onChange={(e)=>setDraft({...draft,registrationNumber:e.target.value})}/></Field></div>
      <div className="form-grid three"><Field label="Legal form"><input value={draft.legalForm} onChange={(e)=>setDraft({...draft,legalForm:e.target.value})}/></Field><Field label="Country"><input value={draft.country} onChange={(e)=>setDraft({...draft,country:e.target.value})}/></Field><Field label="City"><input value={draft.city} onChange={(e)=>setDraft({...draft,city:e.target.value})}/></Field></div>
      <div className="form-grid two"><Field label="Industry"><input id="company-industry" required value={draft.industry} onChange={(e)=>setDraft({...draft,industry:e.target.value})}/></Field><Field label="Website"><input type="url" value={draft.website} onChange={(e)=>setDraft({...draft,website:e.target.value})}/></Field></div>
      <Field label="Business description"><textarea id="company-description" required rows={5} value={draft.description} onChange={(e)=>setDraft({...draft,description:e.target.value})}/></Field>
      <div className="section-title"><h2>Ownership & banking context</h2><p>Borrower-provided information. PiHub Compliance remains responsible for verification.</p></div>
      <Field label="Ownership summary"><textarea id="company-ownership" required rows={3} value={draft.ownershipSummary} onChange={(e)=>setDraft({...draft,ownershipSummary:e.target.value})}/></Field>
      <Field label="Ultimate beneficial owners (UBOs)" helper="List names and ownership percentages where known."><textarea id="company-ubos" required rows={3} value={draft.uboNames} onChange={(e)=>setDraft({...draft,uboNames:e.target.value})}/></Field>
      <Field label="Existing banking / lending relationships"><textarea rows={3} value={draft.bankingRelationships} onChange={(e)=>setDraft({...draft,bankingRelationships:e.target.value})}/></Field>
      <div className="form-grid three"><Field label="Latest revenue (€)"><input type="number" value={draft.revenue || ''} onChange={(e)=>setDraft({...draft,revenue:Number(e.target.value)})}/></Field><Field label="Latest EBITDA (€)"><input type="number" value={draft.ebitda || ''} onChange={(e)=>setDraft({...draft,ebitda:Number(e.target.value)})}/></Field><Field label="Employees"><input type="number" value={draft.employees || ''} onChange={(e)=>setDraft({...draft,employees:Number(e.target.value)})}/></Field></div>
      <StickyFormActions dirty={dirty}><button className="button primary" type="submit">Save company information</button></StickyFormActions>
    </form>
  </div>;
}
