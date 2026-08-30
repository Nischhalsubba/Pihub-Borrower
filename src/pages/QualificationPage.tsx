import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card, PageHead, Progress, Status, euro } from '../components/UI';
import { usePlatformIntegration } from '../platform/PlatformIntegrationContext';
import type { ComplianceReadinessState } from '../platform/types';
import { useBorrowerStore } from '../state/store';
import { products } from '../data/demo';

const complianceCopy: Record<ComplianceReadinessState, { title: string; body: string; tone: 'neutral' | 'info' | 'warning' | 'success' | 'danger' }> = {
  not_started: { title: 'Not started', body: 'No borrower-facing compliance review has started for this application.', tone: 'neutral' },
  under_review: { title: 'Under review', body: 'PiHub is reviewing the organization and application. No additional borrower action is currently shown here.', tone: 'info' },
  action_required: { title: 'Action required', body: 'PiHub needs borrower-facing information or evidence. The required action appears in the PiHub Request Center.', tone: 'warning' },
  cleared: { title: 'Cleared', body: 'Current borrower-facing compliance requirements are cleared for this stage of the financing process.', tone: 'success' },
  blocked: { title: 'Progress blocked', body: 'A borrower-facing compliance requirement must be resolved before the financing process can continue.', tone: 'danger' }
};

export function QualificationPage() {
  const { state, app, feature } = useBorrowerStore();
  const { projection } = usePlatformIntegration();
  const latest = state.advanced.prequalification.find((item)=>item.applicationId===app.id);
  const matches = state.advanced.matches;
  const workflow = useMemo(() => state.advanced.workflowProfiles.find((profile)=>profile.productIds.includes(app.financing.productId ?? '')) ?? state.advanced.workflowProfiles.find((profile)=>profile.kind==='corporate')!, [app.financing.productId, state.advanced.workflowProfiles]);
  const compliance = complianceCopy[projection?.compliance.state ?? 'not_started'];
  return <div className="route-stage"><PageHead eyebrow="Borrower / Qualification" title="Pre-qualification & financing fit" subtitle="Explainable fit guidance before a borrower invests time in a full process. It surfaces data gaps without exposing confidential lender scoring or internal credit rules." action={<button className="button primary" onClick={()=>feature({type:'prequalify',applicationId:app.id})}>Refresh assessment</button>}/>
    <Card title="Compliance readiness" subtitle="Borrower-safe status from the shared Admin / Compliance workflow. Internal notes, provider evidence and risk reasoning are deliberately not exposed."><div className="workflow-readiness-strip"><Status tone={compliance.tone}>{compliance.title}</Status><span>{compliance.body}</span>{projection?.compliance.openCount ? <Link className="button secondary" to="/requests">Open Request Center</Link> : null}</div></Card>
    <div className="qualification-layout">
      <Card title="Current assessment" subtitle={latest?`Generated ${new Date(latest.createdAt).toLocaleString()}`:'Run the assessment using the current application data.'}>
        {!latest?<div className="empty-state compact"><strong>No assessment yet</strong><p>Use Refresh assessment to calculate application readiness and financing-product fit from the data already provided.</p></div>:<><div className="qualification-score"><strong>{latest.score}</strong><span>/100</span><Status tone={latest.score>=80?'success':latest.score>=60?'info':latest.score>=40?'warning':'danger'}>{latest.band.replaceAll('_',' ')}</Status></div><Progress value={latest.score} label="Pre-qualification readiness"/><div className="qualification-columns"><div><h3>Why it fits</h3>{latest.reasons.length?latest.reasons.map((reason)=><p className="check-line" key={reason}>✓ {reason}</p>):<p>No positive criteria recorded yet.</p>}</div><div><h3>What to complete</h3>{[...latest.blockers,...latest.nextActions].length?[...latest.blockers,...latest.nextActions].map((item)=><p className="attention-line" key={item}>• {item}</p>):<p>No immediate gaps.</p>}</div></div></>}
      </Card>
      <Card title="Product-aware workflow" subtitle={workflow.explanation}><div className="workflow-profile"><div className="workflow-profile-head"><span><small>Selected workflow</small><strong>{workflow.label}</strong></span><Status tone="info">{workflow.kind.replace('_',' ')}</Status></div><div><h3>Required workspaces</h3><div className="chip-cloud">{workflow.requiredSections.map((item)=><span className="tag" key={item}>{item}</span>)}</div></div><div><h3>Typical document categories</h3><div className="chip-cloud">{workflow.requiredDocumentCategories.map((item)=><span className="tag" key={item}>{item}</span>)}</div></div><div><h3>Lifecycle</h3><div className="workflow-mini-rail">{workflow.milestoneLabels.map((label,index)=><div key={label}><span>{index+1}</span><strong>{label}</strong></div>)}</div></div><div><h3>Post-close modules</h3><div className="chip-cloud">{workflow.servicingModules.map((item)=><span className="tag" key={item}>{item}</span>)}</div></div></div></Card>
    </div>

    <Card title="Explainable matches" subtitle="Indicative product fit based on amount, tenor, asset class and leverage. Final lender appetite remains a PiHub/financing-provider decision.">
      {matches.length===0?<div className="empty-state compact"><strong>No product matching run yet</strong><p>Refresh the assessment to compare the application against the current demo financing catalogue.</p></div>:<div className="match-grid">{matches.map((match)=>{const product=products.find((p)=>p.id===match.productId);if(!product)return null;return <article className="match-card" key={match.productId}><div className="match-head"><span><small>{product.badge}</small><strong>{product.title}</strong></span><div className="match-score"><strong>{match.score}%</strong><Status tone={match.fit==='strong'?'success':match.fit==='possible'?'info':'warning'}>{match.fit}</Status></div></div><p>{product.provider}</p><dl><div><dt>Range</dt><dd>{euro(product.amountMin)}–{euro(product.amountMax)}</dd></div><div><dt>Tenor</dt><dd>{product.tenorMin}–{product.tenorMax} months</dd></div><div><dt>Max LTV</dt><dd>{product.ltvMax}%</dd></div></dl><div className="match-reasons">{match.reasons.slice(0,3).map((reason)=><span key={reason}>✓ {reason}</span>)}{match.gaps.slice(0,2).map((gap)=><span className="gap" key={gap}>! {gap}</span>)}</div><Link className="button secondary" to={`/products/${product.id}`}>Open product</Link></article>})}</div>}
    </Card>
  </div>;
}
