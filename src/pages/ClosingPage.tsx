import React, { useMemo, useState } from 'react';
import { Card, EmptyState, PageHead, Progress, Status, euro } from '../components/UI';
import { useBorrowerStore } from '../state/store';

export function ClosingPage() {
  const { state, app, decideTerm, toggleClosingItem } = useBorrowerStore();
  const [notice,setNotice]=useState('');
  const terms=state.terms.filter((t)=>t.applicationId===app.id);
  const items=state.closingItems.filter((item)=>item.applicationId===app.id);
  const complete=items.length?Math.round(items.filter((i)=>i.complete).length/items.length*100):0;
  const accepted=terms.find((t)=>t.status==='accepted');
  return <div className="route-stage"><PageHead eyebrow="Borrower / Execution" title="Terms & closing" subtitle="Review indicative financing terms and complete borrower-owned closing requirements."/>
    <div className="closing-grid"><Card title="Indicative terms" subtitle="Non-binding demo terms until a production term-sheet/document service is connected.">{terms.length===0?<EmptyState title="No terms available" body="Indicative terms will appear after structuring and lender review."/>:terms.map((term)=><div className="term-card" key={term.id}><div className="term-head"><div><strong>{term.provider}</strong><small>Expires {term.expiryDate}</small></div><Status tone={term.status==='accepted'?'success':term.status==='rejected'?'danger':'info'}>{term.status}</Status></div><dl className="term-facts"><div><dt>Amount</dt><dd>{euro(term.amount)}</dd></div><div><dt>Pricing</dt><dd>{term.referenceRate} + {(term.marginBps/100).toFixed(2)}%</dd></div><div><dt>Tenor</dt><dd>{term.tenorMonths} months</dd></div><div><dt>LTV</dt><dd>{term.ltv}%</dd></div><div><dt>Fees</dt><dd>{term.fees}%</dd></div></dl>{term.status==='available'&&<div className="term-actions"><button className="button primary" onClick={()=>{decideTerm(term.id,'accepted');setNotice('Indicative terms accepted. Advisory and Investor events were queued.')}}>Accept indicative terms</button><button className="button secondary danger-text" onClick={()=>{if(window.confirm('Reject these indicative terms?')){decideTerm(term.id,'rejected');setNotice('Terms rejected. PiHub can continue structuring alternatives.')}}}>Reject</button></div>}</div>)}</Card>
      <Card title="Closing readiness" subtitle="Borrower-owned conditions can be completed here. PiHub/legal-owned items are read-only." action={<Status tone={complete===100?'success':'warning'}>{complete}%</Status>}><Progress value={complete}/><div className="closing-list">{items.map((item)=><label className={`closing-item ${item.owner!=='borrower'?'read-only':''}`} key={item.id}><input type="checkbox" checked={item.complete} disabled={item.owner!=='borrower'||!accepted} onChange={(e)=>toggleClosingItem(item.id,e.target.checked)}/><span><strong>{item.title}</strong><small>Owner: {item.owner} · {item.dueDate?`Due ${item.dueDate}`:'No due date'}{!accepted?' · Terms must be accepted first':''}</small></span><Status tone={item.complete?'success':'neutral'}>{item.complete?'Complete':'Pending'}</Status></label>)}</div></Card></div>
    {notice&&<div className="success-banner" role="status">{notice}</div>}
  </div>;
}
