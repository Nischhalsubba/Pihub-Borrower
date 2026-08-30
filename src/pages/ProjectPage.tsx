import React, { useMemo, useState } from 'react';
import { Field, PageHead } from '../components/UI';
import { FormWorkflowSummary, StickyFormActions, useFormDirty } from '../components/FormWorkflow';
import { useBorrowerStore } from '../state/store';
import { useAutosave } from '../hooks/useAutosave';

export function ProjectPage() {
  const { app, updateSection } = useBorrowerStore();
  const [draft, setDraft] = useState(app.project);
  const [message, setMessage] = useState('');
  const issues = useMemo(() => [
    ['project-name','Project name',draft.name.trim()],['project-location','Location',draft.location.trim()],['project-asset-class','Asset class',draft.assetClass.trim()],['project-stage','Development stage',draft.stage.trim()],['project-planning','Planning / permitting status',draft.planningStatus.trim()],['project-exit','Exit / repayment strategy',draft.exitStrategy.trim()]
  ].filter(([, , value]) => !value).map(([id,label]) => ({ id, label })), [draft]);
  const completion = Math.round(((6 - issues.length) / 6) * 100);
  const isComplete = (value: typeof draft) => Boolean(value.name.trim() && value.location.trim() && value.assetClass.trim() && value.stage.trim() && value.planningStatus.trim() && value.exitStrategy.trim());
  useAutosave(draft, (value) => updateSection('project', value, isComplete(value)), 1400);
  const dirty = useFormDirty(app.project, draft);
  const save = (e: React.FormEvent) => { e.preventDefault(); const complete=isComplete(draft); updateSection('project',draft,complete); setMessage(complete?'Project information saved.':'Draft saved. Required project fields remain incomplete.'); };
  return <div className="route-stage narrow-stage"><PageHead eyebrow="Borrower / Application" title="Project / Property" subtitle="Describe the asset, development stage, project economics and repayment path." />
    <form className="form-card" onSubmit={save} noValidate>
      <FormWorkflowSummary completion={completion} issues={issues} dirty={dirty} message={message}/>
      <div className="form-grid two"><Field label="Project name"><input id="project-name" required value={draft.name} onChange={(e)=>setDraft({...draft,name:e.target.value})}/></Field><Field label="Location"><input id="project-location" required value={draft.location} onChange={(e)=>setDraft({...draft,location:e.target.value})}/></Field></div>
      <div className="form-grid two"><Field label="Asset class"><input id="project-asset-class" required value={draft.assetClass} onChange={(e)=>setDraft({...draft,assetClass:e.target.value})}/></Field><Field label="Development stage"><select id="project-stage" value={draft.stage} onChange={(e)=>setDraft({...draft,stage:e.target.value})}><option>Planning</option><option>Acquisition</option><option>Construction</option><option>Stabilization</option><option>Operating</option></select></Field></div>
      <div className="form-grid three"><Field label="Acquisition price (€)"><input type="number" value={draft.acquisitionPrice || ''} onChange={(e)=>setDraft({...draft,acquisitionPrice:Number(e.target.value)})}/></Field><Field label="Construction budget (€)"><input type="number" value={draft.constructionBudget || ''} onChange={(e)=>setDraft({...draft,constructionBudget:Number(e.target.value)})}/></Field><Field label="Gross development value (€)"><input type="number" value={draft.grossDevelopmentValue || ''} onChange={(e)=>setDraft({...draft,grossDevelopmentValue:Number(e.target.value)})}/></Field></div>
      <div className="form-grid two"><Field label="Expected completion"><input type="date" value={draft.expectedCompletion} onChange={(e)=>setDraft({...draft,expectedCompletion:e.target.value})}/></Field><Field label="Current valuation (€)"><input type="number" min="0" value={draft.valuation || ''} onChange={(e)=>setDraft({...draft,valuation:Number(e.target.value)})}/></Field></div>
      <Field label="Planning / permitting status"><textarea id="project-planning" required rows={3} value={draft.planningStatus} onChange={(e)=>setDraft({...draft,planningStatus:e.target.value})}/></Field><Field label="Pre-sales / pre-leasing"><textarea rows={3} value={draft.preSalesOrLeasing} onChange={(e)=>setDraft({...draft,preSalesOrLeasing:e.target.value})}/></Field><Field label="Exit / repayment strategy"><textarea id="project-exit" required rows={4} value={draft.exitStrategy} onChange={(e)=>setDraft({...draft,exitStrategy:e.target.value})}/></Field><Field label="Sustainability / ESG information"><textarea rows={3} value={draft.sustainability} onChange={(e)=>setDraft({...draft,sustainability:e.target.value})}/></Field>
      <StickyFormActions dirty={dirty}><button className="button primary" type="submit">Save project information</button></StickyFormActions>
    </form>
  </div>;
}
