import React, { useMemo, useState } from 'react';
import { Field, PageHead, euro } from '../components/UI';
import { FormWorkflowSummary, StickyFormActions, useFormDirty } from '../components/FormWorkflow';
import { useBorrowerStore } from '../state/store';
import { useAutosave } from '../hooks/useAutosave';

export function FinancialsPage() {
  const { app, updateSection } = useBorrowerStore();
  const [draft, setDraft] = useState(app.financials);
  const [message, setMessage] = useState('');
  const netDebt = useMemo(() => draft.debt - draft.cash, [draft.debt, draft.cash]);
  const leverage = draft.ebitda2025 > 0 ? netDebt / draft.ebitda2025 : 0;
  const issues = useMemo(() => [
    ['financials-revenue-2025','Latest revenue',draft.revenue2025 > 0],['financials-ebitda-2025','Latest EBITDA',draft.ebitda2025 !== 0],['financials-equity','Equity',draft.equity > 0]
  ].filter(([, , complete]) => !complete).map(([id,label]) => ({ id: String(id), label: String(label) })), [draft]);
  const completion = Math.round(((3 - issues.length) / 3) * 100);
  const isComplete = (value: typeof draft) => value.revenue2025 > 0 && value.ebitda2025 !== 0 && value.equity > 0;
  useAutosave(draft, (value) => updateSection('financials', value, isComplete(value)), 1400);
  const dirty = useFormDirty(app.financials, draft);
  const save = (e: React.FormEvent) => { e.preventDefault(); const complete=isComplete(draft); updateSection('financials',draft,complete); setMessage(complete?'Financial information saved.':'Draft saved. Add the latest revenue, EBITDA and equity information.'); };
  return <div className="route-stage narrow-stage"><PageHead eyebrow="Borrower / Application" title="Financials" subtitle="Historical and current financial information used to assess financing capacity and structure." />
    <form className="form-card" onSubmit={save} noValidate>
      <FormWorkflowSummary completion={completion} issues={issues} dirty={dirty} message={message}/>
      <div className="section-title"><h2>Historical performance</h2><p>Enter values in EUR.</p></div>
      <div className="form-grid two"><Field label="2024 revenue"><input type="number" value={draft.revenue2024 || ''} onChange={(e)=>setDraft({...draft,revenue2024:Number(e.target.value)})}/></Field><Field label="2025 revenue"><input id="financials-revenue-2025" type="number" required value={draft.revenue2025 || ''} onChange={(e)=>setDraft({...draft,revenue2025:Number(e.target.value)})}/></Field><Field label="2024 EBITDA"><input type="number" value={draft.ebitda2024 || ''} onChange={(e)=>setDraft({...draft,ebitda2024:Number(e.target.value)})}/></Field><Field label="2025 EBITDA"><input id="financials-ebitda-2025" type="number" required value={draft.ebitda2025 || ''} onChange={(e)=>setDraft({...draft,ebitda2025:Number(e.target.value)})}/></Field></div>
      <div className="section-title"><h2>Capital structure</h2><p>Current balance sheet view.</p></div><div className="form-grid three"><Field label="Cash"><input type="number" value={draft.cash || ''} onChange={(e)=>setDraft({...draft,cash:Number(e.target.value)})}/></Field><Field label="Debt"><input type="number" value={draft.debt || ''} onChange={(e)=>setDraft({...draft,debt:Number(e.target.value)})}/></Field><Field label="Equity"><input id="financials-equity" type="number" required value={draft.equity || ''} onChange={(e)=>setDraft({...draft,equity:Number(e.target.value)})}/></Field></div>
      <div className="derived-grid"><div><span>Net debt</span><strong>{euro(netDebt)}</strong></div><div><span>Net debt / EBITDA</span><strong>{leverage.toFixed(2)}x</strong></div></div>
      <Field label="Forecast assumptions"><textarea rows={4} value={draft.forecastNote} onChange={(e)=>setDraft({...draft,forecastNote:e.target.value})}/></Field>
      <StickyFormActions dirty={dirty}><button className="button primary" type="submit">Save financials</button></StickyFormActions>
    </form>
  </div>;
}
