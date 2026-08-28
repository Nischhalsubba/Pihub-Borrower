import React, { useDeferredValue, useState } from 'react';
import { Link } from 'react-router-dom';
import { products } from '../data/demo';
import { Card, PageHead, Status, euro } from '../components/UI';
import { useBorrowerStore } from '../state/store';

export function ProductsPage() {
  const { state, toggleSavedProduct, toggleComparedProduct } = useBorrowerStore();
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const [savedOnly, setSavedOnly] = useState(false);
  const deferred = useDeferredValue(query);
  const visible = products.filter((product) => {
    const text = `${product.title} ${product.provider} ${product.badge} ${product.assetClasses.join(' ')} ${product.purpose.join(' ')}`.toLowerCase();
    const savedMatch = !savedOnly || state.savedProductIds.includes(product.id);
    return savedMatch && (!deferred || text.includes(deferred.toLowerCase())) && (type === 'all' || product.badge.toLowerCase().includes(type));
  });
  const compared = products.filter((product) => state.comparisonProductIds.includes(product.id));

  return <div className="route-stage"><PageHead eyebrow="Borrower / Discover" title="Financing products" subtitle="Explore indicative structures, save candidates, compare up to three options and start a product-linked application." />
    <Card><div className="filter-row"><label className="search-field">Search<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Product, provider or asset class" /></label><label>Type<select value={type} onChange={(e) => setType(e.target.value)}><option value="all">All products</option><option value="real estate">Real estate</option><option value="bridge">Bridge</option><option value="mezzanine">Mezzanine</option><option value="whole loan">Whole loan</option></select></label><label className="filter-checkbox"><input type="checkbox" checked={savedOnly} onChange={(e) => setSavedOnly(e.target.checked)}/>Saved only</label><button className="button secondary" onClick={() => { setQuery(''); setType('all'); setSavedOnly(false); }}>Reset filters</button></div><div className="filter-note">{visible.length} product{visible.length === 1 ? '' : 's'} · {state.savedProductIds.length} saved · {state.comparisonProductIds.length}/3 selected to compare</div></Card>

    {compared.length > 0 && <Card title="Product comparison" subtitle="Compare the terms that matter before opening a detailed product view." action={<button className="button secondary" onClick={() => compared.forEach((product) => toggleComparedProduct(product.id))}>Clear comparison</button>}>
      <div className="comparison-table" role="table" aria-label="Financing product comparison"><div className="comparison-row comparison-head" role="row"><span>Metric</span>{compared.map((p)=><strong key={p.id}>{p.title}</strong>)}</div><div className="comparison-row" role="row"><span>Amount</span>{compared.map((p)=><span key={p.id}>{euro(p.amountMin)} – {euro(p.amountMax)}</span>)}</div><div className="comparison-row" role="row"><span>Tenor</span>{compared.map((p)=><span key={p.id}>{p.tenorMin}–{p.tenorMax} months</span>)}</div><div className="comparison-row" role="row"><span>Seniority</span>{compared.map((p)=><span key={p.id}>{p.seniority}</span>)}</div><div className="comparison-row" role="row"><span>Max LTV</span>{compared.map((p)=><span key={p.id}>{p.ltvMax}%</span>)}</div><div className="comparison-row" role="row"><span>Pricing</span>{compared.map((p)=><span key={p.id}>{p.pricing}</span>)}</div></div>
    </Card>}

    <div className="product-grid">{visible.map((product) => {
      const saved = state.savedProductIds.includes(product.id);
      const comparing = state.comparisonProductIds.includes(product.id);
      const compareDisabled = !comparing && state.comparisonProductIds.length >= 3;
      return <Card key={product.id} className="product-card"><div className="product-card-top"><Status tone={product.availability === 'available' ? 'success' : 'warning'}>{product.availability}</Status><span className="product-badge">{product.badge}</span></div><h2>{product.title}</h2><p>{product.provider}</p><dl className="product-facts"><div><dt>Amount</dt><dd>{euro(product.amountMin)} – {euro(product.amountMax)}</dd></div><div><dt>Tenor</dt><dd>{product.tenorMin}–{product.tenorMax} months</dd></div><div><dt>Seniority</dt><dd>{product.seniority}</dd></div><div><dt>Max LTV</dt><dd>{product.ltvMax}%</dd></div></dl><div className="product-actions"><Link className="button primary" to={`/products/${product.id}`}>View product</Link><button className="button secondary" aria-pressed={saved} onClick={() => toggleSavedProduct(product.id)}>{saved ? 'Saved' : 'Save'}</button><button className="button secondary" aria-pressed={comparing} disabled={compareDisabled} title={compareDisabled ? 'Remove a compared product before adding another.' : undefined} onClick={() => toggleComparedProduct(product.id)}>{comparing ? 'Comparing' : 'Compare'}</button></div></Card>;
    })}</div>
    {visible.length === 0 && <div className="empty-state"><strong>No matching products</strong><p>Try removing a filter or searching a broader financing category.</p></div>}
  </div>;
}
