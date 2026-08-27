import React, { useState } from 'react';
import { BORROWER_DOCUMENT_REQUIREMENTS, CREDIT_RATING_AGENCIES } from '../packages/domain/src/figma-flow-data';
import { DEMO_DEAL } from '../packages/domain/src/demo-data';
import { Card, Field, PageHead, Status } from '../packages/ui/src/Primitives';
import { readLocal, writeLocal } from './local-state';

const seed = Object.freeze({
  legalName: DEMO_DEAL.borrower,
  registration: 'HRB 209147 B',
  serviceExpertise: 'Residential development and asset management',
  financialNeeds: 'Development financing',
  collateral: 'yes',
  collateralDetail: 'First-ranking mortgage over the development property',
  headquarters: 'Berlin',
  state: 'Berlin',
  country: 'Germany',
  ndaRequired: 'yes',
  ndaAccepted: true,
  ratingRequired: 'yes',
  ratings: { Creditreform: 'A-', 'Standard & Poors': 'A+', 'Bank / Other': 'BB' },
  documents: Object.fromEntries(BORROWER_DOCUMENT_REQUIREMENTS.map(item => [item.id, item.id === 'trade-register' || item.id === 'articles'])),
});

export default function CorporateInformation() {
  const [form, setForm] = useState(() => readLocal('corporate-information', seed));
  const [saved, setSaved] = useState(false);
  const update = event => {
    const { name, value } = event.target;
    setSaved(false);
    setForm(current => ({ ...current, [name]: value }));
  };
  const updateRating = (agency, value) => {
    setSaved(false);
    setForm(current => ({ ...current, ratings: { ...current.ratings, [agency]: value } }));
  };
  const toggleDocument = id => {
    setSaved(false);
    setForm(current => ({ ...current, documents: { ...current.documents, [id]: !current.documents[id] } }));
  };
  const save = event => {
    event.preventDefault();
    writeLocal('corporate-information', form);
    writeLocal('company', {
      legalName: form.legalName,
      registration: form.registration,
      jurisdiction: form.country,
      website: 'https://example.invalid',
      employees: '24',
      business: form.serviceExpertise,
    });
    setSaved(true);
  };
  const uploaded = BORROWER_DOCUMENT_REQUIREMENTS.filter(item => form.documents[item.id]).length;

  return <div className="ph-page-shell">
    <PageHead eyebrow="Borrower / Corporate information" title="Corporate information" subtitle="Maintain the borrower profile, financing needs, collateral, NDA, ratings and document evidence used by Advisory, Investor and Admin during the same deal review." />
    <form className="ph-stack" onSubmit={save}>
      <Card title="Company & financing profile" action={saved ? <Status tone="good">Saved</Status> : null}>
        <div className="ph-form-grid">
          <Field label="Legal company name"><input name="legalName" value={form.legalName} onChange={update} required /></Field>
          <Field label="Trade register / registration"><input name="registration" value={form.registration} onChange={update} /></Field>
          <Field label="Service / industry expertise"><input name="serviceExpertise" value={form.serviceExpertise} onChange={update} /></Field>
          <Field label="Financial needs"><select name="financialNeeds" value={form.financialNeeds} onChange={update}><option>Development financing</option><option>Acquisition financing</option><option>Revolving credit</option><option>Purchase financing / Finetrading</option></select></Field>
          <Field label="Headquarters"><input name="headquarters" value={form.headquarters} onChange={update} /></Field>
          <Field label="State"><select name="state" value={form.state} onChange={update}><option>Berlin</option><option>Bavaria</option><option>Hamburg</option><option>Hesse</option><option>North Rhine-Westphalia</option></select></Field>
          <Field label="Country"><select name="country" value={form.country} onChange={update}><option>Germany</option><option>Austria</option><option>Switzerland</option></select></Field>
          <Field label="Collateral available?"><select name="collateral" value={form.collateral} onChange={update}><option value="yes">Yes</option><option value="no">No</option></select></Field>
          {form.collateral === 'yes' ? <Field label="Collateral type and value"><input name="collateralDetail" value={form.collateralDetail} onChange={update} /></Field> : null}
          <Field label="NDA required?"><select name="ndaRequired" value={form.ndaRequired} onChange={update}><option value="yes">Yes</option><option value="no">No</option></select></Field>
        </div>
        <div className="ph-form-actions" style={{ marginTop: 16 }}><button className="ph-button primary" type="submit">Save corporate information</button><span className="ph-section-note">The demo persists these values in this browser and reuses the company identity in the application flow.</span></div>
      </Card>

      {form.ndaRequired === 'yes' ? <Card title="NDA requirement" action={<Status tone={form.ndaAccepted ? 'good' : 'warn'}>{form.ndaAccepted ? 'Accepted' : 'Required'}</Status>}>
        <p className="ph-section-note">The reference flow requires NDA handling before protected product information is shared.</p>
        <div className="ph-form-actions" style={{ marginTop: 12 }}><button className="ph-button secondary" type="button" onClick={() => setForm(current => ({ ...current, ndaAccepted: !current.ndaAccepted }))}>{form.ndaAccepted ? 'Reset demo NDA' : 'Accept demo NDA'}</button></div>
      </Card> : null}

      <Card title="Credit ratings" action={<Status tone={form.ratingRequired === 'yes' ? 'warn' : 'good'}>{form.ratingRequired === 'yes' ? 'Rating information used' : 'Not required'}</Status>}>
        <div className="ph-form-grid">
          <Field label="External rating available?"><select name="ratingRequired" value={form.ratingRequired} onChange={update}><option value="yes">Yes</option><option value="no">No</option></select></Field>
          {form.ratingRequired === 'yes' ? CREDIT_RATING_AGENCIES.map(agency => <Field key={agency} label={agency}><input value={form.ratings[agency] || ''} onChange={event => updateRating(agency, event.target.value)} placeholder="e.g. A-" /></Field>) : null}
        </div>
      </Card>

      <Card title="Corporate document pack" action={<Status tone={uploaded === BORROWER_DOCUMENT_REQUIREMENTS.length ? 'good' : 'warn'}>{uploaded}/{BORROWER_DOCUMENT_REQUIREMENTS.length} available</Status>}>
        <div className="ph-table-wrap"><table className="ph-table"><thead><tr><th>Document</th><th>Category</th><th>Status</th><th /></tr></thead><tbody>{BORROWER_DOCUMENT_REQUIREMENTS.map(item => <tr key={item.id}><td><strong>{item.name}</strong></td><td>{item.category}</td><td><Status tone={form.documents[item.id] ? 'good' : 'warn'}>{form.documents[item.id] ? 'Uploaded' : 'Required'}</Status></td><td><button className="ph-button secondary" type="button" onClick={() => toggleDocument(item.id)}>{form.documents[item.id] ? 'Remove demo file' : 'Mark demo upload'}</button></td></tr>)}</tbody></table></div>
      </Card>
    </form>
  </div>;
}
