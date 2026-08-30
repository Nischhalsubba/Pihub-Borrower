import React, { useEffect, useMemo } from 'react';

export interface FormWorkflowIssue { id: string; label: string; }

export function useFormDirty<T>(saved: T, draft: T): boolean {
  const dirty = useMemo(() => JSON.stringify(saved) !== JSON.stringify(draft), [saved, draft]);
  useEffect(() => {
    if (!dirty) return undefined;
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [dirty]);
  return dirty;
}

export function FormWorkflowSummary({ completion, issues, dirty, message }: { completion: number; issues: FormWorkflowIssue[]; dirty: boolean; message?: string }) {
  const focus = (id: string) => { const element = document.getElementById(id); element?.focus(); element?.scrollIntoView({ block: 'center', behavior: 'smooth' }); };
  return <section className="form-workflow-summary" aria-label="Form completion">
    <div className="form-workflow-progress">
      <span><strong>{completion}% complete</strong><small>{dirty ? 'Changes are waiting for autosave or Save.' : 'All current changes are saved.'}</small></span>
      <div className="progress" aria-label={`${completion}% complete`}><span style={{ width: `${completion}%` }} /></div>
    </div>
    {issues.length > 0 && <div className="validation-summary" role="alert"><strong>{issues.length} required {issues.length === 1 ? 'item' : 'items'} remaining</strong><div>{issues.map((issue) => <button type="button" key={issue.id} onClick={() => focus(issue.id)}>{issue.label}</button>)}</div></div>}
    {message && <div className="success-banner" role="status">{message}</div>}
  </section>;
}

export function StickyFormActions({ dirty, children }: { dirty: boolean; children: React.ReactNode }) {
  return <div className="sticky-actions form-workflow-actions"><span className={`form-save-state ${dirty ? 'is-dirty' : ''}`}><span className="save-dot" />{dirty ? 'Unsaved changes' : 'Saved'}</span>{children}</div>;
}
