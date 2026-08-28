import React from 'react';
import { Link } from 'react-router-dom';
import { ApplicationChecklist } from '../components/ApplicationChecklist';
import { Card, PageHead, Progress, Status, euro } from '../components/UI';
import { Icon } from '../components/Icons';
import { useBorrowerStore } from '../state/store';
import { facilityHealth, nextFacilityPayment } from '../state/core';
import { workflowReadiness } from '../state/advanced';

const statusLabel: Record<string, string> = {
  draft: 'Draft', submitted: 'Submitted', pihub_review: 'PiHub review', information_required: 'Information required', structuring: 'Structuring', due_diligence: 'Due diligence', investor_review: 'Investor review', indicative_terms: 'Indicative terms', terms_accepted: 'Terms accepted', documentation: 'Documentation', conditions_precedent: 'Conditions precedent', ready_to_fund: 'Ready to fund', funded: 'Funded', declined: 'Declined', withdrawn: 'Withdrawn', archived: 'Archived'
};

export function OverviewPage() {
  const { state, app, mode, completion, submitApplication } = useBorrowerStore();
  const openRequests = state.requests.filter((r) => r.applicationId === app.id && ['open', 'overdue'].includes(r.status));
  const acceptedDocs = state.documents.filter((d) => d.applicationId === app.id && d.status === 'accepted').length;
  const workflow = workflowReadiness(state, app.id);
  const canSubmit = completion === 100 && workflow.ready && app.status === 'draft';
  const nextRequest = openRequests[0];

  if (app.status === 'funded') {
    const facility = state.facilities.find((item) => item.applicationId === app.id);
    const nextPayment = facility ? nextFacilityPayment(state, facility.id) : undefined;
    const health = facility ? facilityHealth(state, facility.id) : { covenantStatus: 'not_tested' as const, outstandingReporting: 0 };
    const nextReporting = facility ? state.reportingObligations.filter((item) => item.facilityId === facility.id && ['required','rejected'].includes(item.status)).sort((a,b)=>a.dueDate.localeCompare(b.dueDate))[0] : undefined;
    return <div className="route-stage">
      <PageHead eyebrow="Borrower / Funded facility" title="Facility overview" subtitle="Your borrower-facing obligations continue after funding: payments, covenants, reporting and maturity actions." action={<Link className="button primary" to="/servicing">Open loan servicing</Link>}/>
      <div className="demo-banner"><Icon name="activity" size={16}/><span><strong>{mode === 'api' ? 'PiHub connected.' : 'Demo servicing workspace.'}</strong> {mode === 'api' ? 'Facility data is loaded from the canonical PiHub platform.' : 'Provider-confirmed states are simulated locally; borrower actions create canonical servicing events.'}</span></div>
      {!facility ? <Card><div className="empty-state compact-empty"><strong>Funding recorded, facility details pending</strong><p>PiHub has not yet published the facility schedule to the Borrower workspace.</p></div></Card> : <>
        <div className="kpi-grid">
          <Card><div className="kpi"><span>Outstanding balance</span><strong>{euro(facility.outstandingAmount)}</strong><small>Original {euro(facility.originalAmount)}</small></div></Card>
          <Card><div className="kpi"><span>Next payment</span><strong>{nextPayment ? euro(nextPayment.principal + nextPayment.interest + nextPayment.fees) : 'Complete'}</strong><small>{nextPayment ? `Due ${nextPayment.dueDate}` : 'No scheduled amount due'}</small></div></Card>
          <Card><div className="kpi"><span>Covenant health</span><strong className="kpi-word">{health.covenantStatus.replace('_',' ')}</strong><small>Borrower-visible tests only</small></div></Card>
          <Card><div className="kpi"><span>Reporting outstanding</span><strong>{health.outstandingReporting}</strong><small>{nextReporting ? `Next due ${nextReporting.dueDate}` : 'Nothing outstanding'}</small></div></Card>
        </div>
        <div className="dashboard-grid">
          <Card title="Next borrower obligation" subtitle="The most immediate post-funding action.">{nextReporting ? <div className="attention-item"><span><strong>{nextReporting.title}</strong><small>Due {nextReporting.dueDate} · {nextReporting.status.replace('_',' ')}</small></span><Link className="button secondary" to="/servicing">Open reporting</Link></div> : nextPayment ? <div className="attention-item"><span><strong>Prepare next scheduled payment</strong><small>Due {nextPayment.dueDate}</small></span><Link className="button secondary" to="/servicing">View schedule</Link></div> : <div className="empty-state compact-empty"><strong>No immediate borrower action</strong><p>Continue monitoring facility notices and maturity timing.</p></div>}</Card>
          <Card title="Facility" subtitle="Provider-confirmed borrower-facing terms."><div className="summary-list"><div><span>Facility ID</span><strong>{facility.id}</strong></div><div><span>Provider</span><strong>{facility.provider}</strong></div><div><span>Pricing</span><strong>{facility.referenceRate} + {(facility.marginBps/100).toFixed(2)}%</strong></div><div><span>Maturity</span><strong>{facility.maturityDate}</strong></div></div></Card>
        </div>
      </>}
    </div>;
  }

  return <div className="route-stage">
    <PageHead eyebrow="Borrower / Financing overview" title="Financing overview" subtitle="One clear view of what PiHub has, what still blocks review and what happens next." action={<Link className="button primary" to="/application">Continue application</Link>} />
    <div className="demo-banner"><Icon name="warning" size={16}/><span><strong>{mode === 'api' ? 'PiHub connected.' : 'Demo workspace.'}</strong> {mode === 'api' ? 'This view is loaded from the canonical Borrower platform projection.' : 'Data persists in this browser. Cross-module consequences are represented by canonical demo events.'}</span></div>
    <div className="context-chips"><Status tone="info">Borrower owner</Status><Status>Application {app.id}</Status><Status tone={state.organization.verificationStatus === 'verified' ? 'success' : 'warning'}>Organization {state.organization.verificationStatus.replace('_', ' ')}</Status></div>

    <section className="priority-strip">
      <div className="priority-copy"><span className="priority-icon"><Icon name={nextRequest ? 'warning' : 'check'} size={18}/></span><span><strong>{nextRequest ? nextRequest.title : canSubmit ? 'Application is ready to submit' : 'Complete the remaining application requirements'}</strong><small>{nextRequest ? `Due ${nextRequest.dueDate ?? 'soon'}` : canSubmit ? 'Core and product-specific requirements are complete.' : workflow.blockers[0] ?? `${completion}% core complete`}</small></span></div>
      {nextRequest ? <Link className="button" to="/requests">Open request</Link> : canSubmit ? <button className="button primary" onClick={submitApplication}>Submit application</button> : <Link className="button" to="/application">Continue</Link>}
    </section>

    <div className="kpi-grid">
      <Card><div className="kpi"><span>Core application</span><strong>{completion}%</strong><Progress value={completion}/></div></Card>
      <Card><div className="kpi"><span>Open PiHub requests</span><strong>{openRequests.length}</strong><small>{openRequests.length ? 'Your response required' : 'Nothing outstanding'}</small></div></Card>
      <Card><div className="kpi"><span>Documents accepted</span><strong>{acceptedDocs}</strong><small>{state.documents.filter((d) => d.applicationId === app.id).length} tracked</small></div></Card>
      <Card><div className="kpi"><span>Requested financing</span><strong>{euro(app.financing.amount)}</strong><small>{app.financing.structure}</small></div></Card>
    </div>

    <div className="dashboard-grid">
      <Card title="Application checklist" subtitle="Required sections and the exact next action."><ApplicationChecklist/></Card>
      <Card title="Application progress" subtitle="Borrower-facing lifecycle status." action={<Status tone="info">{statusLabel[app.status]}</Status>}>
        <div className="stage-list">
          {['Application', 'PiHub review', 'Structuring', 'Terms', 'Closing'].map((label, index) => {
            const stageIndex = app.status === 'draft' ? 0 : ['submitted','pihub_review','information_required'].includes(app.status) ? 1 : ['structuring','due_diligence','investor_review'].includes(app.status) ? 2 : ['indicative_terms','terms_accepted'].includes(app.status) ? 3 : 4;
            const complete = index < stageIndex;
            const active = index === stageIndex;
            return <div key={label} className={`stage-row ${complete ? 'complete' : ''} ${active ? 'active' : ''}`}><span className="stage-dot">{complete ? <Icon name="check" size={12}/> : index + 1}</span><span><strong>{label}</strong><small>{complete ? 'Completed' : active ? 'Current stage' : 'Upcoming'}</small></span>{active && <Status tone="info">Current</Status>}</div>;
          })}
        </div>
      </Card>
    </div>

    <Card title="Deal summary" subtitle="The borrower-facing transaction record shared by canonical ID.">
      <div className="deal-band"><div><small>Project</small><strong>{app.project.name}</strong></div><div><small>Structure</small><strong>{app.financing.structure}</strong></div><div><small>Current owner</small><strong>{state.profile.name}</strong></div><div><small>Next PiHub review</small><strong>28 Aug 2026</strong></div></div>
    </Card>
  </div>;
}
