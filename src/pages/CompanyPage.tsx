import React, { useState } from 'react';
import { Field, PageHead } from '../components/UI';
import { useBorrowerStore } from '../state/store';
import { useAutosave } from '../hooks/useAutosave';

export function CompanyPage() {
  const { app, updateSection } = useBorrowerStore();
  const [draft, setDraft] = useState(app.company);
  const [message, setMessage] = useState('');
  const isComplete = (value: typeof draft) => Boolean(value.legalName.trim() && value.registrationNumber.trim() && value.industry.trim() && value.description.trim() && value.ownershipSummary.trim() && value.uboNames.trim());
  useAutosave(draft, (value) => updateSection('company', value, isComplete(value)), 1400);
  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const complete = Boolean(draft.legalName.trim() && draft.registrationNumber.trim() && draft.industry.trim() && draft.description.trim() && draft.ownershipSummary.trim() && draft.uboNames.trim());
    updateSection('company', draft, complete);
    setMessage(complete ? 'Company information saved.' : 'Draft saved. Complete the required company fields before submission.');
  };
  return <div className="route-stage narrow-stage"><PageHead eyebrow="Borrower / Organization" title="Company information" subtitle="Corporate identity, ownership context and operating profile used for origination and due diligence." />
    <form className="form-card" onSubmit={save}>
      <div className="form-grid two"><Field label="Legal name"><input required value={draft.legalName} onChange={(e)=>setDraft({...draft,legalName:e.target.value})}/></Field><Field label="Registration number"><input required value={draft.registrationNumber} onChange={(e)=>setDraft({...draft,registrationNumber:e.target.value})}/></Field></div>
      <div className="form-grid three"><Field label="Legal form"><input value={draft.legalForm} onChange={(e)=>setDraft({...draft,legalForm:e.target.value})}/></Field><Field label="Country"><input value={draft.country} onChange={(e)=>setDraft({...draft,country:e.target.value})}/></Field><Field label="City"><input value={draft.city} onChange={(e)=>setDraft({...draft,city:e.target.value})}/></Field></div>
      <div className="form-grid two"><Field label="Industry"><input required value={draft.industry} onChange={(e)=>setDraft({...draft,industry:e.target.value})}/></Field><Field label="Website"><input type="url" value={draft.website} onChange={(e)=>setDraft({...draft,website:e.target.value})}/></Field></div>
      <Field label="Business description"><textarea required rows={5} value={draft.description} onChange={(e)=>setDraft({...draft,description:e.target.value})}/></Field>
      <div className="section-title"><h2>Ownership & banking context</h2><p>Borrower-provided information. PiHub Compliance remains responsible for verification.</p></div>
      <Field label="Ownership summary"><textarea required rows={3} value={draft.ownershipSummary} onChange={(e)=>setDraft({...draft,ownershipSummary:e.target.value})}/></Field>
      <Field label="Ultimate beneficial owners (UBOs)" helper="List names and ownership percentages where known."><textarea required rows={3} value={draft.uboNames} onChange={(e)=>setDraft({...draft,uboNames:e.target.value})}/></Field>
      <Field label="Existing banking / lending relationships"><textarea rows={3} value={draft.bankingRelationships} onChange={(e)=>setDraft({...draft,bankingRelationships:e.target.value})}/></Field>
      <div className="form-grid three"><Field label="Latest revenue (€)"><input type="number" value={draft.revenue || ''} onChange={(e)=>setDraft({...draft,revenue:Number(e.target.value)})}/></Field><Field label="Latest EBITDA (€)"><input type="number" value={draft.ebitda || ''} onChange={(e)=>setDraft({...draft,ebitda:Number(e.target.value)})}/></Field><Field label="Employees"><input type="number" value={draft.employees || ''} onChange={(e)=>setDraft({...draft,employees:Number(e.target.value)})}/></Field></div>
      {message && <div className="success-banner" role="status">{message}</div>}<div className="form-actions"><button className="button primary" type="submit">Save company information</button></div>
    </form>
  </div>;
}
