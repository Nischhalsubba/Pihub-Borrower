import React, { useState } from 'react';
import { Card, Field, PageHead, Status } from '../components/UI';
import { useBorrowerStore } from '../state/store';
import { downloadText } from '../utils/download';
import type { PrivacyRequest } from '../state/model';

const requestOptions: Array<{ type: PrivacyRequest['type']; title: string; body: string }> = [
  { type: 'access', title: 'Access my personal data', body: 'Request information about the personal data associated with your Borrower account.' },
  { type: 'export', title: 'Export my data', body: 'Request a portable export of Borrower-visible personal and organization data.' },
  { type: 'correction', title: 'Correct personal data', body: 'Ask PiHub to review personal data that cannot be corrected directly in the workspace.' },
  { type: 'restriction', title: 'Restrict processing', body: 'Request restriction of eligible processing while the request is reviewed.' },
  { type: 'deletion', title: 'Request deletion', body: 'Request deletion where legally possible. Statutory retention obligations can still apply.' }
];

export function PrivacyPage() {
  const { state, createPrivacyRequest, feature } = useBorrowerStore();
  const [active, setActive] = useState<PrivacyRequest['type'] | null>(null);
  const [note, setNote] = useState('');
  const [notice, setNotice] = useState('');
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!active) return;
    createPrivacyRequest(active, note);
    setNotice('Privacy request submitted to the Admin/Compliance workflow.');
    setActive(null); setNote('');
  };
  return <div className="route-stage narrow-stage"><PageHead eyebrow="Borrower / Privacy" title="Privacy & data rights" subtitle="Submit borrower-facing data-rights requests without pretending the browser can delete regulated records by itself."/>
    <div className="demo-banner"><strong>Production boundary:</strong><span>These controls create canonical Admin/Compliance requests. Fulfilment, identity verification, legal-retention review and the final data action belong to the production backend and compliance process.</span></div>
    {notice&&<div className="success-banner" role="status">{notice}</div>}
    <div className="privacy-grid">{requestOptions.map((item)=>{const open=state.privacyRequests.find((req)=>req.type===item.type&&['submitted','under_review'].includes(req.status));return <Card key={item.type}><div className="privacy-card"><span><strong>{item.title}</strong><p>{item.body}</p></span>{open?<Status tone="info">{open.status.replace('_',' ')}</Status>:<button className="button secondary" onClick={()=>setActive(item.type)}>Create request</button>}</div></Card>})}</div>
    <Card title="Borrower workspace export" subtitle="Create a borrower-visible structured snapshot for internal governance. Production exports are server-generated so permissions, redaction and audit rules are applied consistently."><div className="privacy-card"><span><strong>Application data package</strong><p>Includes the active application, borrower-visible documents metadata, requests, terms, activity and facility information. File binaries and internal PiHub/Investor notes are excluded.</p></span><button className="button secondary" onClick={()=>{const app=state.applications.find((item)=>item.id===state.activeApplicationId);const payload={generatedAt:new Date().toISOString(),application:app,documents:state.documents.filter((d)=>d.applicationId===state.activeApplicationId).map(({blobKey,...d})=>d),requests:state.requests.filter((r)=>r.applicationId===state.activeApplicationId),terms:state.terms.filter((t)=>t.applicationId===state.activeApplicationId),activity:state.activity.filter((a)=>a.applicationId===state.activeApplicationId),facility:state.facilities.find((f)=>f.applicationId===state.activeApplicationId)};downloadText(`${state.activeApplicationId}-borrower-export.json`,JSON.stringify(payload,null,2),'application/json');feature({type:'create_export',applicationId:state.activeApplicationId,format:'json',includedSections:['application','documents metadata','requests','terms','activity','facility']})}}>Download JSON export</button></div><div className="privacy-history">{state.advanced.exportPackages.slice(0,5).map((pkg)=><div key={pkg.id}><span><strong>{pkg.format.replace('_',' ')} export</strong><small>{new Date(pkg.createdAt).toLocaleString()} · {pkg.includedSections.join(', ')}</small></span><Status tone="success">{pkg.status}</Status></div>)}</div></Card>
    <Card title="Request history" subtitle="Borrower-visible status only. Internal compliance notes remain private."><div className="privacy-history">{state.privacyRequests.length===0?<p className="card-empty">No privacy requests submitted.</p>:state.privacyRequests.map((request)=><div key={request.id}><span><strong>{request.type.replace('_',' ')} request</strong><small>{new Date(request.createdAt).toLocaleString()}</small>{request.note&&<p>{request.note}</p>}</span><Status tone={request.status==='completed'?'success':request.status==='declined'?'danger':'info'}>{request.status.replace('_',' ')}</Status></div>)}</div></Card>
    {active&&<div className="modal-backdrop" role="presentation" onMouseDown={(e)=>{if(e.currentTarget===e.target)setActive(null)}}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="privacy-title"><div className="modal-head"><div><h2 id="privacy-title">{requestOptions.find((item)=>item.type===active)?.title}</h2><p>PiHub may need to verify identity and applicable retention requirements before completing this request.</p></div><button className="icon-button" aria-label="Close" onClick={()=>setActive(null)}>×</button></div><form onSubmit={submit}><Field label="Additional information" helper="Optional context that helps PiHub process the request."><textarea rows={5} value={note} onChange={(e)=>setNote(e.target.value)}/></Field><div className="form-actions"><button className="button primary">Submit request</button><button type="button" className="button secondary" onClick={()=>setActive(null)}>Cancel</button></div></form></div></div>}
  </div>;
}
