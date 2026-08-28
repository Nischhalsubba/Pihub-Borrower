import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, EmptyState, PageHead, Status } from '../components/UI';
import { deriveDeadlines } from '../state/advanced';
import { useBorrowerStore } from '../state/store';

const tone = (status: string) => status === 'overdue' ? 'danger' : status === 'due' ? 'warning' : status === 'complete' ? 'success' : 'info';

export function CalendarPage() {
  const { state } = useBorrowerStore();
  const [kind, setKind] = useState('all');
  const [scope, setScope] = useState<'active'|'all'>('active');
  const deadlines = useMemo(() => deriveDeadlines(state), [state]);
  const filtered = deadlines.filter((item) => (kind === 'all' || item.kind === kind) && (scope === 'all' || !item.applicationId || item.applicationId === state.activeApplicationId));
  const groups = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    filtered.forEach((item) => {
      const month = item.dueDate.slice(0, 7);
      map.set(month, [...(map.get(month) ?? []), item]);
    });
    return [...map.entries()].sort(([a],[b]) => a.localeCompare(b));
  }, [filtered]);
  const overdue = filtered.filter((d)=>d.status==='overdue').length;
  const next30 = filtered.filter((d)=>{const diff=(new Date(d.dueDate).getTime()-Date.now())/86400000;return diff>=0&&diff<=30;}).length;

  return <div className="route-stage">
    <PageHead eyebrow="Borrower / Deadlines" title="Calendar & deadlines" subtitle="One operational calendar for requests, payments, covenants, reporting, inspections, closing and maturity."/>
    <div className="deadline-kpis">
      <Card><div className="kpi"><span>Open deadlines</span><strong>{filtered.filter((d)=>d.status!=='complete').length}</strong><small>Across selected scope</small></div></Card>
      <Card><div className="kpi"><span>Due in 30 days</span><strong>{next30}</strong><small>Plan before they become urgent</small></div></Card>
      <Card><div className="kpi"><span>Overdue</span><strong>{overdue}</strong><Status tone={overdue ? 'danger' : 'success'}>{overdue ? 'Attention required' : 'On track'}</Status></div></Card>
    </div>
    <Card className="toolbar-card"><div className="toolbar-grid">
      <label className="inline-control"><span>Scope</span><select value={scope} onChange={(e)=>setScope(e.target.value as 'active'|'all')}><option value="active">Active application</option><option value="all">All applications & facilities</option></select></label>
      <label className="inline-control"><span>Type</span><select value={kind} onChange={(e)=>setKind(e.target.value)}><option value="all">All deadlines</option>{['request','document','payment','covenant','reporting','inspection','closing','maturity','term_expiry'].map((item)=><option key={item} value={item}>{item.replaceAll('_',' ')}</option>)}</select></label>
    </div></Card>
    {groups.length === 0 ? <EmptyState title="No deadlines in this view" body="Nothing is due for the selected scope and type."/> : <div className="calendar-months">{groups.map(([month, items]) => <Card key={month} title={new Date(`${month}-01T00:00:00`).toLocaleDateString(undefined,{month:'long',year:'numeric'})} subtitle={`${items.length} scheduled item${items.length===1?'':'s'}`}>
      <div className="deadline-list">{items.sort((a,b)=>a.dueDate.localeCompare(b.dueDate)).map((item)=><div className="deadline-row" key={item.id}><time dateTime={item.dueDate}><strong>{new Date(`${item.dueDate}T00:00:00`).toLocaleDateString(undefined,{day:'2-digit'})}</strong><small>{new Date(`${item.dueDate}T00:00:00`).toLocaleDateString(undefined,{weekday:'short'})}</small></time><span><strong>{item.title}</strong><small>{item.kind.replaceAll('_',' ')}{item.facilityId ? ` · ${item.facilityId}` : item.applicationId ? ` · ${item.applicationId}` : ''}</small></span><Status tone={tone(item.status) as any}>{item.status}</Status><Link className="button secondary" to={item.href}>Open</Link></div>)}</div>
    </Card>)}</div>}
  </div>;
}
