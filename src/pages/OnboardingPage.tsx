import React, { useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { Icon, type IconName } from '../components/Icons';
import { Status } from '../components/UI';
import { usePlatformIntegration } from '../platform/PlatformIntegrationContext';
import type { PlatformWorkflowState } from '../platform/types';
import { useBorrowerStore } from '../state/store';

type TourStep = {
  label: string;
  title: string;
  body: string;
  icon: IconName;
  bullets: string[];
  locations: string[];
  moduleMap?: boolean;
};

const tourSteps: TourStep[] = [
  {
    label: 'Start here',
    title: 'Your Borrower control centre',
    body: 'PiHub Borrower keeps your financing work in one place. The Overview tells you what PiHub already has, what needs your attention, and the next action that moves the deal forward.',
    icon: 'home',
    bullets: [
      'Use the priority strip for the most important borrower action.',
      'Track application completion, open PiHub requests, accepted documents and requested financing at a glance.',
      'The financing timeline shows the borrower-safe state of the same deal across PiHub modules.'
    ],
    locations: ['Overview', 'Global search', 'Notifications']
  },
  {
    label: 'Find financing',
    title: 'Choose the right financing path before you apply',
    body: 'Start in Financing when you want to understand available structures and check whether the current deal is ready for them. This reduces rework before a formal application reaches PiHub.',
    icon: 'products',
    bullets: [
      'Financing products explains available structures, requirements and provider fit.',
      'Pre-qualification turns your current deal data into an explainable readiness assessment.',
      'Product-specific requirements flow into the application checklist, so the application reflects the financing structure you selected.'
    ],
    locations: ['Financing → Financing products', 'Financing → Pre-qualification']
  },
  {
    label: 'Build the application',
    title: 'Create one canonical application instead of repeating the same data',
    body: 'Applications is the working area for the deal record. Company, project, financials, documents and requests all belong to the same application ID so PiHub and connected modules stay synchronized.',
    icon: 'applications',
    bullets: [
      'Complete the financing request, company, project/property and financial sections.',
      'Use Connected data and the Data room to bring evidence into the same governed workspace.',
      'Upload documents once, respond to PiHub requests, follow messages and keep version history instead of overwriting prior submissions.'
    ],
    locations: ['Applications → Financing request', 'Company / Project / Financials', 'Documents / Requests / Messages', 'Data room / Connected data / Versions']
  },
  {
    label: 'Execute the deal',
    title: 'Move from application into negotiation, closing and capital execution',
    body: 'Execution contains the decision and closing tools used after the deal has enough information to progress. Scenario analysis remains borrower-side until you deliberately save or act on a financing decision.',
    icon: 'chart',
    bullets: [
      'Scenario lab lets you stress amount, pricing, leverage and debt service without silently changing lender terms.',
      'Negotiation and Terms & closing keep counters, accepted terms, conditions and signing actions tied to the same application.',
      'Draws & inspections and Calendar connect construction funding and deadlines to the canonical deal record.'
    ],
    locations: ['Execution → Scenario lab', 'Negotiation', 'Terms & closing', 'Draws & inspections', 'Calendar']
  },
  {
    label: 'PiHub modules',
    title: 'How Borrower, Advisory, Admin/Compliance and Investor work together',
    body: 'You do not need to jump between separate internal systems. Your Borrower action creates a controlled handoff, and each PiHub module receives only the information and authority it needs.',
    icon: 'team',
    bullets: [
      'Borrower owns application inputs, responses, documents, consent and borrower-side decisions.',
      'Advisory coordinates structuring, due diligence, requests and term progression.',
      'Admin / Compliance handles platform controls, organization verification, permissions, governance and regulated requests.',
      'Investor receives authorized opportunity information for review, commitment and relevant post-funding visibility.'
    ],
    locations: ['One application ID', 'Controlled handoffs', 'Borrower-safe status only'],
    moduleMap: true
  },
  {
    label: 'After funding',
    title: 'The workspace continues after the facility funds',
    body: 'Funding is not the end of the Borrower journey. Servicing keeps payments, reporting, covenants, draws, payoff or refinance requests and sustainability obligations connected to the funded facility.',
    icon: 'activity',
    bullets: [
      'Loan servicing shows borrower-visible facility terms, obligations and servicing requests.',
      'Portfolio gives a consolidated view when the organization has more than one facility.',
      'Payments & statements and ESG & sustainability keep ongoing evidence and reporting attached to the correct facility.'
    ],
    locations: ['Servicing → Loan servicing', 'Portfolio', 'Payments & statements', 'ESG & sustainability']
  },
  {
    label: 'Governance & help',
    title: 'Manage people, consent, privacy and support without leaving PiHub',
    body: 'Organization tools govern who can work on the deal and how information is shared. Borrower Copilot and Help provide guidance without exposing private underwriting or internal compliance notes.',
    icon: 'help',
    bullets: [
      'Organization & team manages borrower-side collaborators and external professionals.',
      'Disclosures & consent makes authorized sharing explicit and revocable.',
      'Privacy & data rights and Complaints & disputes create formal Admin/Compliance workflows.',
      'Borrower Copilot and Help explain the workspace, missing information and support options using borrower-authorized context.'
    ],
    locations: ['Organization', 'Disclosures & consent', 'Privacy & data rights', 'Complaints & disputes', 'Borrower Copilot', 'Help']
  }
];

const workflowLabels: Record<PlatformWorkflowState, string> = {
  not_started: 'Not started',
  ready: 'Ready',
  in_progress: 'In progress',
  blocked: 'Action needed',
  completed: 'Completed',
  closed: 'Closed'
};

function workflowTone(state?: PlatformWorkflowState): 'neutral' | 'info' | 'warning' | 'success' {
  if (state === 'completed' || state === 'closed') return 'success';
  if (state === 'in_progress' || state === 'ready') return 'info';
  if (state === 'blocked') return 'warning';
  return 'neutral';
}

function greetingForHour(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function OnboardingPage({ onComplete }: { onComplete: () => void }) {
  const auth = useAuth();
  const { state, app } = useBorrowerStore();
  const { projection } = usePlatformIntegration();
  const [stepIndex, setStepIndex] = useState(0);
  const step = tourSteps[stepIndex];
  const fullName = auth.user?.name?.trim() || state.profile.name;
  const firstName = fullName.split(/\s+/)[0] || 'there';
  const greeting = useMemo(() => greetingForHour(new Date().getHours()), []);
  const progress = Math.round(((stepIndex + 1) / tourSteps.length) * 100);
  const modules = [
    { id: 'borrower' as const, icon: 'account' as IconName, title: 'Borrower', role: 'Your workspace', description: 'Application inputs, documents, responses, consent and borrower decisions.' },
    { id: 'advisory' as const, icon: 'chart' as IconName, title: 'Advisory', role: 'Structuring & diligence', description: 'Coordinates financing structure, due diligence, information requests and terms.' },
    { id: 'admin' as const, icon: 'building' as IconName, title: 'Admin / Compliance', role: 'Governance & controls', description: 'Organization verification, permissions, compliance, signing, privacy and platform controls.' },
    { id: 'investor' as const, icon: 'money' as IconName, title: 'Investor', role: 'Capital review', description: 'Reviews authorized opportunity information, commitments and relevant servicing projections.' }
  ];

  const next = () => setStepIndex((current) => Math.min(current + 1, tourSteps.length - 1));
  const back = () => setStepIndex((current) => Math.max(current - 1, 0));

  return <div className="route-stage onboarding-stage" aria-label="PiHub guided onboarding">
    <header className="onboarding-header">
      <div className="onboarding-welcome">
        <span className="eyebrow">PiHub / Borrower onboarding</span>
        <h1>{greeting}, {firstName}</h1>
        <p>You are signed in as <strong>{fullName}</strong> for <strong>{state.organization.name}</strong>. This short tour explains where to work, what happens next, and how your actions connect safely to the other PiHub modules.</p>
      </div>
      <button className="button secondary" onClick={onComplete}>Skip tour</button>
    </header>

    <div className="onboarding-layout">
      <aside className="onboarding-sidebar">
        <div className="onboarding-context-card">
          <span>Current financing workspace</span>
          <strong>{app.name}</strong>
          <small>{app.id} · {app.financing.structure}</small>
        </div>
        <div className="onboarding-progress-copy"><span>Guided tour</span><strong>Step {stepIndex + 1} of {tourSteps.length}</strong></div>
        <div className="onboarding-progress" role="progressbar" aria-label="Onboarding progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><span style={{ width: `${progress}%` }}/></div>
        <nav className="onboarding-step-list" aria-label="Onboarding steps">
          {tourSteps.map((item, index) => <button key={item.label} className={index === stepIndex ? 'active' : ''} aria-current={index === stepIndex ? 'step' : undefined} onClick={() => setStepIndex(index)}><span>{index + 1}</span><strong>{item.label}</strong></button>)}
        </nav>
      </aside>

      <section className="onboarding-panel" data-onboarding-step={stepIndex + 1} aria-live="polite">
        <div className="onboarding-step-hero">
          <span className="onboarding-step-icon"><Icon name={step.icon} size={24}/></span>
          <div><span className="onboarding-step-kicker">Step {stepIndex + 1} · {step.label}</span><h2>{step.title}</h2></div>
        </div>
        <p className="onboarding-step-body">{step.body}</p>
        <ul className="onboarding-bullet-list">{step.bullets.map((bullet) => <li key={bullet}><span><Icon name="check" size={14}/></span><p>{bullet}</p></li>)}</ul>

        <div className="onboarding-locations"><span>Where you will use this</span><div>{step.locations.map((location) => <strong key={location}>{location}</strong>)}</div></div>

        {step.moduleMap && <div className="module-tour-block">
          <div className="module-flow-grid">{modules.map((module) => {
            const currentState = projection?.moduleStates.find((item) => item.module === module.id)?.state;
            return <article className="module-flow-card" key={module.id}><span className="module-flow-icon"><Icon name={module.icon} size={19}/></span><div className="module-flow-title"><div><strong>{module.title}</strong><small>{module.role}</small></div><Status tone={workflowTone(currentState)}>{currentState ? workflowLabels[currentState] : 'Connected'}</Status></div><p>{module.description}</p></article>;
          })}</div>
          <div className="handoff-list" aria-label="Cross-module handoff examples">
            <div><strong>Submit an application</strong><span>Advisory and Admin / Compliance can begin their controlled review of the same canonical deal.</span></div>
            <div><strong>Upload evidence or respond to a request</strong><span>Advisory receives the borrower response; Investor sees only information that is authorized for its deal view.</span></div>
            <div><strong>Counter or accept terms</strong><span>The decision is synchronized to the Advisory and Investor workflow instead of being re-entered in another system.</span></div>
            <div><strong>Create a privacy request or complaint</strong><span>The request is handed to Admin / Compliance while internal notes remain private.</span></div>
          </div>
          <p className="onboarding-boundary-note"><Icon name="warning" size={15}/><span>Borrower shows status and actions that are safe for you to see. Internal underwriting, investment committee and compliance notes stay inside their authorized modules.</span></p>
        </div>}

        <footer className="onboarding-footer">
          <button className="button secondary" onClick={back} disabled={stepIndex === 0}>Back</button>
          <span>{progress}% complete</span>
          {stepIndex < tourSteps.length - 1 ? <button className="button primary" onClick={next}>Next: {tourSteps[stepIndex + 1].label}<Icon name="chevron" size={14}/></button> : <button className="button primary" onClick={onComplete}>Enter my workspace<Icon name="chevron" size={14}/></button>}
        </footer>
      </section>
    </div>
  </div>;
}
