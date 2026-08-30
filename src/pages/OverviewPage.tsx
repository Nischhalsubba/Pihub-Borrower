import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ApplicationChecklist } from '../components/ApplicationChecklist';
import { Card, PageHead, Status, euro } from '../components/UI';
import { Icon } from '../components/Icons';
import { usePlatformIntegration } from '../platform/PlatformIntegrationContext';
import { moduleDisplayName, type PlatformWorkflowState } from '../platform/types';
import { useBorrowerStore } from '../state/store';

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
  const { state, app, completion } = useBorrowerStore();
  const { projection, status: integrationStatus } = usePlatformIntegration();
  const docs = state.documents.filter((doc) => doc.applicationId === app.id);
  const requests = state.requests.filter((request) => request.applicationId === app.id && request.status !== 'resolved');
  const acceptedDocs = docs.filter((doc) => doc.status === 'accepted').length;
  const corePercentage = Math.round((Object.values(app.sectionCompletion).filter(Boolean).length / 5) * 100);
  const next = useMemo(() => {
    const required = docs.find((doc) => ['required', 'rejected', 'expired'].includes(doc.status));
    if (required) return { title: required.status === 'rejected' ? `Replace ${required.name}` : `Upload ${required.name}`, detail: required.dueDate ? `Due ${required.dueDate}` : 'Required for review', href: '/documents', action: required.status === 'rejected' ? 'Replace document' : 'Open documents' };
    const request = requests[0];
    if (request) return { title: request.title, detail: request.dueDate ? `Due ${request.dueDate}` : 'PiHub response requested', href: '/requests', action: 'Respond' };
    return { title: 'Review financing request', detail: 'Confirm the request before submission.', href: '/application', action: 'Open application' };
  }, [docs, requests]);
  const sharedWork = projection?.workItems.filter((item) => item.status === 'open' || item.status === 'in_progress' || item.status === 'blocked') ?? [];
  const priority = sharedWork[0]
    ? { title: sharedWork[0].title, detail: sharedWork[0].dueAt ? `Due ${new Date(sharedWork[0].dueAt).toLocaleDateString()} · ${moduleDisplayName(sharedWork[0].sourceModule)}` : `From ${moduleDisplayName(sharedWork[0].sourceModule)}`, href: sharedWork[0].actionHref || '/requests', action: 'Open request' }
    : next;

  return <div className="route-stage"><PageHead eyebrow="Borrower / Overview" title="Financing overview" subtitle="Track your active financing request, shared PiHub workflow and the next borrower-owned action." />
    <section className="priority-strip"><div className="priority-copy"><span className="priority-icon"><Icon name="activity" size={17}/></span><span><strong>{priority.title}</strong><small>{priority.detail}</small></span></div><Link className="button primary" to={priority.href}>{priority.action}</Link></section>
    <section className="kpi-grid"><Card><div className="kpi"><span>Core application</span><strong>{corePercentage}%</strong><small>Financing, company, project, financials, documents</small></div></Card><Card><div className="kpi"><span>Open requests</span><strong>{requests.length + sharedWork.length}</strong><small>Borrower conversations and shared PiHub actions</small></div></Card><Card><div className="kpi"><span>Accepted documents</span><strong>{acceptedDocs}/{docs.length}</strong><small>Current application</small></div></Card><Card><div className="kpi"><span>Requested financing</span><strong>{euro(app.financing.amount)}</strong><small>{app.financing.tenorMonths} month target tenor</small></div></Card></section>
    <div className="dashboard-grid"><ApplicationChecklist compact />
      <Card title="PiHub financing timeline" subtitle="One canonical financing case, coordinated across Borrower, Advisory, Compliance and Investor.">
        {integrationStatus === 'error' && <div className="platform-warning" role="status">Shared workflow status is temporarily unavailable. Borrower application data remains available.</div>}
        <div className="stage-list platform-timeline">{(projection?.moduleStates ?? []).map((item, index) => <div className={`stage-row ${item.state === 'completed' ? 'complete' : item.state === 'in_progress' || item.state === 'ready' || item.state === 'blocked' ? 'active' : ''}`} key={item.module}><span className="stage-dot">{item.state === 'completed' ? '✓' : index + 1}</span><span><strong>{moduleDisplayName(item.module)}</strong><small>{item.module === 'borrower' ? 'Application and borrower responses' : item.module === 'advisory' ? 'Structuring and due diligence' : item.module === 'admin' ? 'Compliance and platform controls' : 'Opportunity review and commitment'}</small></span><Status tone={moduleTone(item.state)}>{moduleStateLabel[item.state]}</Status></div>)}</div>
        {!projection && integrationStatus !== 'error' && <p className="platform-note">Shared PiHub workflow status is loading.</p>}
        {projection && <p className="platform-note">Closing, funding and servicing continue from the same application and facility records after the module workflow completes.</p>}
      </Card>
    </div>
    <Card title="Deal summary" subtitle="Borrower-provided values from the active application."><div className="summary-grid"><div><span>Application</span><strong>{app.id}</strong></div><div><span>Purpose</span><strong>{app.financing.purpose || 'Not provided'}</strong></div><div><span>Project</span><strong>{app.project.name || 'Not provided'}</strong></div><div><span>Location</span><strong>{app.project.location || 'Not provided'}</strong></div><div><span>Target funding</span><strong>{app.financing.desiredFundingDate || 'Not provided'}</strong></div><div><span>Completion</span><strong>{completion}%</strong></div></div></Card>
  </div>;
}
