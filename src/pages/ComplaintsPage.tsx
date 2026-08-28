import React, { useState } from 'react';
import { Card, EmptyState, Field, PageHead, Status } from '../components/UI';
import { useBorrowerStore } from '../state/store';
import type { ComplaintCase } from '../state/advancedModel';

const tone=(s:string)=>s==='resolved'||s==='closed'?'success':s==='under_review'?'info':'warning';
export function ComplaintsPage(){
  const {state,app,feature}=useBorrowerStore();
  const facility=state.facilities.find((f)=>f.applicationId===app.id);
  const [category,setCategory]=useState<ComplaintCase['category']>('service'); const [subject,setSubject]=useState(''); const [description,setDescription]=useState(''); const [notice,setNotice]=useState('');
  const submit=(e:React.FormEvent)=>{e.preventDefault();if(!subject.trim()||!description.trim())return;feature({type:'create_complaint',complaint:{applicationId:app.id,facilityId:facility?.id,category,subject:subject.trim(),description:description.trim()}});setSubject('');setDescription('');setNotice('Complaint submitted. A reference has been created and the correspondence remains in your workspace history.');};
  return <div className="route-stage"><PageHead eyebrow="Borrower / Support" title="Complaints & disputes" subtitle="Raise a formal issue about payments, documents, service, decisions or privacy with a durable reference and status trail."/>
    <div className="demo-banner"><strong>Governance boundary:</strong><span>This creates the Borrower-side case. Production acknowledgement, response deadlines, staff assignment and regulatory correspondence must be server-authoritative.</span></div>
    {notice&&<div className="success-banner" role="status">{notice}</div>}
    <div className="complaint-layout"><Card title="Submit a complaint" subtitle={`Linked to ${app.id}${facility?` · ${facility.id}`:''}`}><form onSubmit={submit}><Field label="Category"><select value={category} onChange={(e)=>setCategory(e.target.value as ComplaintCase['category'])}><option value="payment">Payment</option><option value="document">Document</option><option value="service">Service</option><option value="decision">Decision / outcome</option><option value="privacy">Privacy</option><option value="other">Other</option></select></Field><Field label="Subject"><input value={subject} onChange={(e)=>setSubject(e.target.value)} required/></Field><Field label="Description" helper="Explain what happened, the outcome you expect and any relevant dates or references."><textarea rows={6} value={description} onChange={(e)=>setDescription(e.target.value)} required/></Field><div className="form-actions"><button className="button primary">Submit complaint</button></div></form></Card>
    <Card title="Case history" subtitle="Your submitted cases and PiHub status.">{state.advanced.complaints.length===0?<EmptyState title="No complaints" body="No formal complaint or dispute has been submitted from this workspace."/>:<div className="complaint-list">{state.advanced.complaints.map((c)=><div className="complaint-row" key={c.id}><span><strong>{c.subject}</strong><small>{c.reference??c.id} · {c.category} · {new Date(c.createdAt).toLocaleDateString()}</small><p>{c.description}</p></span><Status tone={tone(c.status) as any}>{c.status.replaceAll('_',' ')}</Status></div>)}</div>}</Card></div>
  </div>;
}
