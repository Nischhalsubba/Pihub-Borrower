import React, { Children, cloneElement, isValidElement, useId } from 'react';

export const PageHead = ({ eyebrow, title, subtitle, action }) => (
  <div className="ph-page-head">
    <div>
      {eyebrow ? <div className="ph-eyebrow">{eyebrow}</div> : null}
      <h1 className="ph-title">{title}</h1>
      {subtitle ? <p className="ph-subtitle">{subtitle}</p> : null}
    </div>
    {action || null}
  </div>
);

export const Card = ({ title, children, className = '', labelledBy, action }) => {
  const headingId = useId();
  const id = labelledBy || headingId;
  return (
    <section className={`ph-card ${className}`.trim()} aria-labelledby={title ? id : undefined}>
      {title || action ? (
        <div className="ph-card-head">
          <div className="ph-card-head-copy">
            {title ? <h2 id={id}>{title}</h2> : null}
          </div>
          {action ? <div className="ph-card-head-action">{action}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
};

export const Metric = ({ value, label, detail }) => (
  <div className="ph-card ph-metric-card">
    <div className="ph-metric">{value}</div>
    <div className="ph-metric-label">{label}</div>
    {detail ? <div className="ph-kpi-detail">{detail}</div> : null}
  </div>
);

export const Status = ({ children, tone = '' }) => (
  <span className={`ph-status ${tone}`.trim()}>{children}</span>
);

const slug = value => String(value || 'field')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

export const Field = ({ label, children, hint, error }) => {
  const generated = useId();
  const child = Children.only(children);
  const id = isValidElement(child) && child.props.id
    ? child.props.id
    : `${slug(label)}-${String(generated).replace(/:/g, '')}`;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [child.props?.['aria-describedby'], hintId, errorId].filter(Boolean).join(' ') || undefined;
  const control = isValidElement(child)
    ? cloneElement(child, {
      id,
      'aria-describedby': describedBy,
      'aria-invalid': error ? true : child.props['aria-invalid'],
    })
    : child;

  return (
    <div className="ph-field">
      <label htmlFor={id}>{label}</label>
      {control}
      {hint ? <small id={hintId}>{hint}</small> : null}
      {error ? <small id={errorId} className="ph-field-error">{error}</small> : null}
    </div>
  );
};

export const Empty = ({ children }) => <div className="ph-empty">{children}</div>;
