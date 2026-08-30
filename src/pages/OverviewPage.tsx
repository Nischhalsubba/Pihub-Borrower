import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApplicationChecklist } from '../components/ApplicationChecklist';
import { Card, PageHead, Progress, Status, euro } from '../components/UI';
import { Icon } from '../components/Icons';
import { hasCompletedBorrowerOnboarding, markBorrowerOnboardingComplete } from '../onboarding';
import { usePlatformIntegration } from '../platform/PlatformIntegrationContext';
import { moduleDisplayName, type PlatformWorkflowState } from '../platform/types';
import { useBorrowerStore } from '../state/store';
import { facilityHealth, nextFacilityPayment } from '../state/core';
import { workflowReadiness } from '../state/advanced';
import { OnboardingPage } from './OnboardingPage';

const statusLabel: Record<string, string> = {
  draft: 'Draft', submitted: 'Submitted', pihub_review: 'PiHub review', information_required: 'Information required', structuring: 'Structuring', due_diligence: 'Due diligence', investor_review: 'Investor review', indicative_terms: 'Indicative terms', terms_accepted: 'Terms accepted', documentation: 'Documentation', conditions_precedent: 'Conditions precedent', ready_to_fund: 'Ready to fund', funded: 'Funded', declined: 'Declined', withdrawn: 'Withdrawn', archived: 'Archived'
};

const moduleStateLabel: Record<PlatformWorkflowState, string> = {
  not_started: 'Not started',
  ready: 'Ready',
  in_progress: 'In progress',
  blocked: 'Action needed',
  completed: 'Completed',
  closed: 'Closed'
};

function moduleTone(state: PlatformWorkflowState): 'neutral' | 'info' | 'warning' | 'success' {
  if (state === 'completed') return 'success';
  if (state === 'in_progress' || state === 'ready') return 'info';
  if (state === 'blocked') return 'warning';
  return 'neutral';
}

export function OverviewPage() {
  const auth = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { state, app, mode, completion, submitApplication } = useBorrowerStore();
  const { projection, status: integrationStatus } = usePlatformIntegration();
  const replayOnboarding = new URLSearchParams(location.search).get('tour') === '1';
  const [showOnboarding, setShowOnboarding] = useState(() => replayOnboarding || !hasCompletedBorrowerOnboarding(auth.user?.id));

  useEffect(() => {
    if (replayOnboarding) setShowOnboarding(true);
  }, [replayOnboarding]);

  const completeOnboarding = () => {
    markBorrowerOnboardingComplete(auth.user?.id);
    setShowOnboarding(false);
    if (replayOnboarding) navigate('/', { replace: true });
  };

  const openRequests = state.requests.filter((request) => request.applicationId === app.id && ['open', 'overdue'].includes(request.status));
  const acceptedDocs = state.documents.filter((document) => document.applicationId === app.id && document.status === 'accepted').length;
  const workflow = workflowReadiness(state, app.id);
  const organizationReady = projection?.submissionReady ?? false;
  const canSubmit = completion === 100 && workflow.ready && organizationReady && app.status === 'draft';
  const nextRequest = openRequests[0];
  const sharedWork = projection?.workItems.filter((item) => ['open', 'in_progress', 'blocked'].includes(item.status)) ?? [];
  const nextSharedWork = sharedWork[0];

  if (showOnboarding) return <OnboardingPage onComplete={completeOnboarding}/>;

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

  const priority = nextSharedWork
    ? {
        title: nextSharedWork.title,
        detail: nextSharedWork.dueAt ? `Due ${new Date(nextSharedWork.dueAt).toLocaleDateString()} · ${moduleDisplayName(nextSharedWork.sourceModule)}` : `From ${moduleDisplayName(nextSharedWork.sourceModule)}`,
        href: nextSharedWork.actionHref || '/requests',
        action: 'Open request'
      }
    : nextRequest
      ? { title: nextRequest.title, detail: `Due ${nextRequest.dueDate ?? 'soon'}`, href: '/requests', action: 'Open request' }
      : canSubmit
        ? { title: 'Application is ready to submit', detail: 'Core, product-specific and organization approval requirements are complete.', href: '/application', action: 'Review application' }
        : !organizationReady && completion === 100 && workflow.ready
          ? { title: 'Complete organization approvals', detail: 'Finance, legal and signatory approval gates are required before submission.', href: '/application', action: 'Review approvals' }
          : { title: 'Complete the remaining application requirements', detail: workflow.blockers[0] ?? `${completion}% core complete`, href: '/application', action: 'Continue' };

  return <div className="route-stage">
    <PageHead eyebrow="Borrower / Financing overview" title="Financing overview" subtitle="One clear view of what PiHub has, what still blocks review and what happens next." action={<Link className="button primary" to="/application">Continue application</Link>} />
    <div className="demo-banner"><Icon name="warning" size={16}/><span><strong>{mode === 'api' ? 'PiHub connected.' : 'Demo workspace.'}</strong> {mode === 'api' ? 'This view is loaded from the canonical Borrower platform projection.' : 'Data persists in this browser. Cross-module consequences are represented by canonical demo events.'}</span></div>
    <div className="context-chips"><Status tone="info">Borrower owner</Status><Status>Application {app.id}</Status><Status tone={state.organization.verificationStatus === 'verified' ? 'success' : 'warning'}>Organization {state.organization.verificationStatus.replace('_', ' ')}</Status></div>

    <section className="priority-strip"><div className="priority-copy"><span className="priority-icon"><Icon name={nextSharedWork || nextRequest ? 'warning' : canSubmit ? 'check' : 'activity'} size={18}/></span><span><strong>{priority.title}</strong><small>{priority.detail}</small></span></div>{canSubmit && !nextSharedWork && !nextRequest ? <button className="button primary" onClick={submitApplication}>Submit application</button> : <Link className="button" to={priority.href}>{priority.action}</Link>}</section>

    <div className="kpi-grid">
      <Card><div className="kpi"><span>Core application</span><strong>{completion}%</strong><Progress value={completion}/></div></Card>
      <Card><div className="kpi"><span>Open PiHub requests</span><strong>{openRequests.length + sharedWork.length}</strong><small>{openRequests.length + sharedWork.length ? 'Your response or action may be required' : 'Nothing outstanding'}</small></div></Card>
      <Card><div className="kpi"><span>Documents accepted</span><strong>{acceptedDocs}</strong><small>{state.documents.filter((document) => document.applicationId === app.id).length} tracked</small></div></Card>
      <Card><div className="kpi"><span>Requested financing</span><strong>{euro(app.financing.amount)}</strong><small>{app.financing.structure}</small></div></Card>
    </div>

    <div className="dashboard-grid">
      <Card title="Application checklist" subtitle="Required sections and the exact next action."><ApplicationChecklist/></Card>
      <Card className="overview-timeline-card" title="PiHub financing timeline" subtitle="One canonical application coordinated across Borrower, Advisory, Admin/Compliance and Investor." action={<Status tone="info">{statusLabel[app.status]}</Status>}>
        {integrationStatus === 'error' && <div className="platform-warning" role="status">Shared module status is temporarily unavailable. Your Borrower application remains available.</div>}
        <div className="stage-list platform-timeline">{(projection?.moduleStates ?? []).map((item, index) => <div key={item.module} className={`stage-row ${item.state === 'completed' ? 'complete' : ''} ${['in_progress','ready','blocked'].includes(item.state) ? 'active' : ''}`}><span className="stage-dot">{item.state === 'completed' ? <Icon name="check" size={12}/> : index + 1}</span><span><strong>{moduleDisplayName(item.module)}</strong><small>{item.module === 'borrower' ? 'Application and borrower responses' : item.module === 'advisory' ? 'Structuring and due diligence' : item.module === 'admin' ? 'Compliance and platform controls' : 'Opportunity review and commitment'}</small></span><Status tone={moduleTone(item.state)}>{moduleStateLabel[item.state]}</Status></div>)}</div>
        {!projection && integrationStatus !== 'error' && <p className="platform-note">Shared PiHub workflow status is loading.</p>}
        {projection && <p className="platform-note">Only borrower-safe workflow state is shown here. Internal Advisory, Investor and Compliance notes remain private.</p>}
      </Card>
    </div>

    <Card title="Deal summary" subtitle="The borrower-facing transaction record shared by canonical ID."><div className="deal-band"><div><small>Project</small><strong>{app.project.name}</strong></div><div><small>Structure</small><strong>{app.financing.structure}</strong></div><div><small>Current owner</small><strong>{state.profile.name}</strong></div><div><small>Application</small><strong>{app.id}</strong></div></div></Card>
  </div>;
}
