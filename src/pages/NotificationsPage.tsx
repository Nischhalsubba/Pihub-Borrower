import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, EmptyState, PageHead, Status } from '../components/UI';
import { useBorrowerStore } from '../state/store';

export function NotificationsPage() {
  const { state, markNotificationRead } = useBorrowerStore();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const navigate = useNavigate();
  const items = state.notifications.filter((item)=>!unreadOnly||!item.read);
  const open=(id:string,href:string)=>{markNotificationRead(id);navigate(href);};
  return <div className="route-stage"><PageHead eyebrow="Borrower / Updates" title="Notifications" subtitle="Borrower-facing requests, document decisions, application milestones, terms and closing actions with direct links to the affected workflow." action={<button className="button secondary" onClick={()=>markNotificationRead()}>Mark all read</button>}/>
    <Card><label className="filter-checkbox"><input type="checkbox" checked={unreadOnly} onChange={(e)=>setUnreadOnly(e.target.checked)}/>Show unread only</label></Card>
    {items.length===0?<EmptyState title="No notifications" body={unreadOnly?'No unread notifications remain.':'Application updates will appear here.'}/>:<div className="notification-page-list">{items.map((item)=><button key={item.id} className={item.read?'':'unread'} onClick={()=>open(item.id,item.href)}><span className="notification-kind">{item.kind}</span><span><strong>{item.title}</strong><small>{item.body}</small></span><span className="notification-meta"><Status tone={item.read?'neutral':'info'}>{item.read?'Read':'Unread'}</Status><small>{new Date(item.createdAt).toLocaleString()}</small></span></button>)}</div>}
  </div>;
}
