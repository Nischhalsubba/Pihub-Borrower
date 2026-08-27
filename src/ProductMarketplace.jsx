import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom-v6';
import { FINANCING_PRODUCTS } from '../packages/domain/src/figma-flow-data';
import { euro } from '../packages/domain/src/demo-data';
import { Card, Field, PageHead, Status } from '../packages/ui/src/Primitives';
import { writeLocal } from './local-state';

export default function ProductMarketplace() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({ creditType: '', industry: '', region: '', amount: '', term: '', deadline: '' });
  const update = event => setFilters(current => ({ ...current, [event.target.name]: event.target.value }));
  const products = useMemo(() => FINANCING_PRODUCTS.filter(product => {
    const amount = Number(filters.amount);
    const term = Number(filters.term);
    return (!filters.creditType || product.creditType === filters.creditType)
      && (!filters.industry || product.industry === filters.industry)
      && (!filters.region || product.region === filters.region || product.region === 'Germany' || product.region === 'DACH')
      && (!amount || (amount >= product.minAmount && amount <= product.maxAmount))
      && (!term || (term >= product.minTerm && term <= product.maxTerm))
      && (!filters.deadline || product.deadline >= filters.deadline);
  }), [filters]);

  const apply = product => {
    if (product.availability !== 'Open') return;
    writeLocal('selected-product', product);
    navigate(`/applications/new?product=${encodeURIComponent(product.id)}`);
  };
  const reset = () => setFilters({ creditType: '', industry: '', region: '', amount: '', term: '', deadline: '' });

  return <div className="ph-page-shell">
    <PageHead eyebrow="Borrower / Financing products" title="Find financing" subtitle="Search available financing structures, inspect the full product terms, then start an application with the selected product carried into the borrower workflow." />
    <Card title="Search criteria" action={<button className="ph-button secondary" type="button" onClick={reset}>Reset filters</button>}>
      <div className="ph-form-grid">
        <Field label="Credit type"><select name="creditType" value={filters.creditType} onChange={update}><option value="">All credit types</option>{[...new Set(FINANCING_PRODUCTS.map(item => item.creditType))].map(value => <option key={value}>{value}</option>)}</select></Field>
        <Field label="Industry"><select name="industry" value={filters.industry} onChange={update}><option value="">All industries</option>{[...new Set(FINANCING_PRODUCTS.map(item => item.industry))].map(value => <option key={value}>{value}</option>)}</select></Field>
        <Field label="Region"><select name="region" value={filters.region} onChange={update}><option value="">All regions</option><option>Berlin</option><option>Germany</option><option>DACH</option></select></Field>
        <Field label="Amount (EUR)"><input name="amount" inputMode="numeric" value={filters.amount} onChange={update} placeholder="e.g. 18000000" /></Field>
        <Field label="Term (months)"><input name="term" inputMode="numeric" value={filters.term} onChange={update} placeholder="e.g. 24" /></Field>
        <Field label="Application deadline on or after"><input name="deadline" type="date" value={filters.deadline} onChange={update} /></Field>
      </div>
    </Card>
    <div className="ph-card" aria-live="polite">
      <div className="ph-card-head"><div><h2>{products.length} matching financing products</h2><p>Product discovery follows the legacy PiHub functional flow while using the current Investor interface system.</p></div></div>
      <div className="ph-table-wrap"><table className="ph-table"><thead><tr><th>Product</th><th>Credit type</th><th>Region</th><th>Amount range</th><th>Term</th><th>Deadline</th><th>Status</th><th /></tr></thead><tbody>{products.map(product => <tr key={product.id}>
        <td><strong>{product.title}</strong><small>{product.provider}</small></td>
        <td>{product.creditType}<small>{product.industry}</small></td>
        <td>{product.region}<small>{product.county}</small></td>
        <td className="ph-mono">{euro(product.minAmount)} – {euro(product.maxAmount)}</td>
        <td className="ph-mono">{product.minTerm}–{product.maxTerm} mo</td>
        <td className="ph-mono">{product.deadline}</td>
        <td><div className="ph-inline"><Status tone={product.availability === 'Open' ? 'good' : 'warn'}>{product.availability}</Status>{product.ndaRequired ? <Status>NDA</Status> : null}{product.ratingRequired ? <Status>Rating</Status> : null}</div></td>
        <td><div className="ph-inline"><Link className="ph-button secondary" to={`/products/${product.id}`}>Details</Link><button className="ph-button primary" type="button" disabled={product.availability !== 'Open'} onClick={() => apply(product)}>{product.availability === 'Open' ? 'Apply' : 'Paused'}</button></div></td>
      </tr>)}</tbody></table></div>
      {!products.length ? <div className="ph-empty"><strong>No products match these criteria.</strong><span>Broaden the amount, term, industry, region or deadline filters.</span></div> : null}
    </div>
  </div>;
}
