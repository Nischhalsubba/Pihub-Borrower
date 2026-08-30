import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, EmptyState, PageHead, Status } from '../components/UI';
import { Icon } from '../components/Icons';
import { usePlatformIntegration } from '../platform/PlatformIntegrationContext';
import { moduleDisplayName } from '../platform/types';
import { useBorrowerStore } from '../state/store';

export function RequestsPage() {
  const { state, app, respondToRequest } = useBorrowerStore();
  const { projection, completeWorkItem, workingId, error: integrationError } = usePlatformIntegration();
  const threads = state.requests.filter((request) => request.applicationId === app.id);
  const workItems = (projection?.workItems ?? []).filter((item) => item.status !== 'cancelled' && item.status !== 'done');
  const items = useMemo(() => [
    ...threads.map((thread) => ({ key: `thread:${thread.id}`, kind: 'thread' as const, title: thread.title, source: thread.createdBy, status: thread.status, priority: thread.priority, due: thread.dueDate })),
    ...workItems.map((item) => ({ key: `task:${item.id}`, kind: 'task' as const, title: item.title, source: item.sourceModule, status: item.status, priority: item.priority, due: item.dueAt ?? undefined }))
  ], [threads, workItems]);
  const [activeKey, setActiveKey] = useState(items[0]?.key ?? '');
  const [reply, setReply] = useState('');

  useEffect(() => {
    if (!items.some((item) => item.key === activeKey)) setActiveKey(items[0]?.key ?? '');
  }, [activeKey, items]);

  const activeThread = activeKey.startsWith('thread:') ? threads.find((item) => `thread:${item.id}` === activeKey) : undefined;
  const activeTask = activeKey.startsWith('task:') ? workItems.find((item) => `task:${item.id}` === activeKey) : undefined;
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!activeThread || !reply.trim()) return;
    respondToRequest(activeThread.id, reply.trim());
    setReply('');
  };

  return <div className="route-stage"><PageHead eyebrow="Borrower / PiHub collaboration" title="PiHub Request Center" subtitle="One borrower inbox for clarification threads and authorized next actions created by Advisory, Admin/Compliance and other PiHub workflows." />
    {integrationError && <div className="platform-warning" role="status">Shared PiHub work items are temporarily unavailable. Existing borrower request conversations remain available.</div>}
    {items.length === 0 ? <EmptyState title="No open PiHub requests" body="New clarification requests and borrower-facing workflow actions will appear here." /> : <div className="request-layout"><Card className="request-list-card" title="Requests & actions" subtitle={`${threads.length} conversation${threads.length === 1 ? '' : 's'} · ${workItems.length} shared action${workItems.length === 1 ? '' : 's'}`}><div className="request-list">{items.map((item) => <button key={item.key} className={activeKey === item.key ? 'active' : ''} onClick={() => setActiveKey(item.key)}><span><strong>{item.title}</strong><small>{moduleDisplayName(item.source)} · {item.due ? `Due ${new Date(item.due).toLocaleDateString()}` : 'No due date'}</small></span><Status tone={item.status === 'resolved' || item.status === 'done' ? 'success' : item.status === 'overdue' || item.status === 'blocked' ? 'danger' : item.priority === 'high' || item.priority === 'critical' ? 'warning' : 'info'}>{item.status.replaceAll('_', ' ')}</Status></button>)}</div></Card>
      {activeThread && <Card title={activeThread.title} subtitle={activeThread.description} action={<Status tone={activeThread.priority === 'high' ? 'warning' : 'neutral'}>{activeThread.priority} priority</Status>}><div className="thread">{activeThread.messages.length === 0 ? <p className="thread-empty">No messages yet.</p> : activeThread.messages.map((message) => <div key={message.id} className={`message-bubble ${message.author}`}><div><strong>{message.author === 'borrower' ? 'You' : 'PiHub'}</strong><small>{new Date(message.createdAt).toLocaleString()}</small></div><p>{message.text}</p></div>)}</div>{activeThread.status !== 'resolved' && <form className="reply-form" onSubmit={submit}><label><span>Reply to PiHub</span><textarea rows={4} value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Provide the requested clarification or explain what you are attaching."/></label><div className="form-actions"><button className="button primary" type="submit" disabled={!reply.trim()}><Icon name="message" size={16}/>Submit response</button><span>Your response remains attached to this canonical PiHub request history.</span></div></form>}</Card>}
      {activeTask && <Card title={activeTask.title} subtitle={`${moduleDisplayName(activeTask.sourceModule)} work item`} action={<Status tone={activeTask.priority === 'critical' || activeTask.priority === 'high' ? 'warning' : 'info'}>{activeTask.priority} priority</Status>}><div className="request-task-detail"><p>{activeTask.description}</p><div className="summary-grid"><div><span>Source</span><strong>{moduleDisplayName(activeTask.sourceModule)}</strong></div><div><span>Status</span><strong>{activeTask.status.replaceAll('_', ' ')}</strong></div><div><span>Due</span><strong>{activeTask.dueAt ? new Date(activeTask.dueAt).toLocaleDateString() : 'No due date'}</strong></div><div><span>Completion</span><strong>{activeTask.borrowerCompletable ? 'Borrower can confirm' : 'PiHub validates'}</strong></div></div><div className="form-actions">{activeTask.actionHref && <Link className="button primary" to={activeTask.actionHref}>Open required action</Link>}{activeTask.borrowerCompletable && <button className="button secondary" disabled={workingId === activeTask.id} onClick={() => void completeWorkItem(activeTask.id).catch(() => undefined)}>{workingId === activeTask.id ? 'Updating…' : 'Mark complete'}</button>}</div>{!activeTask.borrowerCompletable && <p className="platform-note">PiHub will close this item after the required evidence or workflow step has been validated.</p>}</div></Card>}
    </div>}
  </div>;
}
