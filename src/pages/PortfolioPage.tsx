import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, PageHead, Status, euro } from '../components/UI';
import { useBorrowerStore } from '../state/store';
import { downloadText, toCsv } from '../utils/download';

const statusTone = (status: string) => status === 'funded' ? 'success' : ['declined','withdrawn'].includes(status) ? 'danger' : ['draft','information_required'].includes(status) ? 'warning' : 'info';

export function PortfolioPage() {
  const { state, setActiveApplication, feature } = useBorrowerStore();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'updated'|'amount'|'maturity'|'name'>('updated');
  const [viewName, setViewName] = useState('');
  const [query, setQuery] = useState('');
  const rows = useMemo(() => state.applications.map((app) => {
    const facility = state.facilities.find((f) => f.applicationId === app.id);
    const spv = state.advanced.spvs.find((item) => item.applicationIds.includes(app.id));
    const requestCount = state.requests.filter((r) => r.applicationId === app.id && r.status !== 'resolved').length;
    return { app, facility, spv, requestCount };
  }).filter((row) => {
    if (filter === 'funded' && row.app.status !== 'funded') return false;
    if (filter === 'origination' && row.app.status === 'funded') return false;
    if (filter === 'attention' && row.requestCount === 0 && row.app.status !== 'information_required') return false;
    return `${row.app.name} ${row.app.id} ${row.spv?.name ?? ''} ${row.app.financing.structure}`.toLowerCase().includes(query.toLowerCase());
  }).sort((a,b) => {
    if (sortBy === 'amount') return b.app.financing.amount - a.app.financing.amount;
    if (sortBy === 'name') return a.app.name.localeCompare(b.app.name);
    if (sortBy === 'maturity') return (a.facility?.maturityDate ?? '9999').localeCompare(b.facility?.maturityDate ?? '9999');
    return b.app.updatedAt.localeCompare(a.app.updatedAt);
  }), [filter, query, sortBy, state]);

  const exportPortfolio = () => {
    const data = rows.map(({app,facility,spv,requestCount}) => ({ application_id: app.id, deal: app.name, spv: spv?.name ?? '', status: app.status, financing_amount_eur: app.financing.amount, structure: app.financing.structure, open_requests: requestCount, facility: facility?.id ?? '', maturity: facility?.maturityDate ?? '' }));
    downloadText('pihub-borrower-portfolio.csv', toCsv(data), 'text/csv;charset=utf-8');
    feature({ type: 'create_export', format: 'csv_manifest', includedSections: ['portfolio','applications','facilities'] });
  };

  return <div className="route-stage"><PageHead eyebrow="Borrower / Portfolio" title="Financing portfolio" subtitle="One portfolio for applications, SPVs and funded facilities. Saved views keep multi-deal borrowers oriented without duplicating the underlying deal record." action={<button className="button primary" onClick={exportPortfolio}>Export portfolio</button>}/>
    <div className="portfolio-kpis">
      <Card><div className="kpi"><span>Total requested / committed</span><strong>{euro(state.applications.reduce((sum,a)=>sum+a.financing.amount,0))}</strong><small>{state.applications.length} financing relationships</small></div></Card>
      <Card><div className="kpi"><span>Funded facilities</span><strong>{state.facilities.length}</strong><small>{euro(state.facilities.reduce((sum,f)=>sum+f.outstandingAmount,0))} outstanding</small></div></Card>
      <Card><div className="kpi"><span>Open PiHub requests</span><strong>{state.requests.filter((r)=>r.status!=='resolved').length}</strong><small>Across all applications</small></div></Card>
      <Card><div className="kpi"><span>SPVs / borrowers</span><strong>{state.advanced.spvs.length}</strong><small>Organization-scoped legal entities</small></div></Card>
    </div>

    <Card title="Portfolio controls" subtitle="Search, filter, sort and preserve a useful operating view."><div className="toolbar-grid"><label className="field"><span className="field-label">Search</span><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Deal, ID, SPV or structure"/></label><label className="field"><span className="field-label">Show</span><select value={filter} onChange={(e)=>setFilter(e.target.value)}><option value="all">All relationships</option><option value="origination">Origination</option><option value="funded">Funded</option><option value="attention">Needs attention</option></select></label><label className="field"><span className="field-label">Sort</span><select value={sortBy} onChange={(e)=>setSortBy(e.target.value as typeof sortBy)}><option value="updated">Most recently updated</option><option value="amount">Largest amount</option><option value="maturity">Nearest maturity</option><option value="name">Name</option></select></label><label className="field"><span className="field-label">Save current view</span><span className="inline-control"><input value={viewName} onChange={(e)=>setViewName(e.target.value)} placeholder="e.g. Active Berlin deals"/><button className="button secondary" disabled={!viewName.trim()} onClick={()=>{feature({type:'save_portfolio_view',name:viewName,statusFilter:filter,sortBy,columns:['status','amount','next_action','maturity']});setViewName('')}}>Save</button></span></label></div>
      {state.advanced.portfolioViews.length>0&&<div className="saved-view-row">{state.advanced.portfolioViews.map((view)=><button className="chip-button" key={view.id} onClick={()=>{setFilter(view.statusFilter);setSortBy(view.sortBy)}}>{view.name}</button>)}</div>}
    </Card>

    <Card title="Applications & facilities" subtitle={`${rows.length} visible relationship${rows.length===1?'':'s'}.`}><div className="portfolio-table"><div className="portfolio-head"><span>Deal / SPV</span><span>Status</span><span>Amount</span><span>Next operational point</span><span></span></div>{rows.map(({app,facility,spv,requestCount})=><div className="portfolio-row" key={app.id}><div><strong>{app.name}</strong><small>{app.id} · {spv?.name ?? state.organization.name}</small></div><Status tone={statusTone(app.status) as any}>{app.status.replaceAll('_',' ')}</Status><div><strong>{euro(app.financing.amount)}</strong><small>{app.financing.structure}</small></div><div><strong>{facility ? `Maturity ${facility.maturityDate}` : requestCount ? `${requestCount} open PiHub request${requestCount===1?'':'s'}` : 'No immediate blocker'}</strong><small>{facility ? `${euro(facility.outstandingAmount)} outstanding` : `Updated ${new Date(app.updatedAt).toLocaleDateString()}`}</small></div><button className="button secondary" onClick={()=>{setActiveApplication(app.id);navigate(app.status==='funded'?'/servicing':'/')}}>Open</button></div>)}</div></Card>
  </div>;
}
