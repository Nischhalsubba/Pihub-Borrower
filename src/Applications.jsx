import React from 'react';
import { Link } from 'react-router-dom-v6';
import { DEMO_DEAL, euro } from '../packages/domain/src/demo-data';
import { Card, PageHead, Status } from '../packages/ui/src/Primitives';
import { readLocal } from './local-state';

const historical = Object.freeze([
  { id: 'PH-2026-0109', project: 'Hamburg Mixed-Use Acquisition', product: 'Acquisition Bridge', amount: 12000000, status: 'Closed', updated: '2026-06-18' },
  { id: 'PH-2026-0068', project: 'Munich Office Repositioning', product: 'Senior Development Facility', amount: 9500000, status: 'Not pursued', updated: '2026-03-07' },
]);

const tone = status => status === 'Closed' ? 'good' : status === 'Draft' ? 'warn' : undefined;

export default function Applications() {
  const current = readLocal('application', { id: DEMO_DEAL.id, project: DEMO_DEAL.name, status: 'Draft', company: DEMO_DEAL.borrower });
  const financing = readLocal('financing', { amount: String(DEMO_DEAL.requestedAmount), structure: DEMO_DEAL.structure });
  const selected = readLocal('selected-product', null);
  const rows = [{ id: current.id, project: current.project, product: selected?.title || financing.structure || DEMO_DEAL.structure, amount: Number(financing.amount || DEMO_DEAL.requestedAmount), status: current.status || 'Draft', updated: current.createdAt ? current.createdAt.slice(0, 10) : '2026-08-26', current: true }, ...historical];

  return <div className="ph-page-shell">
    <PageHead eyebrow="Borrower / Applications" title="My applications" subtitle="Track every financing application from product selection through submission, review, closing and final outcome." action={<Link className="ph-button primary" to="/applications/new">New application</Link>} />
    <Card title="Application portfolio" action={<span className="ph-section-note">{rows.length} applications</span>}>
      <div className="ph-table-wrap"><table className="ph-table"><thead><tr><th>Application</th><th>Financing product</th><th>Amount</th><th>Status</th><th>Updated</th><th /></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td><strong>{row.project}</strong><small>{row.id}</small></td><td>{row.product}</td><td className="ph-mono">{euro(row.amount)}</td><td><Status tone={tone(row.status)}>{row.status}</Status></td><td className="ph-mono">{row.updated}</td><td>{row.current ? <Link className="ph-button secondary" to="/financing">Continue</Link> : <button className="ph-button secondary" type="button" disabled>Archived</button>}</td></tr>)}</tbody></table></div>
    </Card>
    <div className="ph-callout">Applications are intentionally separate from financing products. Selecting a product starts a draft; only the explicit submit action moves the canonical deal into Advisory review.</div>
  </div>;
}
