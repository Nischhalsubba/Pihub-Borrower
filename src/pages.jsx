import React, { useMemo, useState } from 'react';
import { DEMO_DEAL, DEMO_DOCUMENTS, DEMO_REQUESTS, euro } from '../packages/domain/src/demo-data';
import { readLocal, writeLocal } from './local-state';
import { Card, Field, Metric, PageHead, Status } from './ui';

const financingSeed = {
  amount: String(DEMO_DEAL.requestedAmount),
  purpose: 'Construction and stabilization of the Berlin multifamily development',
  timing: 'Q4 2026',
  structure: DEMO_DEAL.structure,
  notes: 'Senior facility with staged drawdowns tied to construction milestones.'
};

export const Overview = () => {
  const requests = readLocal('requests', DEMO_REQUESTS);
  const open = requests.filter(item => item.status !== 'Complete').length;
  return <>
    <PageHead eyebrow="Borrower / Overview" title="Your financing request" subtitle="See what PiHub has, what is still needed and what happens next." action={<a className="ph-button primary" href="/financing">Continue application</a>} />
    <div className="ph-demo">Demo data only. This browser-local workspace demonstrates the intended Borrower experience until production APIs and secure shared sessions are connected.</div>
    <div className="ph-grid cols-4"><Metric value={`${DEMO_DEAL.progress}%`} label="Application complete"/><Metric value={open} label="Open PiHub requests"/><Metric value={DEMO_DOCUMENTS.filter(d=>d.status==='Accepted').length} label="Documents accepted"/><Metric value={euro(DEMO_DEAL.requestedAmount)} label="Requested financing"/></div>
    <div className="ph-grid cols-2" style={{marginTop:16}}>
      <Card title="Current status"><div className="ph-stack"><Status tone="warn">Under review</Status><div className="ph-progress" aria-label={`${DEMO_DEAL.progress}% complete`}><span style={{'--progress':`${DEMO_DEAL.progress}%`}} /></div><p className="ph-subtitle">PiHub is reviewing the financing structure and remaining borrower information. Your next priority is the FY2025 audited financial statements.</p></div></Card>
      <Card title="Deal snapshot"><dl className="ph-kv"><dt>Deal ID</dt><dd>{DEMO_DEAL.id}</dd><dt>Project</dt><dd>{DEMO_DEAL.name}</dd><dt>Structure</dt><dd>{DEMO_DEAL.structure}</dd><dt>Tenor</dt><dd>{DEMO_DEAL.tenorMonths} months</dd><dt>Current owner</dt><dd>{DEMO_DEAL.owner}</dd><dt>Next review</dt><dd>{DEMO_DEAL.nextReview}</dd></dl></Card>
    </div>
    <Card title="Outstanding requests" className="" ><ul className="ph-list">{requests.slice(0,3).map(item=><li key={item.id}><div><strong>{item.title}</strong><div className="ph-metric-label">Due {item.due}</div></div><Status tone={item.priority==='High'?'bad':'warn'}>{item.priority}</Status></li>)}</ul></Card>
  </>;
};

export const Financing = () => {
  const [form,setForm]=useState(()=>readLocal('financing',financingSeed));
  const [saved,setSaved]=useState(false);
  const update=e=>setForm({...form,[e.target.name]:e.target.value});
  const save=e=>{e.preventDefault();writeLocal('financing',form);setSaved(true);setTimeout(()=>setSaved(false),1800);};
  return <><PageHead eyebrow="Borrower / Application" title="Financing request" subtitle="Keep the financing need, purpose and timing clear. PiHub can structure the transaction from this shared deal record."/>
    <form className="ph-card ph-stack" onSubmit={save}><div className="ph-form-grid"><Field label="Requested amount (EUR)"><input name="amount" inputMode="decimal" value={form.amount} onChange={update}/></Field><Field label="Preferred structure"><select name="structure" value={form.structure} onChange={update}><option>Senior Development Facility</option><option>Bridge Loan</option><option>Whole Loan</option><option>Mezzanine</option></select></Field><Field label="Target funding timing"><input name="timing" value={form.timing} onChange={update}/></Field><Field label="Financing purpose"><input name="purpose" value={form.purpose} onChange={update}/></Field></div><Field label="Additional context"><textarea name="notes" value={form.notes} onChange={update}/></Field><div><button className="ph-button primary" type="submit">Save financing request</button>{saved ? <span className="ph-status good" style={{marginLeft:10}}>Saved locally</span>:null}</div></form>
  </>;
};

export const Company = () => {
  const seed={legalName:DEMO_DEAL.borrower,registration:'HRB 209147 B',jurisdiction:'Germany',website:'https://example.invalid',employees:'24',business:'Residential development and asset management'};
  const [form,setForm]=useState(()=>readLocal('company',seed)); const [saved,setSaved]=useState(false); const update=e=>setForm({...form,[e.target.name]:e.target.value});
  return <><PageHead eyebrow="Borrower / Organization" title="Company information" subtitle="Keep the legal entity and operating profile complete so the same borrower record can be used through structuring, underwriting and monitoring."/>
  <form className="ph-card ph-stack" onSubmit={e=>{e.preventDefault();writeLocal('company',form);setSaved(true)}}><div className="ph-form-grid">{Object.entries(form).map(([key,value])=><Field key={key} label={key.replace(/([A-Z])/g,' $1').replace(/^./,x=>x.toUpperCase())}><input name={key} value={value} onChange={update}/></Field>)}</div><div><button className="ph-button primary">Save company</button>{saved?<span className="ph-status good" style={{marginLeft:10}}>Saved</span>:null}</div></form></>;
};

export const Project = () => <><PageHead eyebrow="Borrower / Project" title="Project & property" subtitle="The borrower view focuses on what PiHub needs to assess the project, not on internal credit committee language."/>
<div className="ph-grid cols-3"><Metric value={DEMO_DEAL.project.units} label="Residential units"/><Metric value={`${DEMO_DEAL.project.rentableAreaSqm.toLocaleString()} m²`} label="Rentable area"/><Metric value={`${DEMO_DEAL.project.preLet}%`} label="Pre-let / reserved"/></div>
<div className="ph-grid cols-2" style={{marginTop:16}}><Card title="Project facts"><dl className="ph-kv"><dt>Location</dt><dd>{DEMO_DEAL.city}, {DEMO_DEAL.country}</dd><dt>Asset class</dt><dd>{DEMO_DEAL.assetClass}</dd><dt>Permits</dt><dd>{DEMO_DEAL.project.permits}</dd><dt>Completion</dt><dd>{DEMO_DEAL.project.completion}</dd><dt>Energy standard</dt><dd>{DEMO_DEAL.project.energyStandard}</dd></dl></Card><Card title="Funding context"><dl className="ph-kv"><dt>Project cost</dt><dd>{euro(DEMO_DEAL.financials.projectCost)}</dd><dt>Current value</dt><dd>{euro(DEMO_DEAL.financials.currentValue)}</dd><dt>Estimated GDV</dt><dd>{euro(DEMO_DEAL.financials.gdv)}</dd><dt>Sponsor equity</dt><dd>{DEMO_DEAL.sponsorEquity}%</dd></dl></Card></div></>;

export const Financials = () => <><PageHead eyebrow="Borrower / Financials" title="Financial information" subtitle="Provide the figures PiHub needs to structure and underwrite the request. Final definitions remain server-owned in production."/>
<div className="ph-grid cols-4"><Metric value={euro(DEMO_DEAL.financials.revenue)} label="Revenue"/><Metric value={euro(DEMO_DEAL.financials.ebitda)} label="EBITDA"/><Metric value={euro(DEMO_DEAL.financials.cash)} label="Cash"/><Metric value={euro(DEMO_DEAL.financials.netDebt)} label="Net debt"/></div><Card title="Sources and uses" className=""><div className="ph-callout">The production version should connect these figures to audited statements, model versions and server-owned calculation definitions. This demo does not claim accounting truth.</div></Card></>;

export const Documents = () => {
  const [docs,setDocs]=useState(()=>readLocal('documents',DEMO_DOCUMENTS));
  const upload=id=>{const next=docs.map(d=>d.id===id?{...d,status:'Uploaded',updated:new Date().toISOString().slice(0,10)}:d);setDocs(next);writeLocal('documents',next)};
  return <><PageHead eyebrow="Borrower / Documents" title="Document room" subtitle="Track what PiHub requested, what you uploaded and what has already been accepted."/>
  <div className="ph-table-wrap"><table className="ph-table"><thead><tr><th>Document</th><th>Category</th><th>Status</th><th>Updated</th><th>Action</th></tr></thead><tbody>{docs.map(d=><tr key={d.id}><td><strong>{d.name}</strong></td><td>{d.category}</td><td><Status tone={d.status==='Accepted'?'good':d.status==='Required'?'bad':'warn'}>{d.status}</Status></td><td>{d.updated}</td><td>{d.status==='Required'?<button className="ph-button" onClick={()=>upload(d.id)}>Mark demo upload</button>:'—'}</td></tr>)}</tbody></table></div></>;
};

export const Requests = () => {
  const [items,setItems]=useState(()=>readLocal('requests',DEMO_REQUESTS));
  const complete=id=>{const next=items.map(i=>i.id===id?{...i,status:'Complete'}:i);setItems(next);writeLocal('requests',next)};
  return <><PageHead eyebrow="Borrower / Requests" title="Requests from PiHub" subtitle="Outstanding information requests are explicit, owned and time-bound so the financing process does not disappear into email threads."/>
  <div className="ph-table-wrap"><table className="ph-table"><thead><tr><th>Request</th><th>Due</th><th>Priority</th><th>Status</th><th></th></tr></thead><tbody>{items.map(i=><tr key={i.id}><td>{i.title}</td><td>{i.due}</td><td><Status tone={i.priority==='High'?'bad':'warn'}>{i.priority}</Status></td><td><Status tone={i.status==='Complete'?'good':''}>{i.status}</Status></td><td>{i.status!=='Complete'?<button className="ph-button" onClick={()=>complete(i.id)}>Mark complete</button>:'Done'}</td></tr>)}</tbody></table></div></>;
};

export const Closing = () => <><PageHead eyebrow="Borrower / Closing" title="Terms & closing" subtitle="Follow term-sheet, documentation and funding milestones without exposing internal lender-only decision material."/>
<div className="ph-grid cols-3"><Card title="1. Indicative terms"><Status tone="good">Prepared</Status><p className="ph-subtitle">Structure and pricing are being refined with financing providers.</p></Card><Card title="2. Documentation"><Status tone="warn">Pending</Status><p className="ph-subtitle">Facility documentation begins after commercial terms are agreed.</p></Card><Card title="3. Funding"><Status>Not started</Status><p className="ph-subtitle">Funding is gated by conditions precedent and signed documents.</p></Card></div></>;

export const Account = () => <><PageHead eyebrow="Borrower / Account" title="Organization account" subtitle="Borrower users see only their organization, permitted deal records and borrower-facing communication."/>
<Card title="Access context"><dl className="ph-kv"><dt>Organization</dt><dd>Berlin Living GmbH</dd><dt>Role</dt><dd>Borrower Owner</dd><dt>Workspace</dt><dd>Borrower only</dd><dt>Session</dt><dd>Browser-local demo</dd></dl></Card></>;
