import React, { useMemo, useState } from 'react';
import {
  getDemoWorkflowProgress,
  getDemoWorkflowState,
  transitionDemoWorkflow,
} from '../../platform/src/demo-workflow';
import {
  buildDemoWorkflowHandoffHref,
  consumeDemoWorkflowHandoff,
  readDemoWorkflow,
  resetDemoWorkflow,
  writeDemoWorkflow,
} from '../../platform/src/demo-workflow-store';

const ownerLabel = value => ({ borrower: 'Borrower', advisory: 'Advisory', investor: 'Investor', admin: 'Admin' }[value] || 'Complete');

export default function WorkflowJourney({ applicationId, destinations = {} }) {
  const [snapshot, setSnapshot] = useState(() => consumeDemoWorkflowHandoff() || readDemoWorkflow());
  const [error, setError] = useState('');
  const progress = useMemo(() => getDemoWorkflowProgress(snapshot), [snapshot]);
  const definition = getDemoWorkflowState(progress.current.state);
  const ownsCurrentStep = definition?.owner === applicationId;
  const terminal = Boolean(definition?.terminal);

  const openWorkspace = (targetApplicationId, value = snapshot) => {
    const href = buildDemoWorkflowHandoffHref({
      origin: destinations[targetApplicationId],
      snapshot: value,
      source: applicationId,
    });
    if (!href) {
      setError(`${ownerLabel(targetApplicationId)} application origin is not configured.`);
      return;
    }
    window.location.assign(href);
  };

  const advance = event => {
    const result = transitionDemoWorkflow(snapshot, { event, actor: applicationId });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const next = writeDemoWorkflow(result.snapshot);
    setSnapshot(next);
    setError('');
    const nextDefinition = getDemoWorkflowState(next.state);
    if (nextDefinition?.owner && nextDefinition.owner !== applicationId) openWorkspace(nextDefinition.owner, next);
  };

  const restart = () => {
    const next = resetDemoWorkflow();
    setSnapshot(next);
    setError('');
  };

  return (
    <section className="ph-workflow" aria-labelledby={`${applicationId}-workflow-title`}>
      <header className="ph-workflow-head">
        <div>
          <h2 id={`${applicationId}-workflow-title`}>Cross-module deal journey</h2>
          <p>One canonical deal record from borrower request through closing and portfolio monitoring.</p>
        </div>
        <span className={`ph-status ${terminal ? 'good' : 'warn'}`}>{definition?.label || progress.current.state}</span>
      </header>

      <div className="ph-workflow-meta">
        <span>Deal {progress.current.dealId}</span>
        <span>Revision {progress.current.revision}</span>
        <span className="is-current">Owner: {ownerLabel(definition?.owner)}</span>
        <span>{progress.percent}% lifecycle progress</span>
      </div>

      <ol className="ph-workflow-track" aria-label="Deal lifecycle">
        {progress.visible.map((state, index) => (
          <li
            className={`ph-workflow-step${index < progress.index ? ' is-complete' : ''}${state.id === progress.current.state ? ' is-current' : ''}${state.terminal ? ' is-terminal' : ''}`}
            key={state.id}
            aria-current={state.id === progress.current.state ? 'step' : undefined}
          >
            <span aria-hidden="true" />
            <small title={state.label}>{state.label}</small>
          </li>
        ))}
      </ol>

      <div className="ph-workflow-action">
        <div className="ph-workflow-action-copy">
          <strong>{terminal ? `Workflow ${definition.label.toLowerCase()}` : definition.action}</strong>
          <span>{terminal ? 'The visible demo lifecycle has reached an explicit terminal state.' : ownsCurrentStep ? `This action is owned by ${ownerLabel(applicationId)}.` : `Continue in ${ownerLabel(definition.owner)} to advance the same deal.`}</span>
        </div>
        <div className="ph-workflow-buttons">
          {!terminal && ownsCurrentStep ? <button className="ph-button primary" type="button" onClick={() => advance(definition.event)}>{definition.action}</button> : null}
          {!terminal && ownsCurrentStep && definition.alternate ? <button className="ph-button" type="button" onClick={() => advance(definition.alternate.event)}>{definition.alternate.action}</button> : null}
          {!terminal && !ownsCurrentStep ? <button className="ph-button primary" type="button" onClick={() => openWorkspace(definition.owner)}>Open {ownerLabel(definition.owner)}</button> : null}
          <button className="ph-button" type="button" onClick={restart}>Restart demo journey</button>
        </div>
      </div>
      {error ? <div className="ph-workflow-error" role="alert">{error}</div> : null}
    </section>
  );
}
