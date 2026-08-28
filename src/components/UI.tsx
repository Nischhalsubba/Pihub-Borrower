import React from 'react';
import { Icon } from './Icons';

export function PageHead({ eyebrow, title, subtitle, action }: { eyebrow?: string; title: string; subtitle: string; action?: React.ReactNode }) {
  return <header className="page-head">
    <div><div className="eyebrow">{eyebrow}</div><h1 tabIndex={-1}>{title}</h1><p>{subtitle}</p></div>
    {action && <div className="page-head-action">{action}</div>}
  </header>;
}

export function Card({ title, subtitle, action, children, className = '' }: { title?: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return <section className={`card ${className}`}>
    {(title || subtitle || action) && <div className="card-head"><div>{title && <h2>{title}</h2>}{subtitle && <p>{subtitle}</p>}</div>{action}</div>}
    {children}
  </section>;
}

export function Status({ tone = 'neutral', children }: { tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info'; children: React.ReactNode }) {
  return <span className={`status status-${tone}`}>{children}</span>;
}

export function Progress({ value, label }: { value: number; label?: string }) {
  return <div className="progress-wrap" aria-label={label ?? `Completion ${value}%`}><div className="progress"><span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>{label && <small>{label}</small>}</div>;
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return <div className="empty-state"><div className="empty-icon"><Icon name="document" /></div><strong>{title}</strong><p>{body}</p>{action}</div>;
}

export function Field({ label, error, helper, children }: { label: string; error?: string; helper?: string; children: React.ReactNode }) {
  return <label className={`field ${error ? 'field-error' : ''}`}><span className="field-label">{label}</span>{children}{error ? <span className="field-message" role="alert">{error}</span> : helper ? <span className="field-helper">{helper}</span> : null}</label>;
}

export const euro = (value: number) => new Intl.NumberFormat('en-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
