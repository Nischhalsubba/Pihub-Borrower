import React from 'react';
import { Link } from 'react-router-dom-v6';
import { DEMO_DEAL, DEMO_DOCUMENTS, DEMO_REQUESTS, euro } from '../packages/domain/src/demo-data';
import { readLocal } from './local-state';
import { PageHead, Status } from './ui';

const PriorityIcon = () => <span className="ph-priority-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3v10"/><path d="M12 17v.01"/><path d="M5.5 21h13L12 3z"/></svg></span>;

export default function BorrowerOverview() {
  const requests = readLocal('requests', DEMO_REQUESTS);
  const documents = readLocal('documents', DEMO_DOCUMENTS);
  const openRequests = requests.filter(item => item.status !== 'Complete');
  const highPriority = openRequests.find(item => item.priority === 'High') || openRequests[0];
  const acceptedDocuments = documents.filter(item => item.status === 'Accepted').length;
  const requiredDocuments = documents.filter(item => item.status === 'Required').length;
  const stages = [
    { name: 'Application', note: 'Financing request and borrower profile received', state: 'complete', meta: 'Complete' },
    { name: 'Documents', note: `${requiredDocuments} required item${requiredDocuments === 1 ? '' : 's'} still outstanding`, state: requiredDocuments ? 'current' : 'complete', meta: requiredDocuments ? 'Action' : 'Complete' },
    { name: 'PiHub review', note: 'Structure, borrower and project information under review', state: 'current', meta: 'In review' },
    { name: 'Indicative terms', note: 'Commercial terms follow review and lender engagement', state: '', meta: 'Next' },
    { name: 'Closing', note: 'Documentation, conditions precedent and funding', state: '', meta: 'Pending' },
  ];

  return <>
    <PageHead eyebrow="Borrower / Financing overview" title="Financing overview" subtitle="One clear view of what PiHub has, what still blocks review and what happens next." action={<Link className="ph-button primary" to="/financing">Continue application</Link>} />
    <div className="ph-demo">Demo workspace. Values and actions remain browser-local until production authentication, authorization and APIs are connected.</div>
    <div className="ph-focus-row" aria-label="Borrower workspace context">
      <span className="ph-role-chip is-primary">Borrower owner</span>
      <span className="ph-role-chip">Application {DEMO_DEAL.id}</span>
      <span className="ph-role-chip">{DEMO_DEAL.city} · {DEMO_DEAL.assetClass}</span>
    </div>
    <section className="ph-priority-strip" aria-label="Next borrower action">
      <div className="ph-priority-copy"><PriorityIcon/><span><strong>{highPriority ? `${highPriority.title} is the next item PiHub needs` : 'No borrower action is blocking review'}</strong><small>{highPriority ? `Due ${highPriority.due}. Complete this request to keep the financing review moving.` : 'All visible information requests are complete.'}</small></span></div>
      <Link className="ph-button secondary" to={highPriority?.title?.toLowerCase().includes('statement') ? '/documents' : '/requests'}>{highPriority ? 'Resolve next item' : 'Review requests'}</Link>
    </section>
    <section className="ph-kpi-tape" aria-label="Borrower application summary">
      <article className="ph-kpi is-signal"><span className="ph-kpi-label"><i/>Application complete</span><strong className="ph-kpi-value">{DEMO_DEAL.progress}%</strong><span className="ph-kpi-detail">Borrower information captured</span></article>
      <article className="ph-kpi is-warning"><span className="ph-kpi-label"><i/>Open PiHub requests</span><strong className="ph-kpi-value">{openRequests.length}</strong><span className="ph-kpi-detail">Information or documents still needed</span></article>
      <article className="ph-kpi is-positive"><span className="ph-kpi-label"><i/>Documents accepted</span><strong className="ph-kpi-value">{acceptedDocuments}</strong><span className="ph-kpi-detail">{documents.length} visible document records</span></article>
      <article className="ph-kpi"><span className="ph-kpi-label"><i/>Requested financing</span><strong className="ph-kpi-value is-money">{euro(DEMO_DEAL.requestedAmount)}</strong><span className="ph-kpi-detail">{DEMO_DEAL.structure}</span></article>
    </section>
    <div className="ph-dashboard-grid">
      <section className="ph-panel" aria-labelledby="borrower-actions-title">
        <header className="ph-panel-head"><div><strong id="borrower-actions-title">Next actions</strong><span>Borrower-owned items, ordered by urgency</span></div><Link to="/requests">All requests</Link></header>
        <div className="ph-attention-list">{openRequests.length ? openRequests.slice(0, 4).map(item => <Link className="ph-attention-row" to={item.title.toLowerCase().includes('statement') ? '/documents' : '/requests'} key={item.id}><span><strong>{item.title}</strong><small>Due {item.due}</small></span><Status tone={item.priority === 'High' ? 'bad' : 'warn'}>{item.priority}</Status><b>Open</b></Link>) : <div className="ph-empty">No outstanding borrower requests.</div>}</div>
      </section>
      <section className="ph-panel" aria-labelledby="borrower-progress-title">
        <header className="ph-panel-head"><div><strong id="borrower-progress-title">Application progress</strong><span>From request to closing</span></div></header>
        <div className="ph-stage-rail">{stages.map((stage, index) => <div className={`ph-stage-step${stage.state === 'complete' ? ' is-complete' : stage.state === 'current' ? ' is-current' : ''}`} key={stage.name}><span className="ph-stage-dot">{stage.state === 'complete' ? '✓' : index + 1}</span><span className="ph-stage-copy"><strong>{stage.name}</strong><small>{stage.note}</small></span><span className="ph-stage-meta">{stage.meta}</span></div>)}</div>
      </section>
    </div>
    <section className="ph-deal-band" aria-label="Borrower deal snapshot">
      <div className="ph-deal-title"><small>Application</small><strong>{DEMO_DEAL.name}</strong></div>
      <div><small>Structure</small><strong>{DEMO_DEAL.structure}</strong></div>
      <div><small>Current owner</small><strong>{DEMO_DEAL.owner}</strong></div>
      <div><small>Next PiHub review</small><strong>{DEMO_DEAL.nextReview}</strong></div>
    </section>
  </>;
}