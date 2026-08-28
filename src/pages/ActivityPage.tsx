import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, PageHead, Status } from '../components/UI';
import { useBorrowerStore } from '../state/store';
import { Icon } from '../components/Icons';

export function ActivityPage() {
  const { state, app } = useBorrowerStore();
  const [filter,setFilter]=useState('all');
  const activity=state.activity.filter((item)=>!item.applicationId||item.applicationId===app.id).filter((item)=>filter==='all'||item.type.startsWith(filter));
  return <div className="route-stage"><PageHead eyebrow="Borrower / History" title="Activity" subtitle="A chronological borrower-facing record of application, document, request, terms, support and closing changes." action={<Link className="button secondary" to="/versions">Application versions</Link>}/><Card><div className="filter-row compact"><label>Activity type<select value={filter} onChange={(e)=>setFilter(e.target.value)}><option value="all">All activity</option><option value="application">Application</option><option value="document">Documents</option><option value="request">Requests</option><option value="terms">Terms</option><option value="closing">Closing</option><option value="support">Support</option><option value="team">Organization & team</option></select></label><div className="integration-health"><Icon name="activity" size={16}/><span>{state.outbox.length} demo integration events queued</span></div></div></Card><Card><div className="timeline">{activity.map((item)=><div className="timeline-item" key={item.id}><span className="timeline-dot"/><div><div className="timeline-title"><strong>{item.label}</strong><Status>{item.actor}</Status></div>{item.detail&&<p>{item.detail}</p>}<small>{new Date(item.createdAt).toLocaleString()}</small></div></div>)}</div></Card></div>;
}
