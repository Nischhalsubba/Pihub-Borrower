import React, { useMemo, useState } from 'react';
import { DEMO_DEAL, euro } from '../packages/domain/src/demo-data';
import { Card, Field, PageHead, Status } from '../packages/ui/src/Primitives';
import { readLocal, writeLocal } from './local-state';

const seed = {
  revenue: String(DEMO_DEAL.financials.revenue),
  ebitda: String(DEMO_DEAL.financials.ebitda),
  cash: String(DEMO_DEAL.financials.cash),
  netDebt: String(DEMO_DEAL.financials.netDebt),
  projectCost: String(DEMO_DEAL.financials.projectCost),
  currentValue: String(DEMO_DEAL.financials.currentValue),
  gdv: String(DEMO_DEAL.financials.gdv),
  sponsorEquity: String(DEMO_DEAL.sponsorEquity),
};

const number = value => Number(value) || 0;

export default function FinancialDetails() {
  const [form, setForm] = useState(() => readLocal('financials', seed));
  const [saved, setSaved] = useState(false);
  const update = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }));
  const metrics = useMemo(() => {
    const revenue = number(form.revenue);
    const ebitda = number(form.ebitda);
    const netDebt = number(form.netDebt);
    const currentValue = number(form.currentValue);
    return {
      margin: revenue ? (ebitda / revenue) * 100 : 0,
      leverage: ebitda ? netDebt / ebitda : 0,
      debtToValue: currentValue ? (netDebt / currentValue) * 100 : 0,
    };
  }, [form]);

  const save = event => {
    event.preventDefault();
    writeLocal('financials', form);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  };

  return <div className="ph-page-shell">
    <PageHead eyebrow="Borrower / Financials" title="Financial information" subtitle="Capture borrower and project figures with explicit local persistence so the application has usable inputs rather than decorative metrics." />
    <div className="ph-workspace-split">
      <form className="ph-card ph-stack" onSubmit={save}>
        <div className="ph-form-grid">
          <Field label="Revenue (EUR)"><input name="revenue" inputMode="decimal" value={form.revenue} onChange={update}/></Field>
          <Field label="EBITDA (EUR)"><input name="ebitda" inputMode="decimal" value={form.ebitda} onChange={update}/></Field>
          <Field label="Cash (EUR)"><input name="cash" inputMode="decimal" value={form.cash} onChange={update}/></Field>
          <Field label="Net debt (EUR)"><input name="netDebt" inputMode="decimal" value={form.netDebt} onChange={update}/></Field>
          <Field label="Project cost (EUR)"><input name="projectCost" inputMode="decimal" value={form.projectCost} onChange={update}/></Field>
          <Field label="Current value (EUR)"><input name="currentValue" inputMode="decimal" value={form.currentValue} onChange={update}/></Field>
          <Field label="Estimated GDV (EUR)"><input name="gdv" inputMode="decimal" value={form.gdv} onChange={update}/></Field>
          <Field label="Sponsor equity (%)"><input name="sponsorEquity" inputMode="decimal" value={form.sponsorEquity} onChange={update}/></Field>
        </div>
        <div className="ph-form-actions"><button className="ph-button primary" type="submit">Save financials</button>{saved ? <Status tone="good">Saved locally</Status> : null}</div>
      </form>
      <aside className="ph-sticky-rail">
        <Card title="Derived review metrics"><dl className="ph-kv"><dt>EBITDA margin</dt><dd>{metrics.margin.toFixed(1)}%</dd><dt>Net debt / EBITDA</dt><dd>{metrics.leverage.toFixed(2)}x</dd><dt>Net debt / current value</dt><dd>{metrics.debtToValue.toFixed(1)}%</dd><dt>Project cost</dt><dd>{euro(number(form.projectCost))}</dd></dl></Card>
        <div className="ph-callout">Derived figures are clearly labelled as browser-demo calculations. Production definitions, source statements and model versions remain server-owned.</div>
      </aside>
    </div>
  </div>;
}
