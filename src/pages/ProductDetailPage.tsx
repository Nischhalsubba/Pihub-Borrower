import React, { useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { products } from '../data/demo';
import { Card, PageHead, Status, euro } from '../components/UI';
import { Icon } from '../components/Icons';
import { useBorrowerStore } from '../state/store';

export function ProductDetailPage() {
  const { id } = useParams();
  const product = products.find((item) => item.id === id);
  const { state, createApplication, toggleSavedProduct, toggleComparedProduct } = useBorrowerStore();
  const navigate = useNavigate();
  const [material, setMaterial] = useState<{ name: string; description: string } | null>(null);
  if (!product) return <Navigate to="/products" replace/>;
  const saved = state.savedProductIds.includes(product.id);
  const comparing = state.comparisonProductIds.includes(product.id);
  const compareDisabled = !comparing && state.comparisonProductIds.length >= 3;
  const apply = () => { createApplication(`${product.title} application`, product.id); navigate('/application'); };

  return <div className="route-stage"><PageHead eyebrow="Borrower / Financing products" title={product.title} subtitle={`${product.provider} · ${product.badge}`} action={<div className="page-action-group"><button className="button secondary" aria-pressed={saved} onClick={() => toggleSavedProduct(product.id)}>{saved ? 'Saved product' : 'Save product'}</button><button className="button secondary" disabled={compareDisabled} aria-pressed={comparing} onClick={() => toggleComparedProduct(product.id)}>{comparing ? 'In comparison' : 'Compare'}</button><button className="button primary" onClick={apply}>Apply for this product</button></div>} />
    <div className="product-detail-grid">
      <div className="stack">
        <Card title="Financing terms" subtitle="Indicative parameters. Final terms depend on underwriting and documentation."><dl className="detail-facts"><div><dt>Amount</dt><dd>{euro(product.amountMin)} – {euro(product.amountMax)}</dd></div><div><dt>Tenor</dt><dd>{product.tenorMin}–{product.tenorMax} months</dd></div><div><dt>Seniority</dt><dd>{product.seniority}</dd></div><div><dt>Maximum LTV</dt><dd>{product.ltvMax}%</dd></div><div><dt>Pricing</dt><dd>{product.pricing}</dd></div><div><dt>Availability</dt><dd><Status tone={product.availability === 'available' ? 'success' : 'warning'}>{product.availability}</Status></dd></div></dl></Card>
        <Card title="Eligibility & information requirements" subtitle="Requirements use the normal interface typeface and three deliberate alignment lanes.">
          <div className="requirements-table" role="table" aria-label="Eligibility requirements"><div className="requirements-head" role="row"><span>Requirement</span><span>Status</span><span>Detail</span></div>{product.requirements.map((req) => <div className="requirement-row" role="row" key={req.label}><strong>{req.label}</strong><Status tone={req.status === 'required' ? 'warning' : 'neutral'}>{req.status.replace('_', ' ')}</Status><span>{req.detail}</span></div>)}</div>
        </Card>
        <Card title="Supporting materials" subtitle="Demo materials open a real preview. Production files must come from PiHub's document service.">{product.materials.map((item) => <div className="material-row" key={item.name}><span className="material-icon"><Icon name="document" /></span><span><strong>{item.name}</strong><small>{item.description}</small></span><button className="button secondary" onClick={() => setMaterial(item)}>Preview demo outline</button></div>)}</Card>
      </div>
      <aside className="stack"><Card title="Provider"><div className="provider-card"><div className="provider-mark">PH</div><strong>{product.provider}</strong><p>Indicative network/provider information. Production provider visibility is permission and product-contract dependent.</p></div></Card><Card title="Next step"><p>Start a product-linked application. Your selected product will be carried into the financing request and can be changed before submission.</p><button className="button primary full" onClick={apply}>Start application</button><Link className="button secondary full" to="/products">Back to products</Link></Card></aside>
    </div>

    {material && <div className="modal-backdrop" role="presentation" onMouseDown={(e)=>{if(e.currentTarget===e.target)setMaterial(null)}}><div className="modal material-preview" role="dialog" aria-modal="true" aria-labelledby="material-title"><div className="modal-head"><div><h2 id="material-title">{material.name}</h2><p>{material.description}</p></div><button className="icon-button" aria-label="Close material preview" onClick={()=>setMaterial(null)}><Icon name="x"/></button></div><div className="material-outline"><div><span>Product</span><strong>{product.title}</strong></div><div><span>Indicative amount</span><strong>{euro(product.amountMin)} – {euro(product.amountMax)}</strong></div><div><span>Structure</span><strong>{product.seniority}</strong></div><div><span>Tenor</span><strong>{product.tenorMin}–{product.tenorMax} months</strong></div><div><span>Important</span><strong>Demo outline only · non-binding · subject to underwriting</strong></div></div><div className="form-actions"><button className="button primary" onClick={()=>setMaterial(null)}>Close preview</button></div></div></div>}
  </div>;
}
