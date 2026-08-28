import React from 'react';
import { Link } from 'react-router-dom';
import { Icon } from './Icons';
import { useBorrowerStore } from '../state/store';
import { Progress, Status } from './UI';
import { workflowReadiness } from '../state/advanced';

const coreSteps = [
  ['financing', 'Financing request', '/application'],
  ['company', 'Company information', '/company'],
  ['project', 'Project / property', '/project'],
  ['financials', 'Financials', '/financials'],
  ['documents', 'Required documents', '/documents']
] as const;

export function ApplicationChecklist() {
  const { app, state } = useBorrowerStore();
  const requiredDocs = state.documents.filter((doc) => doc.applicationId === app.id && doc.required);
  const docDone = requiredDocs.length === 0 || requiredDocs.every((doc) => ['uploaded', 'under_review', 'accepted'].includes(doc.status));
  const completionMap = { ...app.sectionCompletion, documents: docDone };
  const workflow = workflowReadiness(state, app.id);
  const items = [
    ...coreSteps.map(([key, label, href]) => ({ id: key, label, href, complete: completionMap[key], detail: completionMap[key] ? 'Complete' : 'Action required' })),
    ...workflow.steps.map((step) => ({ id: step.id, label: step.label, href: step.href, complete: step.complete, detail: step.complete ? 'Product requirement complete' : step.detail }))
  ];
  const completed = items.filter((item) => item.complete).length;
  const percentage = items.length ? Math.round(completed / items.length * 100) : 100;
  const firstIncomplete = items.find((item) => !item.complete);

  return <div className="checklist">
    <div className="workflow-context"><span><strong>{workflow.profile.label}</strong><small>{workflow.profile.explanation}</small></span><Status tone={workflow.ready ? 'success' : 'warning'}>{workflow.ready ? 'Product ready' : 'Product requirements'}</Status></div>
    <div className="checklist-summary"><div><strong>{percentage}% ready</strong><span>{firstIncomplete ? `Next: ${firstIncomplete.label}` : 'Ready for submission'}</span></div><Progress value={percentage}/></div>
    <div className="checklist-steps">
      {items.map((item, index) => <Link key={item.id} to={item.href} className={`checklist-step ${item.complete ? 'complete' : ''}`}>
        <span className="step-number">{item.complete ? <Icon name="check" size={14}/> : index + 1}</span>
        <span><strong>{item.label}</strong><small>{item.detail}</small></span>
        <Status tone={item.complete ? 'success' : 'warning'}>{item.complete ? 'Complete' : 'Required'}</Status>
        <Icon name="chevron" size={15}/>
      </Link>)}
    </div>
  </div>;
}
