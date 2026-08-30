import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Field, PageHead, Status } from '../components/UI';
import { useBorrowerStore } from '../state/store';
import type { SupportTicket } from '../state/model';

const faq=[
  ['What happens after I submit?','PiHub reviews the financing request, may ask for additional information, and then progresses the same underlying deal into structuring and lender/investor workflows where appropriate.'],
  ['Why does PiHub request documents?','Documents support origination, due diligence, compliance and lender review. Each request should explain what is required, its due date and review status.'],
  ['Can I change a submitted application?','Production rules should version submitted records. This demo records version snapshots so prior states remain visible and a new draft can be created without overwriting history.'],
  ['What does Investor review mean?','It means the opportunity has progressed to a lender/investor evaluation stage. Borrowers see only the status and requests relevant to them, not internal underwriting notes or committee discussion.'],
  ['Where are uploaded files stored?','In this enhanced demo, uploaded file blobs persist in browser IndexedDB. Production requires secure server-side document storage, scanning, retention and access control.']
];

export function HelpPage(){
  const {state,createSupportTicket}=useBorrowerStore();
  const[q,setQ]=useState('');
  const[category,setCategory]=useState<SupportTicket['category']>('application');
  const[subject,setSubject]=useState('');
  const[message,setMessage]=useState('');
  const[notice,setNotice]=useState('');
  const visible=faq.filter(([a,b])=>`${a} ${b}`.toLowerCase().includes(q.toLowerCase()));
  const submit=(e:React.FormEvent)=>{e.preventDefault();if(!subject.trim()||!message.trim()){setNotice('Add a subject and describe what you need help with.');return;}createSupportTicket({category,subject,message});setSubject('');setMessage('');setNotice('Support request created and queued for the Admin/Platform support boundary.');};
  return <div className="route-stage"><PageHead eyebrow="Borrower / Support" title="Help & financing glossary" subtitle="Plain-language guidance, application support and a visible support-request trail without exposing unnecessary internal credit jargon."/>
    <Card className="help-tour-card" title="Guided PiHub walkthrough" subtitle="Replay the step-by-step Borrower tour at any time, including how your actions connect to Advisory, Admin/Compliance and Investor."><div className="help-tour-row"><span>Review Financing, Applications, Execution, Servicing, Organization and cross-module handoffs in one guided flow.</span><Link className="button secondary" to="/?tour=1">Open guided tour</Link></div></Card>
    <Card><label className="search-field full">Search help<input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Search applications, documents, terms..."/></label></Card>
    <div className="help-grid">{visible.map(([question,answer])=><Card key={question}><details><summary>{question}</summary><p>{answer}</p></details></Card>)}</div>
    <Card title="Glossary"><dl className="glossary"><div><dt>LTV</dt><dd>Loan-to-value: financing amount compared with asset value.</dd></div><div><dt>LTC</dt><dd>Loan-to-cost: financing amount compared with total project cost.</dd></div><div><dt>Conditions precedent</dt><dd>Requirements that must be satisfied before funding can occur.</dd></div><div><dt>Indicative terms</dt><dd>Non-binding proposed financing terms subject to approval, diligence and documentation.</dd></div></dl></Card>
    <div className="support-grid"><Card title="Contact PiHub support" subtitle="Creates a durable demo ticket and a canonical Admin-facing integration event."><form className="support-form" onSubmit={submit}><div className="form-grid two"><Field label="Category"><select value={category} onChange={(e)=>setCategory(e.target.value as SupportTicket['category'])}><option value="application">Application</option><option value="documents">Documents</option><option value="account">Account</option><option value="technical">Technical</option><option value="other">Other</option></select></Field><Field label="Subject"><input value={subject} onChange={(e)=>setSubject(e.target.value)}/></Field></div><Field label="How can PiHub help?"><textarea rows={4} value={message} onChange={(e)=>setMessage(e.target.value)}/></Field>{notice&&<div className="success-banner" role="status">{notice}</div>}<div className="form-actions"><button className="button primary">Create support request</button></div></form></Card>
      <Card title="Your support requests" subtitle="Demo ticket history for this browser.">{state.supportTickets.length===0?<p className="card-empty">No support requests yet.</p>:<div className="support-list">{state.supportTickets.map((ticket)=><div key={ticket.id}><span><strong>{ticket.subject}</strong><small>{ticket.category} · {new Date(ticket.createdAt).toLocaleString()}</small></span><Status tone={ticket.status==='open'?'info':'success'}>{ticket.status}</Status></div>)}</Card></div>
  </div>;
}
