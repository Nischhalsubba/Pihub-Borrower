import React, { useMemo, useState } from 'react';
import { Card, Field, PageHead, Status } from '../components/UI';
import { useBorrowerStore } from '../state/store';

export function ESGPage() {
  const { state, app, feature } = useBorrowerStore();
  const existing = useMemo(()=>state.advanced.esgProfiles.find((p)=>p.applicationId===app.id),[state.advanced.esgProfiles,app.id]);
  const [form,setForm]=useState(()=>({
    epcRating: existing?.epcRating ?? 'B', energyStandard: existing?.energyStandard ?? 'KfW 55', renewableSharePct: existing?.renewableSharePct ?? 35,
    operationalCo2KgSqm: existing?.operationalCo2KgSqm ?? 18, taxonomyAlignedPct: existing?.taxonomyAlignedPct ?? 60, kfwProgram: existing?.kfwProgram ?? '', certifications: existing?.certifications.join(', ') ?? ''
  }));
  const [saved,setSaved]=useState(false);
  const constructionLike=/development|construction|real estate|property/i.test(`${app.financing.structure} ${app.project.assetClass}`);
  const save=(e:React.FormEvent)=>{e.preventDefault();feature({type:'save_esg',profile:{applicationId:app.id,epcRating:form.epcRating,energyStandard:form.energyStandard,renewableSharePct:Number(form.renewableSharePct),operationalCo2KgSqm:Number(form.operationalCo2KgSqm),taxonomyAlignedPct:Number(form.taxonomyAlignedPct),kfwProgram:form.kfwProgram,certifications:form.certifications.split(',').map(s=>s.trim()).filter(Boolean)}});setSaved(true);};
  return <div className="route-stage">
    <PageHead eyebrow="Borrower / Sustainability" title="ESG & sustainability" subtitle="Capture energy, carbon and sustainability evidence when it is relevant to the financing rather than making every borrower complete ceremonial green boxes." action={<Status tone={constructionLike?'info':'neutral'}>{constructionLike?'Relevant to this deal':'Optional for this deal'}</Status>}/>
    {saved&&<div className="success-banner" role="status">Sustainability profile saved and shared with the Advisory workflow.</div>}
    <div className="esg-layout"><Card title="Sustainability profile" subtitle="Borrower-confirmed values. Supporting certificates should be uploaded to the Data Room."><form onSubmit={save} className="form-grid two">
      <Field label="EPC / energy rating"><input value={form.epcRating} onChange={(e)=>setForm({...form,epcRating:e.target.value})}/></Field>
      <Field label="Energy standard"><input value={form.energyStandard} onChange={(e)=>setForm({...form,energyStandard:e.target.value})} placeholder="e.g. KfW 55"/></Field>
      <Field label="Renewable energy share (%)"><input type="number" min="0" max="100" value={form.renewableSharePct} onChange={(e)=>setForm({...form,renewableSharePct:Number(e.target.value)})}/></Field>
      <Field label="Operational CO₂ (kg/m²/year)"><input type="number" min="0" step="0.1" value={form.operationalCo2KgSqm} onChange={(e)=>setForm({...form,operationalCo2KgSqm:Number(e.target.value)})}/></Field>
      <Field label="EU taxonomy aligned (%)"><input type="number" min="0" max="100" value={form.taxonomyAlignedPct} onChange={(e)=>setForm({...form,taxonomyAlignedPct:Number(e.target.value)})}/></Field>
      <Field label="KfW programme"><input value={form.kfwProgram} onChange={(e)=>setForm({...form,kfwProgram:e.target.value})} placeholder="Programme / reference if applicable"/></Field>
      <Field label="Certifications" helper="Comma separated, for example DGNB Gold, BREEAM Excellent"><input value={form.certifications} onChange={(e)=>setForm({...form,certifications:e.target.value})}/></Field>
      <div className="form-actions full"><button className="button primary">Save sustainability profile</button></div>
    </form></Card>
    <Card title="Why PiHub asks" subtitle="Use sustainability data only where it affects financing, eligibility, reporting or investor disclosure."><div className="explain-list"><div><strong>Financing fit</strong><p>Some infrastructure and real-estate capital providers have sustainability mandates or KfW-linked requirements.</p></div><div><strong>Evidence, not marketing</strong><p>Borrower-entered metrics remain distinguishable from verified certificates and third-party reports.</p></div><div><strong>Ongoing reporting</strong><p>Funded facilities can convert relevant ESG commitments into periodic reporting obligations.</p></div></div></Card></div>
  </div>;
}
