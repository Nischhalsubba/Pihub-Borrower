import React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom-v6';
import { FINANCING_PRODUCTS } from '../packages/domain/src/figma-flow-data';
import { euro } from '../packages/domain/src/demo-data';
import { Card, PageHead, Status } from '../packages/ui/src/Primitives';
import { readLocal, writeLocal } from './local-state';

export default function ProductDetail() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const product = FINANCING_PRODUCTS.find(item => item.id === productId);
  const application = readLocal('application', null);
  const selected = readLocal('selected-product', null);
  const alreadyApplied = Boolean(application && (application.productId === productId || selected?.id === productId));

  if (!product) return <div className="ph-page-shell">
    <PageHead eyebrow="Borrower / Financing products" title="Product not found" subtitle="The financing product is unavailable or the link is no longer valid." />
    <Card title="Return to product discovery"><div className="ph-empty"><strong>No financing product exists for {productId}.</strong><Link className="ph-button primary" to="/products">Browse financing products</Link></div></Card>
  </div>;

  const canApply = product.availability === 'Open';
  const apply = () => {
    if (!canApply) return;
    writeLocal('selected-product', product);
    navigate(`/applications/new?product=${encodeURIComponent(product.id)}`);
  };
  const primaryAction = alreadyApplied
    ? <Link className="ph-button primary" to="/financing">Continue application</Link>
    : canApply
      ? <button className="ph-button primary" type="button" onClick={apply}>Apply for this product</button>
      : <button className="ph-button secondary" type="button" disabled>Applications paused</button>;

  return <div className="ph-page-shell">
    <PageHead eyebrow={`Borrower / Financing products / ${product.id}`} title={product.title} subtitle={product.description} action={primaryAction} />
    {!canApply && !alreadyApplied ? <div className="ph-callout"><strong>Applications are temporarily on hold.</strong> You can review the product criteria, but a new application cannot be started until the provider reopens intake.</div> : null}
    <div className="ph-workspace-split">
      <div className="ph-stack">
        <Card title="Financing terms" action={<Status tone={canApply ? 'good' : 'warn'}>{product.availability}</Status>}>
          <dl className="ph-kv"><dt>Credit type</dt><dd>{product.creditType}</dd><dt>Industry</dt><dd>{product.industry}</dd><dt>Amount range</dt><dd>{euro(product.minAmount)} – {euro(product.maxAmount)}</dd><dt>Term</dt><dd>{product.minTerm}–{product.maxTerm} months</dd><dt>Pricing</dt><dd>{product.interest}</dd><dt>Region</dt><dd>{product.region} · {product.county}</dd></dl>
        </Card>
        <Card title="Eligibility & information requirements">
          <div className="ph-metric-grid"><div className="ph-metric"><span>Collateral</span><strong>{product.collateral ? 'Required' : 'Not required'}</strong><small>Defined at application review</small></div><div className="ph-metric"><span>NDA</span><strong>{product.ndaRequired ? 'Required' : 'Not required'}</strong><small>Before protected information</small></div><div className="ph-metric"><span>External rating</span><strong>{product.ratingRequired ? 'Required' : 'Optional'}</strong><small>Based on product criteria</small></div></div>
        </Card>
        <Card title="Supporting material"><ul className="ph-list">{product.attachments.map(name => <li key={name}><span><strong>{name}</strong><small>Reference document</small></span><Status>Available</Status></li>)}</ul></Card>
      </div>
      <aside className="ph-sticky-rail">
        <Card title="Provider"><dl className="ph-kv"><dt>Financing provider</dt><dd>{product.provider}</dd><dt>Published</dt><dd>{product.createdAt}</dd><dt>Application deadline</dt><dd>{product.deadline}</dd><dt>Status</dt><dd>{product.availability}</dd></dl></Card>
        <Card title="Application state"><p className="ph-section-note">{alreadyApplied ? 'This product is already attached to the current browser-local application.' : canApply ? 'Applying creates a borrower-owned draft. The product is not submitted to Advisory or Investor until the financing request is explicitly submitted.' : 'The product is visible for reference, but its intake is currently paused.'}</p><div className="ph-form-actions" style={{ marginTop: 12 }}>{alreadyApplied ? <Link className="ph-button secondary" to="/applications">View applications</Link> : canApply ? <button className="ph-button primary" type="button" onClick={apply}>Start application</button> : <Link className="ph-button secondary" to="/products">Browse alternatives</Link>}</div></Card>
      </aside>
    </div>
  </div>;
}
