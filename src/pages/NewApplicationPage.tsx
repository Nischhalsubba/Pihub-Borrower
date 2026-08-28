import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Field, PageHead } from '../components/UI';
import { products } from '../data/demo';
import { useBorrowerStore } from '../state/store';

export function NewApplicationPage() {
  const { createApplication } = useBorrowerStore();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [productId, setProductId] = useState('');
  const [error, setError] = useState('');
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (name.trim().length < 4) { setError('Use a descriptive application or project name.'); return; }
    createApplication(name, productId || null);
    navigate('/application');
  };
  return <div className="route-stage narrow-stage"><PageHead eyebrow="Borrower / Applications" title="New financing application" subtitle="Create a clean draft. You can save and complete the financing information step by step." />
    <form className="form-card" onSubmit={submit} noValidate>
      <Field label="Application / project name" error={error}><input value={name} onChange={(e) => { setName(e.target.value); setError(''); }} onBlur={() => name && name.trim().length < 4 && setError('Use at least 4 characters.')} placeholder="e.g. Berlin Residential Development" /></Field>
      <Field label="Start from financing product" helper="Optional. You can change the target structure before submission."><select value={productId} onChange={(e) => setProductId(e.target.value)}><option value="">No product selected</option>{products.map((product) => <option key={product.id} value={product.id}>{product.title}</option>)}</select></Field>
      <div className="form-actions"><button className="button primary" type="submit">Create draft</button><button className="button secondary" type="button" onClick={() => navigate('/applications')}>Cancel</button></div>
    </form>
  </div>;
}
