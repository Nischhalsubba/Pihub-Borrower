import React, { useState } from 'react';
import { DEMO_DEAL, euro } from '../packages/domain/src/demo-data';
import { Card, Field, PageHead, Status } from '../packages/ui/src/Primitives';
import { readLocal, writeLocal } from './local-state';

const seed = {
  city: DEMO_DEAL.city,
  country: DEMO_DEAL.country,
  assetClass: DEMO_DEAL.assetClass,
  units: String(DEMO_DEAL.project.units),
  rentableAreaSqm: String(DEMO_DEAL.project.rentableAreaSqm),
  permits: DEMO_DEAL.project.permits,
  completion: DEMO_DEAL.project.completion,
  preLet: String(DEMO_DEAL.project.preLet),
  energyStandard: DEMO_DEAL.project.energyStandard,
};

export default function ProjectDetails() {
  const [form, setForm] = useState(() => readLocal('project', seed));
  const [saved, setSaved] = useState(false);
  const update = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }));
  const save = event => {
    event.preventDefault();
    writeLocal('project', form);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  };
  const financials = readLocal('financials', {
    projectCost: String(DEMO_DEAL.financials.projectCost),
    currentValue: String(DEMO_DEAL.financials.currentValue),
    gdv: String(DEMO_DEAL.financials.gdv),
    sponsorEquity: String(DEMO_DEAL.sponsorEquity),
  });

  return <div className="ph-page-shell">
    <PageHead eyebrow="Borrower / Project" title="Project & property" subtitle="Maintain the project facts that flow into Advisory structuring and Investor underwriting instead of leaving the application as a read-only placeholder." />
    <div className="ph-workspace-split">
      <form className="ph-card ph-stack" onSubmit={save}>
        <div className="ph-form-grid">
          <Field label="City"><input name="city" value={form.city} onChange={update}/></Field>
          <Field label="Country"><input name="country" value={form.country} onChange={update}/></Field>
          <Field label="Asset class"><input name="assetClass" value={form.assetClass} onChange={update}/></Field>
          <Field label="Residential units"><input name="units" inputMode="numeric" value={form.units} onChange={update}/></Field>
          <Field label="Rentable area (m²)"><input name="rentableAreaSqm" inputMode="numeric" value={form.rentableAreaSqm} onChange={update}/></Field>
          <Field label="Pre-let / reserved (%)"><input name="preLet" inputMode="decimal" value={form.preLet} onChange={update}/></Field>
          <Field label="Permit status"><input name="permits" value={form.permits} onChange={update}/></Field>
          <Field label="Expected completion"><input name="completion" value={form.completion} onChange={update}/></Field>
        </div>
        <Field label="Energy standard"><input name="energyStandard" value={form.energyStandard} onChange={update}/></Field>
        <div className="ph-form-actions"><button className="ph-button primary" type="submit">Save project</button>{saved ? <Status tone="good">Saved locally</Status> : null}</div>
      </form>
      <aside className="ph-sticky-rail">
        <Card title="Funding context"><dl className="ph-kv"><dt>Project cost</dt><dd>{euro(Number(financials.projectCost) || 0)}</dd><dt>Current value</dt><dd>{euro(Number(financials.currentValue) || 0)}</dd><dt>Estimated GDV</dt><dd>{euro(Number(financials.gdv) || 0)}</dd><dt>Sponsor equity</dt><dd>{financials.sponsorEquity || '—'}%</dd></dl></Card>
        <div className="ph-callout">Project facts are borrower-owned inputs. Internal credit conclusions and lender-only notes remain outside this workspace.</div>
      </aside>
    </div>
  </div>;
}
