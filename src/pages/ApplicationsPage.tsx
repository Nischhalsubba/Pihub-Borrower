import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, EmptyState, PageHead, Progress, Status, euro } from '../components/UI';
import { useBorrowerStore } from '../state/store';
import { completionPercentage } from '../state/core';

export function ApplicationsPage() {
  const { state, setActiveApplication, withdrawApplication } = useBorrowerStore();
  const navigate = useNavigate();
  const [notice, setNotice] = useState('');
  const open = (id: string) => { setActiveApplication(id); navigate('/application'); };
  const withdraw = (id: string, name: string) => {
    if (!window.confirm(`Withdraw “${name}”? The demo will retain its history but stop the application workflow.`)) return;
    withdrawApplication(id);
    setNotice(`${name} was withdrawn.`);
  };

  return <div className="route-stage"><PageHead eyebrow="Borrower / Applications" title="My applications" subtitle="Every financing request owned by your organization, with progress, version and a clear next action." action={<Link className="button primary" to="/applications/new">New application</Link>} />
    {notice && <div className="success-banner" role="status">{notice}</div>}
    {state.applications.length === 0 ? <EmptyState title="No financing applications" body="Start a financing request when your organization is ready." action={<Link className="button primary" to="/applications/new">Start application</Link>} /> : <div className="application-list">{state.applications.map((app) => {
      const pct = completionPercentage(app, state.documents);
      const canWithdraw = !['funded','withdrawn','archived'].includes(app.status);
      return <Card key={app.id}><div className="application-row"><div className="application-main"><div className="application-title"><strong>{app.name}</strong><Status tone={app.status === 'draft' ? 'neutral' : app.status === 'withdrawn' ? 'danger' : 'info'}>{app.status.replaceAll('_',' ')}</Status></div><small>{app.id} · Version {app.version} · Updated {new Date(app.updatedAt).toLocaleDateString()}</small><Progress value={pct} label={`${pct}% application complete`}/></div><div className="application-metrics"><div><span>Amount</span><strong>{euro(app.financing.amount)}</strong></div><div><span>Structure</span><strong>{app.financing.structure || 'Not set'}</strong></div></div><div className="row-actions"><button className="button" onClick={() => open(app.id)}>Open</button>{app.status==='funded'&&<button className="button primary" onClick={()=>{setActiveApplication(app.id);navigate('/servicing')}}>Loan servicing</button>}<button className="button secondary" disabled={!canWithdraw} onClick={() => withdraw(app.id, app.name)}>Withdraw</button></div></div></Card>;
    })}</div>}
  </div>;
}
