import React, { useState } from 'react';
import { Card, EmptyState, PageHead, Status } from '../components/UI';
import { useBorrowerStore } from '../state/store';
import { Icon } from '../components/Icons';

export function RequestsPage() {
  const { state, app, respondToRequest } = useBorrowerStore();
  const requests = state.requests.filter((r)=>r.applicationId===app.id);
  const [activeId, setActiveId] = useState(requests[0]?.id ?? '');
  const [reply, setReply] = useState('');
  const active = requests.find((r)=>r.id===activeId);
  const submit = (e: React.FormEvent) => { e.preventDefault(); if (!active || !reply.trim()) return; respondToRequest(active.id, reply); setReply(''); };
  return <div className="route-stage"><PageHead eyebrow="Borrower / PiHub collaboration" title="PiHub requests" subtitle="Answer clarification and document requests without losing the history of what PiHub asked and when." />
    {requests.length===0 ? <EmptyState title="No PiHub requests" body="New clarification and information requests will appear here."/> : <div className="request-layout"><Card className="request-list-card" title="Requests" subtitle={`${requests.filter((r)=>r.status==='open').length} open`}><div className="request-list">{requests.map((req)=><button key={req.id} className={activeId===req.id?'active':''} onClick={()=>setActiveId(req.id)}><span><strong>{req.title}</strong><small>{req.dueDate ? `Due ${req.dueDate}` : 'No due date'} · {req.createdBy}</small></span><Status tone={req.status==='resolved'?'success':req.status==='overdue'?'danger':req.status==='open'?'warning':'info'}>{req.status}</Status></button>)}</div></Card>
      {active && <Card title={active.title} subtitle={active.description} action={<Status tone={active.priority==='high'?'warning':'neutral'}>{active.priority} priority</Status>}><div className="thread">{active.messages.length===0?<p className="thread-empty">No messages yet.</p>:active.messages.map((message)=><div key={message.id} className={`message-bubble ${message.author}`}><div><strong>{message.author==='borrower'?'You':'PiHub'}</strong><small>{new Date(message.createdAt).toLocaleString()}</small></div><p>{message.text}</p></div>)}</div><form className="reply-form" onSubmit={submit}><label><span>Reply to PiHub</span><textarea rows={4} value={reply} onChange={(e)=>setReply(e.target.value)} placeholder="Provide the requested clarification or explain what you are attaching."/></label><div className="form-actions"><button className="button primary" type="submit" disabled={!reply.trim()}><Icon name="message" size={16}/>Submit response</button><span>Submitting queues a canonical <code>request.responded</code> event for Advisory.</span></div></form></Card>}</div>}
  </div>;
}
