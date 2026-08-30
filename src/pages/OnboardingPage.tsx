import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Icon, type IconName } from '../components/Icons';
import { usePlatformIntegration } from '../platform/PlatformIntegrationContext';
import type { PlatformWorkflowState } from '../platform/types';
import { useBorrowerStore } from '../state/store';

type Placement = 'auto' | 'right' | 'bottom' | 'left' | 'top';

type TourStep = {
  label: string;
  title: string;
  body: string;
  bullets: string[];
  route: string;
  selectors: string[];
  icon: IconName;
  placement?: Placement;
  moduleFlow?: boolean;
};

type SpotlightRect = {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

const workflowLabels: Record<PlatformWorkflowState, string> = {
  not_started: 'Not started',
  ready: 'Ready',
  in_progress: 'In progress',
  blocked: 'Action needed',
  completed: 'Completed',
  closed: 'Closed'
};

function greetingForHour(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function visibleTarget(selectors: string[]): HTMLElement | null {
  for (const selector of selectors) {
    const elements = Array.from(document.querySelectorAll<HTMLElement>(selector));
    const target = elements.find((element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    });
    if (target) return target;
  }
  return null;
}

function paddedRect(rect: DOMRect): SpotlightRect {
  const padding = window.innerWidth < 700 ? 6 : 9;
  const left = Math.max(8, rect.left - padding);
  const top = Math.max(8, rect.top - padding);
  const right = Math.min(window.innerWidth - 8, rect.right + padding);
  const bottom = Math.min(window.innerHeight - 8, rect.bottom + padding);
  return { top, left, right, bottom, width: Math.max(0, right - left), height: Math.max(0, bottom - top) };
}

function tooltipStyle(rect: SpotlightRect | null, placement: Placement = 'auto'): React.CSSProperties {
  if (typeof window === 'undefined') return {};
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const edge = 16;
  const gap = 18;
  const width = Math.min(410, viewportWidth - edge * 2);
  const estimatedHeight = 390;

  if (!rect || viewportWidth < 760) return { left: edge, right: edge, bottom: edge, width: 'auto' };

  const clampTop = (value: number) => Math.max(edge, Math.min(value, viewportHeight - estimatedHeight - edge));
  const clampLeft = (value: number) => Math.max(edge, Math.min(value, viewportWidth - width - edge));
  const rightFits = rect.right + gap + width <= viewportWidth - edge;
  const leftFits = rect.left - gap - width >= edge;
  const bottomFits = rect.bottom + gap + estimatedHeight <= viewportHeight - edge;
  const topFits = rect.top - gap - estimatedHeight >= edge;

  if (placement === 'right' && rightFits) return { width, left: rect.right + gap, top: clampTop(rect.top) };
  if (placement === 'left' && leftFits) return { width, left: rect.left - gap - width, top: clampTop(rect.top) };
  if (placement === 'bottom' && bottomFits) return { width, left: clampLeft(rect.left + rect.width / 2 - width / 2), top: rect.bottom + gap };
  if (placement === 'top' && topFits) return { width, left: clampLeft(rect.left + rect.width / 2 - width / 2), top: rect.top - gap - estimatedHeight };
  if (rightFits) return { width, left: rect.right + gap, top: clampTop(rect.top) };
  if (leftFits) return { width, left: rect.left - gap - width, top: clampTop(rect.top) };
  if (bottomFits) return { width, left: clampLeft(rect.left + rect.width / 2 - width / 2), top: rect.bottom + gap };
  if (topFits) return { width, left: clampLeft(rect.left + rect.width / 2 - width / 2), top: rect.top - gap - estimatedHeight };
  return { width, left: viewportWidth - width - edge, top: edge };
}

export function BorrowerProductTour({ onComplete }: { onComplete: () => void }) {
  const auth = useAuth();
  const { state, app } = useBorrowerStore();
  const { projection } = usePlatformIntegration();
  const location = useLocation();
  const navigate = useNavigate();
  const cardRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLElement | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<SpotlightRect | null>(null);
  const fullName = auth.user?.name?.trim() || state.profile.name;
  const firstName = fullName.split(/\s+/)[0] || 'there';
  const greeting = useMemo(() => greetingForHour(new Date().getHours()), []);

  const steps = useMemo<TourStep[]>(() => [
    {
      label: 'Welcome',
      title: `${greeting}, ${firstName}`,
      body: `You are signed in as ${fullName} for ${state.organization.name}. This tour stays on top of the real PiHub workspace, highlights exactly what matters, and moves between pages as the workflow changes.`,
      bullets: [`Current financing workspace: ${app.name}`, 'Nothing in this tour changes your application or deal data.'],
      route: '/',
      selectors: ['.account-button'],
      icon: 'account',
      placement: 'bottom'
    },
    {
      label: 'Navigate',
      title: 'Use the workspace navigation as your map',
      body: 'The left navigation is organized by the borrower journey rather than by internal PiHub teams. Each section opens the tools needed for that stage of the financing lifecycle.',
      bullets: ['Overview shows the next action.', 'Financing, Applications, Execution, Servicing and Organization follow the deal from discovery through post-funding management.'],
      route: '/',
      selectors: ['#borrower-navigation', '.mobile-menu'],
      icon: 'menu',
      placement: 'right'
    },
    {
      label: 'Next action',
      title: 'Start with the one thing that moves the deal forward',
      body: 'The priority strip turns all of the underlying workflow state into one borrower action. It may point to a PiHub request, an approval blocker, a missing section or submission readiness.',
      bullets: ['Open the highlighted action before browsing the rest of the dashboard.', 'The KPI cards below it give context, but this strip tells you what to do next.'],
      route: '/',
      selectors: ['.priority-strip'],
      icon: 'activity',
      placement: 'bottom'
    },
    {
      label: 'Financing',
      title: 'Choose the financing path before building the full application',
      body: 'PiHub takes you to the real Financing workspace here. Use products to understand structures and requirements, then use pre-qualification to check readiness against the deal data you already have.',
      bullets: ['Product requirements feed the application checklist.', 'Pre-qualification should explain why the deal is or is not ready rather than returning a mysterious score.'],
      route: '/products',
      selectors: ['.workspace-context-shell', '.page-head'],
      icon: 'products',
      placement: 'bottom'
    },
    {
      label: 'Applications',
      title: 'One application is the canonical borrower record',
      body: 'Applications keeps the financing request, company, project, financials, connected data, documents, requests and messages tied to one application ID instead of forcing you to repeat the same information in separate systems.',
      bullets: ['Use the section navigation to move through the application without losing context.', 'Version history preserves prior submitted states instead of silently overwriting them.'],
      route: '/application',
      selectors: ['.workspace-context-shell', '.page-head'],
      icon: 'applications',
      placement: 'bottom'
    },
    {
      label: 'Execution',
      title: 'Move from analysis into negotiation and closing',
      body: 'Execution contains scenario analysis, negotiation, terms and closing, construction draws and calendar actions. PiHub keeps these decisions attached to the same deal rather than creating disconnected spreadsheets and message threads.',
      bullets: ['Scenario changes remain borrower-side until you deliberately save or act on them.', 'Accepted terms and closing actions become controlled cross-module events.'],
      route: '/scenario-lab',
      selectors: ['.workspace-context-shell', '.page-head'],
      icon: 'chart',
      placement: 'bottom'
    },
    {
      label: 'PiHub modules',
      title: 'This is how the other PiHub modules connect to your deal',
      body: 'The financing timeline is the borrower-safe projection of one shared deal. Your actions create controlled handoffs; you do not need to re-enter the application in Advisory, Admin/Compliance or Investor.',
      bullets: ['Borrower owns inputs, documents, responses, consent and borrower decisions.', 'Internal underwriting, investment committee and compliance notes remain private even though the workflow state is synchronized.'],
      route: '/',
      selectors: ['.overview-timeline-card'],
      icon: 'team',
      placement: 'left',
      moduleFlow: true
    },
    {
      label: 'Servicing',
      title: 'PiHub continues after funding',
      body: 'Once a facility is funded, Servicing becomes the home for borrower-visible facility terms, payments, statements, reporting, covenants, draws, refinance or payoff requests and sustainability obligations.',
      bullets: ['Portfolio consolidates multiple facilities.', 'Ongoing evidence remains attached to the funded facility and canonical organization record.'],
      route: '/servicing',
      selectors: ['.workspace-context-shell', '.page-head'],
      icon: 'activity',
      placement: 'bottom'
    },
    {
      label: 'Organization',
      title: 'People, consent and governance are part of the workflow',
      body: 'Organization controls who can work on the deal and how information may be shared. Privacy requests and complaints create formal Admin/Compliance handoffs rather than disappearing into an inbox.',
      bullets: ['Manage borrower-side collaborators and external professionals here.', 'Disclosures and consent make authorized sharing explicit and revocable.'],
      route: '/team',
      selectors: ['.workspace-context-shell', '.page-head'],
      icon: 'team',
      placement: 'bottom'
    },
    {
      label: 'Workspace tools',
      title: 'Search, notifications and your account stay available everywhere',
      body: 'The top bar is global. Search can jump to pages and borrower records, notifications surface work that needs attention, and the account menu gives quick access to organization, privacy and sign-out controls.',
      bullets: ['Use global search instead of manually hunting through sections.', 'Notifications are borrower-facing signals, not a substitute for the canonical request or application record.'],
      route: '/',
      selectors: ['.topbar-actions', '.notification-button'],
      icon: 'search',
      placement: 'bottom'
    },
    {
      label: 'Help & Copilot',
      title: 'Guidance is always available, and this tour can be replayed',
      body: 'Borrower Copilot can explain the workspace using borrower-authorized context. Help contains plain-language guidance, support requests and the control to replay this walkthrough whenever somebody new joins the team.',
      bullets: ['Copilot must not expose private underwriting or internal compliance notes.', 'Open guided tour from Help whenever you want this same spotlight walkthrough again.'],
      route: '/help',
      selectors: ['.help-tour-card', '.page-head'],
      icon: 'help',
      placement: 'top'
    }
  ], [app.name, firstName, fullName, greeting, state.organization.name]);

  const step = steps[stepIndex];
  const progress = Math.round(((stepIndex + 1) / steps.length) * 100);

  useEffect(() => {
    if (location.pathname !== step.route) {
      setTargetRect(null);
      navigate(step.route, { replace: true });
      return;
    }

    let cancelled = false;
    let locateTimer = 0;
    let measureTimer = 0;
    let attempts = 0;
    let scrolled = false;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const measure = () => {
      if (cancelled || !targetRef.current) return;
      setTargetRect(paddedRect(targetRef.current.getBoundingClientRect()));
    };

    const locate = () => {
      if (cancelled) return;
      const target = visibleTarget(step.selectors);
      if (!target) {
        attempts += 1;
        if (attempts < 60) locateTimer = window.setTimeout(locate, 50);
        return;
      }
      targetRef.current = target;
      if (!scrolled) {
        scrolled = true;
        target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: reducedMotion ? 'auto' : 'smooth' });
        measureTimer = window.setTimeout(measure, reducedMotion ? 0 : 260);
      } else {
        measure();
      }
    };

    const refresh = () => measure();
    locateTimer = window.setTimeout(locate, 0);
    window.addEventListener('resize', refresh);
    window.addEventListener('scroll', refresh, true);
    return () => {
      cancelled = true;
      targetRef.current = null;
      window.clearTimeout(locateTimer);
      window.clearTimeout(measureTimer);
      window.removeEventListener('resize', refresh);
      window.removeEventListener('scroll', refresh, true);
    };
  }, [location.pathname, navigate, step.route, step.selectors]);

  useEffect(() => {
    cardRef.current?.focus({ preventScroll: true });
  }, [stepIndex, location.pathname]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onComplete();
      if (event.key === 'ArrowLeft' && stepIndex > 0) setStepIndex((current) => current - 1);
      if (event.key === 'ArrowRight' && stepIndex < steps.length - 1) setStepIndex((current) => current + 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onComplete, stepIndex, steps.length]);

  const next = () => {
    if (stepIndex === steps.length - 1) onComplete();
    else setStepIndex((current) => current + 1);
  };
  const back = () => setStepIndex((current) => Math.max(0, current - 1));
  const style = tooltipStyle(targetRect, step.placement);
  const modules = [
    { id: 'borrower' as const, label: 'Borrower', detail: 'Inputs & decisions' },
    { id: 'advisory' as const, label: 'Advisory', detail: 'Structuring & diligence' },
    { id: 'admin' as const, label: 'Admin / Compliance', detail: 'Governance & controls' },
    { id: 'investor' as const, label: 'Investor', detail: 'Capital review' }
  ];

  return <div className="product-tour" aria-label="PiHub guided tour">
    {targetRect ? <>
      <div className="product-tour-mask" aria-hidden="true" style={{ top: 0, left: 0, right: 0, height: targetRect.top }}/>
      <div className="product-tour-mask" aria-hidden="true" style={{ top: targetRect.top, left: 0, width: targetRect.left, height: targetRect.height }}/>
      <div className="product-tour-mask" aria-hidden="true" style={{ top: targetRect.top, left: targetRect.right, right: 0, height: targetRect.height }}/>
      <div className="product-tour-mask" aria-hidden="true" style={{ top: targetRect.bottom, left: 0, right: 0, bottom: 0 }}/>
      <div className="product-tour-spotlight" aria-hidden="true" style={{ top: targetRect.top, left: targetRect.left, width: targetRect.width, height: targetRect.height }}/>
    </> : <div className="product-tour-mask product-tour-mask-full" aria-hidden="true"/>}

    <div ref={cardRef} className="product-tour-card" style={style} role="dialog" aria-modal="true" aria-labelledby="product-tour-title" tabIndex={-1}>
      <div className="product-tour-card-head">
        <span className="product-tour-icon"><Icon name={step.icon} size={19}/></span>
        <div><span>{step.label}</span><small>Step {stepIndex + 1} of {steps.length}</small></div>
        <button type="button" className="product-tour-close" onClick={onComplete} aria-label="Skip guided tour">×</button>
      </div>
      <div className="product-tour-progress" role="progressbar" aria-label="Guided tour progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><span style={{ width: `${progress}%` }}/></div>
      <h2 id="product-tour-title">{step.title}</h2>
      <p className="product-tour-body">{step.body}</p>
      <ul className="product-tour-points">{step.bullets.map((bullet) => <li key={bullet}><Icon name="check" size={13}/><span>{bullet}</span></li>)}</ul>

      {step.moduleFlow && <div className="product-tour-module-flow" aria-label="PiHub module handoff flow">{modules.map((module, index) => {
        const stateItem = projection?.moduleStates.find((item) => item.module === module.id);
        return <div className="product-tour-module-row" key={module.id}><span>{index + 1}</span><div><strong>{module.label}</strong><small>{module.detail}</small></div><em>{stateItem ? workflowLabels[stateItem.state] : 'Connected'}</em></div>;
      })}</div>}

      <div className="product-tour-actions">
        <button type="button" className="button secondary" onClick={back} disabled={stepIndex === 0}>Back</button>
        <button type="button" className="product-tour-skip" onClick={onComplete}>Skip tour</button>
        <button type="button" className="button primary" onClick={next}>{stepIndex === steps.length - 1 ? 'Finish tour' : `Next: ${steps[stepIndex + 1].label}`}<Icon name="chevron" size={13}/></button>
      </div>
    </div>
  </div>;
}

export const OnboardingPage = BorrowerProductTour;
