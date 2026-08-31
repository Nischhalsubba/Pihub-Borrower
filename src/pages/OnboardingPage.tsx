import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Icon, type IconName } from '../components/Icons';
import { usePlatformIntegration } from '../platform/PlatformIntegrationContext';
import type { PlatformWorkflowState } from '../platform/types';
import { useBorrowerStore } from '../state/store';

type Placement = 'auto' | 'right' | 'bottom' | 'left' | 'top';
type ResolvedPlacement = Exclude<Placement, 'auto'>;

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

type CalloutGeometry = {
  style: React.CSSProperties;
  placement: ResolvedPlacement;
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

function calloutGeometry(rect: SpotlightRect | null, preferred: Placement = 'auto'): CalloutGeometry {
  if (typeof window === 'undefined') return { style: {}, placement: 'bottom' };
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const edge = 16;
  const gap = 30;
  const width = Math.min(330, viewportWidth - edge * 2);
  const estimatedHeight = 285;

  if (!rect || viewportWidth < 760) {
    return { style: { left: edge, right: edge, bottom: edge, width: 'auto' }, placement: 'bottom' };
  }

  const clampTop = (value: number) => Math.max(edge, Math.min(value, viewportHeight - estimatedHeight - edge));
  const clampLeft = (value: number) => Math.max(edge, Math.min(value, viewportWidth - width - edge));
  const rightFits = rect.right + gap + width <= viewportWidth - edge;
  const leftFits = rect.left - gap - width >= edge;
  const bottomFits = rect.bottom + gap + estimatedHeight <= viewportHeight - edge;
  const topFits = rect.top - gap - estimatedHeight >= edge;

  const right = (): CalloutGeometry => ({ style: { width, left: rect.right + gap, top: clampTop(rect.top + rect.height / 2 - estimatedHeight / 2) }, placement: 'right' });
  const left = (): CalloutGeometry => ({ style: { width, left: rect.left - gap - width, top: clampTop(rect.top + rect.height / 2 - estimatedHeight / 2) }, placement: 'left' });
  const bottom = (): CalloutGeometry => ({ style: { width, left: clampLeft(rect.left + rect.width / 2 - width / 2), top: rect.bottom + gap }, placement: 'bottom' });
  const top = (): CalloutGeometry => ({ style: { width, left: clampLeft(rect.left + rect.width / 2 - width / 2), top: rect.top - gap - estimatedHeight }, placement: 'top' });

  if (preferred === 'right' && rightFits) return right();
  if (preferred === 'left' && leftFits) return left();
  if (preferred === 'bottom' && bottomFits) return bottom();
  if (preferred === 'top' && topFits) return top();
  if (rightFits) return right();
  if (leftFits) return left();
  if (bottomFits) return bottom();
  if (topFits) return top();
  return { style: { width, right: edge, top: edge }, placement: 'right' };
}

function connectorPath(target: SpotlightRect | null, callout: DOMRect | null, placement: ResolvedPlacement): string {
  if (!target || !callout || typeof window === 'undefined' || window.innerWidth < 760) return '';
  const tx = target.left + target.width / 2;
  const ty = target.top + target.height / 2;
  let sx = callout.left + callout.width / 2;
  let sy = callout.top + callout.height / 2;
  let ex = tx;
  let ey = ty;

  if (placement === 'right') {
    sx = callout.left;
    sy = Math.max(callout.top + 18, Math.min(ty, callout.bottom - 18));
    ex = target.right;
  } else if (placement === 'left') {
    sx = callout.right;
    sy = Math.max(callout.top + 18, Math.min(ty, callout.bottom - 18));
    ex = target.left;
  } else if (placement === 'bottom') {
    sx = Math.max(callout.left + 18, Math.min(tx, callout.right - 18));
    sy = callout.top;
    ey = target.bottom;
  } else {
    sx = Math.max(callout.left + 18, Math.min(tx, callout.right - 18));
    sy = callout.bottom;
    ey = target.top;
  }

  if (placement === 'left' || placement === 'right') {
    const midX = (sx + ex) / 2;
    return `M ${sx} ${sy} C ${midX} ${sy}, ${midX} ${ey}, ${ex} ${ey}`;
  }
  const midY = (sy + ey) / 2;
  return `M ${sx} ${sy} C ${sx} ${midY}, ${ex} ${midY}, ${ex} ${ey}`;
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
  const [calloutRect, setCalloutRect] = useState<DOMRect | null>(null);
  const fullName = auth.user?.name?.trim() || state.profile.name;
  const firstName = fullName.split(/\s+/)[0] || 'there';
  const greeting = useMemo(() => greetingForHour(new Date().getHours()), []);

  const steps = useMemo<TourStep[]>(() => [
    {
      label: 'Welcome',
      title: `${greeting}, ${firstName}`,
      body: `You are signed in as ${fullName} for ${state.organization.name}. This walkthrough stays on the real PiHub workspace and points directly at the controls you are learning.`,
      bullets: [`Current financing workspace: ${app.name}`, 'Nothing in this walkthrough changes your application or deal data.'],
      route: '/',
      selectors: ['.account-button'],
      icon: 'account',
      placement: 'bottom'
    },
    {
      label: 'Navigate',
      title: 'Use the workspace navigation as your map',
      body: 'The left navigation follows the borrower journey instead of internal PiHub teams.',
      bullets: ['Overview shows the next action.', 'Financing, Applications, Execution, Servicing and Organization follow the deal from discovery through post-funding management.'],
      route: '/',
      selectors: ['#borrower-navigation', '.mobile-menu'],
      icon: 'menu',
      placement: 'right'
    },
    {
      label: 'Next action',
      title: 'Start with the one thing that moves the deal forward',
      body: 'The priority strip turns the underlying workflow state into one borrower action.',
      bullets: ['Open this action before browsing the rest of the dashboard.', 'The KPI cards provide context, while this strip tells you what to do next.'],
      route: '/',
      selectors: ['.priority-strip'],
      icon: 'activity',
      placement: 'bottom'
    },
    {
      label: 'Financing',
      title: 'Choose the financing path before building the full application',
      body: 'Products explain financing structures and requirements. Pre-qualification checks readiness against the deal information already in PiHub.',
      bullets: ['Product requirements feed the application checklist.', 'Readiness should explain why the deal is or is not ready.'],
      route: '/products',
      selectors: ['.workspace-context-shell', '.page-head'],
      icon: 'products',
      placement: 'bottom'
    },
    {
      label: 'Applications',
      title: 'One application is the canonical borrower record',
      body: 'Your financing request, company, project, financials, documents, requests and messages stay tied to one application ID.',
      bullets: ['Use the section navigation without losing application context.', 'Version history preserves prior submitted states.'],
      route: '/application',
      selectors: ['.workspace-context-shell', '.page-head'],
      icon: 'applications',
      placement: 'bottom'
    },
    {
      label: 'Execution',
      title: 'Move from analysis into negotiation and closing',
      body: 'Execution contains scenario analysis, negotiation, terms, closing, construction draws and calendar actions on the same deal.',
      bullets: ['Scenario changes remain borrower-side until deliberately saved or acted on.', 'Accepted terms and closing actions become controlled cross-module events.'],
      route: '/scenario-lab',
      selectors: ['.workspace-context-shell', '.page-head'],
      icon: 'chart',
      placement: 'bottom'
    },
    {
      label: 'PiHub modules',
      title: 'This is how the other PiHub modules connect to your deal',
      body: 'The financing timeline is the borrower-safe view of one shared deal. You do not re-enter the application in Advisory, Admin/Compliance or Investor.',
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
      body: 'Servicing becomes the borrower home for facility terms, payments, statements, reporting, covenants, draws and payoff or refinance requests.',
      bullets: ['Portfolio consolidates multiple facilities.', 'Ongoing evidence remains attached to the funded facility and organization record.'],
      route: '/servicing',
      selectors: ['.workspace-context-shell', '.page-head'],
      icon: 'activity',
      placement: 'bottom'
    },
    {
      label: 'Organization',
      title: 'People, consent and governance are part of the workflow',
      body: 'Organization controls who can work on the deal and how borrower information may be shared.',
      bullets: ['Manage borrower-side collaborators and external professionals here.', 'Privacy requests and complaints create formal Admin/Compliance handoffs.'],
      route: '/team',
      selectors: ['.workspace-context-shell', '.page-head'],
      icon: 'team',
      placement: 'bottom'
    },
    {
      label: 'Workspace tools',
      title: 'Search, notifications and your account stay available everywhere',
      body: 'The top bar is global. Search jumps to pages and records, notifications surface work, and the account menu exposes user controls.',
      bullets: ['Use global search instead of hunting through sections.', 'Notifications point you back to the canonical request or application record.'],
      route: '/',
      selectors: ['.topbar-actions', '.notification-button'],
      icon: 'search',
      placement: 'bottom'
    },
    {
      label: 'Help & Copilot',
      title: 'Guidance is always available, and this tour can be replayed',
      body: 'Borrower Copilot explains the workspace using borrower-authorized context. Help contains support guidance and the control to replay this walkthrough.',
      bullets: ['Copilot must not expose private underwriting or internal compliance notes.', 'Open guided tour from Help whenever somebody new joins the team.'],
      route: '/help',
      selectors: ['.help-tour-card', '.page-head'],
      icon: 'help',
      placement: 'top'
    }
  ], [app.name, firstName, fullName, greeting, state.organization.name]);

  const step = steps[stepIndex];
  const progress = Math.round(((stepIndex + 1) / steps.length) * 100);
  const geometry = calloutGeometry(targetRect, step.placement);
  const path = connectorPath(targetRect, calloutRect, geometry.placement);

  useEffect(() => {
    if (location.pathname !== step.route) {
      setTargetRect(null);
      setCalloutRect(null);
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

  useLayoutEffect(() => {
    const node = cardRef.current;
    if (!node) return;
    let frame = 0;
    const measure = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => setCalloutRect(node.getBoundingClientRect()));
    };
    measure();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    observer?.observe(node);
    window.addEventListener('resize', measure);
    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [geometry.placement, location.pathname, stepIndex, targetRect]);

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

    {path && <svg className="product-tour-connector" aria-hidden="true" viewBox={`0 0 ${window.innerWidth} ${window.innerHeight}`} preserveAspectRatio="none">
      <defs><marker id="product-tour-arrowhead" markerWidth="8" markerHeight="8" refX="6.5" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></marker></defs>
      <path className="product-tour-connector-halo" d={path}/>
      <path className="product-tour-connector-line" d={path} markerEnd="url(#product-tour-arrowhead)"/>
    </svg>}

    <button type="button" className="product-tour-exit" onClick={onComplete} aria-label="Skip guided tour"><Icon name="x" size={25}/></button>

    <div ref={cardRef} className="product-tour-card product-tour-annotation" data-placement={geometry.placement} style={geometry.style} role="dialog" aria-modal="true" aria-labelledby="product-tour-title" tabIndex={-1}>
      <div className="product-tour-card-head">
        <span className="product-tour-icon"><Icon name={step.icon} size={17}/></span>
        <div><span>{step.label}</span><small>Step {stepIndex + 1} of {steps.length}</small></div>
      </div>
      <div className="product-tour-progress" role="progressbar" aria-label="Guided tour progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><span style={{ width: `${progress}%` }}/></div>
      <h2 id="product-tour-title">{step.title}</h2>
      <p className="product-tour-body">{step.body}</p>
      <ul className="product-tour-points">{step.bullets.map((bullet) => <li key={bullet}><Icon name="check" size={12}/><span>{bullet}</span></li>)}</ul>

      {step.moduleFlow && <div className="product-tour-module-flow" aria-label="PiHub module handoff flow">{modules.map((module, index) => {
        const stateItem = projection?.moduleStates.find((item) => item.module === module.id);
        return <div className="product-tour-module-row" key={module.id}><span>{index + 1}</span><div><strong>{module.label}</strong><small>{module.detail}</small></div><em>{stateItem ? workflowLabels[stateItem.state] : 'Connected'}</em></div>;
      })}</div>}

      <div className="product-tour-actions">
        <button type="button" className="button secondary" onClick={back} disabled={stepIndex === 0}>Back</button>
        <button type="button" className="product-tour-skip" onClick={onComplete}>Skip tour</button>
        <button type="button" className="button primary" onClick={next}>{stepIndex === steps.length - 1 ? 'Finish tour' : `Next: ${steps[stepIndex + 1].label}`}<Icon name="chevron" size={12}/></button>
      </div>
    </div>
  </div>;
}
