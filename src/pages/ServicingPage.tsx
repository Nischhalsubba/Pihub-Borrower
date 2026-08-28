import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, EmptyState, Field, PageHead, Progress, Status, euro } from '../components/UI';
import { Icon } from '../components/Icons';
import { facilityHealth, nextFacilityPayment } from '../state/core';
import { useBorrowerStore } from '../state/store';
import type { ServicingRequest } from '../state/model';

const covenantTone = (status: string) => status === 'compliant' ? 'success' : status === 'breach' ? 'danger' : status === 'warning' ? 'warning' : 'neutral';
const requestTone = (status: string) => status === 'approved' ? 'success' : status === 'declined' ? 'danger' : status === 'under_review' ? 'info' : status === 'withdrawn' ? 'neutral' : 'warning';

export function ServicingPage() {
  const { state, setActiveApplication, createServicingRequest, withdrawServicingRequest, submitReportingObligation, reportPaymentMade, feature } = useBorrowerStore();
  const [facilityId, setFacilityId] = useState(state.facilities[0]?.id ?? '');
  const [requestOpen, setRequestOpen] = useState(false);
  const [reportingOpen, setReportingOpen] = useState<string | null>(null);
  const [reportingDocumentId, setReportingDocumentId] = useState('');
  const [paymentOpen, setPaymentOpen] = useState<string | null>(null);
  const [requestType, setRequestType] = useState<ServicingRequest['type']>('consent');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [notice, setNotice] = useState('');
  const [forecastCovenantId,setForecastCovenantId]=useState('');
  const [forecastValue,setForecastValue]=useState('');
  const [forecastDate,setForecastDate]=useState(new Date(Date.now()+90*86400000).toISOString().slice(0,10));
  const [forecastAssumption,setForecastAssumption]=useState('Base-case borrower forecast');
  const facility = state.facilities.find((item) => item.id === facilityId) ?? state.facilities[0];
  const app = facility ? state.applications.find((item) => item.id === facility.applicationId) : undefined;
  const schedule = facility ? state.paymentSchedule.filter((item) => item.facilityId === facility.id).sort((a,b)=>a.dueDate.localeCompare(b.dueDate)) : [];
  const covenants = facility ? state.covenants.filter((item) => item.facilityId === facility.id) : [];
  const reporting = facility ? state.reportingObligations.filter((item) => item.facilityId === facility.id).sort((a,b)=>a.dueDate.localeCompare(b.dueDate)) : [];
  const requests = facility ? state.servicingRequests.filter((item) => item.facilityId === facility.id) : [];
  const health = facility ? facilityHealth(state, facility.id) : { covenantStatus: 'not_tested' as const, outstandingReporting: 0 };
  const facilityDocuments = facility ? state.documents.filter((item) => item.applicationId === facility.applicationId && Boolean(item.blobKey)) : [];
  const nextPayment = facility ? nextFacilityPayment(state, facility.id) : undefined;
  const paidCount = schedule.filter((item) => item.status === 'paid').length;
  const paymentProgress = schedule.length ? Math.round((paidCount / schedule.length) * 100) : 0;

  useEffect(() => {
    if (facility && state.activeApplicationId !== facility.applicationId) setActiveApplication(facility.applicationId);
  }, [facility?.applicationId, setActiveApplication, state.activeApplicationId]);

  const maturityLabel = useMemo(() => {
    if (!facility) return '';
    const days = Math.ceil((new Date(facility.maturityDate).getTime() - Date.now()) / 86_400_000);
    if (days < 0) return `${Math.abs(days)} days past maturity`;
    if (days < 120) return `${days} days to maturity`;
    return `${Math.round(days / 30)} months to maturity`;
  }, [facility]);

  const submitRequest = (event: React.FormEvent) => {
    event.preventDefault();
    if (!facility || !subject.trim() || !description.trim()) return;
    createServicingRequest({ facilityId: facility.id, type: requestType, subject: subject.trim(), description: description.trim() });
    setSubject(''); setDescription(''); setRequestType('consent'); setRequestOpen(false);
    setNotice('Servicing request submitted to the canonical PiHub workflow outbox.');
  };

  if (!facility) return <div className="route-stage"><PageHead eyebrow="Borrower / Loan servicing" title="Loan servicing" subtitle="Repayments, covenants, reporting and post-funding requests."/><EmptyState title="No funded facility" body="Loan servicing appears after a financing reaches funded status." action={<Link className="button primary" to="/applications">View applications</Link>}/></div>;

  return <div className="route-stage">
    <PageHead eyebrow="Borrower / Loan servicing" title="Loan servicing" subtitle="Manage borrower obligations after funding without exposing lender-only portfolio controls." action={<button className="button primary" onClick={()=>setRequestOpen(true)}>New servicing request</button>}/>
    <div className="demo-banner"><Icon name="activity" size={16}/><span><strong>Post-funding lifecycle.</strong> Payment status, lender decisions and covenant determinations are read-only borrower views. Borrower actions create canonical servicing/reporting events for PiHub, Investor and Admin.</span></div>
    {state.facilities.length > 1 && <Card><Field label="Facility"><select value={facility.id} onChange={(e)=>setFacilityId(e.target.value)}>{state.facilities.map((item)=><option key={item.id} value={item.id}>{item.id} · {state.applications.find((app)=>app.id===item.applicationId)?.name ?? item.provider}</option>)}</select></Field></Card>}
    {notice && <div className="success-banner" role="status">{notice}</div>}

    <div className="facility-hero">
      <div><span>Facility</span><strong>{facility.id}</strong><small>{app?.name ?? facility.applicationId}</small></div>
      <div><span>Outstanding</span><strong>{euro(facility.outstandingAmount)}</strong><small>Original {euro(facility.originalAmount)}</small></div>
      <div><span>Pricing</span><strong>{facility.referenceRate} + {(facility.marginBps/100).toFixed(2)}%</strong><small>{facility.provider}</small></div>
      <div><span>Maturity</span><strong>{facility.maturityDate}</strong><small>{maturityLabel}</small></div>
      <div><span>Facility status</span><Status tone={facility.status==='active'?'success':'neutral'}>{facility.status.replaceAll('_',' ')}</Status><small>{facility.securitySummary}</small></div>
    </div>

    <div className="servicing-kpis">
      <Card><div className="kpi"><span>Next payment</span><strong>{nextPayment ? euro(nextPayment.principal + nextPayment.interest + nextPayment.fees) : 'None'}</strong><small>{nextPayment ? `Due ${nextPayment.dueDate}` : 'Schedule complete'}</small></div></Card>
      <Card><div className="kpi"><span>Covenant health</span><strong className="kpi-word">{health.covenantStatus.replace('_',' ')}</strong><Status tone={covenantTone(health.covenantStatus) as any}>{covenants.length} tests tracked</Status></div></Card>
      <Card><div className="kpi"><span>Reporting outstanding</span><strong>{health.outstandingReporting}</strong><small>{reporting.length} obligations tracked</small></div></Card>
      <Card><div className="kpi"><span>Open servicing requests</span><strong>{requests.filter((item)=>!['approved','declined','withdrawn'].includes(item.status)).length}</strong><small>Waivers, consents, amendments and maturity actions</small></div></Card>
    </div>

    {covenants.length>0&&<Card title="Covenant forecasting" subtitle="Forecast headroom before the next test. Actual compliance remains determined by the authoritative lender/PiHub workflow."><div className="forecast-grid"><form onSubmit={(e)=>{e.preventDefault();if(!forecastCovenantId||forecastValue==='')return;feature({type:'save_covenant_forecast',covenantId:forecastCovenantId,testDate:forecastDate,forecastValue:Number(forecastValue),assumption:forecastAssumption});setNotice('Covenant forecast saved.')}}><Field label="Covenant"><select value={forecastCovenantId} onChange={(e)=>{setForecastCovenantId(e.target.value);const c=covenants.find((x)=>x.id===e.target.value);setForecastValue(c?.currentValue?.toString()??'')}} required><option value="">Select covenant…</option>{covenants.map((c)=><option key={c.id} value={c.id}>{c.name} · {c.operator} {c.threshold}{c.unit}</option>)}</select></Field><Field label="Forecast value"><input type="number" step="0.01" value={forecastValue} onChange={(e)=>setForecastValue(e.target.value)} required/></Field><Field label="Test date"><input type="date" value={forecastDate} onChange={(e)=>setForecastDate(e.target.value)} required/></Field><Field label="Assumption"><textarea rows={3} value={forecastAssumption} onChange={(e)=>setForecastAssumption(e.target.value)} required/></Field><div className="form-actions"><button className="button primary">Save forecast</button></div></form><div className="forecast-list">{state.advanced.covenantForecasts.filter((f)=>covenants.some((c)=>c.id===f.covenantId)).map((f)=>{const c=covenants.find((x)=>x.id===f.covenantId);return <div key={f.id}><span><strong>{c?.name??f.covenantId}</strong><small>{f.testDate} · forecast {f.forecastValue}{c?.unit} · headroom {f.headroom.toFixed(2)}{c?.unit}</small><p>{f.assumption}</p></span><Status tone={f.status==='comfortable'?'success':f.status==='watch'?'warning':'danger'}>{f.status.replaceAll('_',' ')}</Status></div>})}</div></div></Card>}

    <div className="servicing-grid">
      <Card title="Repayment schedule" subtitle="Provider-confirmed payment states. Report a payment without falsely marking it settled." action={<Status tone={nextPayment?.status==='overdue'?'danger':'info'}>{nextPayment ? `Next ${nextPayment.dueDate}` : 'Complete'}</Status>}>
        <Progress value={paymentProgress} label={`${paidCount} of ${schedule.length} scheduled payments recorded as paid`}/>
        <div className="servicing-table"><div className="servicing-head"><span>Due date</span><span>Principal</span><span>Interest / fees</span><span>Status</span><span>Action</span></div>{schedule.map((payment)=><div className="servicing-row" key={payment.id}><strong>{payment.dueDate}</strong><span>{euro(payment.principal)}</span><span>{euro(payment.interest + payment.fees)}</span><Status tone={payment.status==='paid'?'success':payment.status==='overdue'?'danger':payment.status==='due'?'warning':'neutral'}>{payment.status}</Status><button className="button secondary" disabled={payment.status==='paid'} onClick={()=>{setPaymentOpen(payment.id);setPaymentNote('')}}>Report payment</button></div>)}</div>
      </Card>

      <Card title="Covenants" subtitle="Borrower-visible covenant tests. Internal credit analysis remains in Investor/Advisory.">
        <div className="covenant-list">{covenants.map((c)=><div key={c.id}><span><strong>{c.name}</strong><small>{c.metric} · next test {c.nextTestDate}</small></span><span className="covenant-value">{c.currentValue ?? '—'}{c.unit} <small>{c.operator} {c.threshold}{c.unit}</small></span><Status tone={covenantTone(c.status) as any}>{c.status.replace('_',' ')}</Status></div>)}</div>
      </Card>
    </div>

    {covenants.length>0&&<Card title="Covenant forecasting" subtitle="Forecast headroom before the next test. Actual compliance remains determined by the authoritative lender/PiHub workflow."><div className="forecast-grid"><form onSubmit={(e)=>{e.preventDefault();if(!forecastCovenantId||forecastValue==='')return;feature({type:'save_covenant_forecast',covenantId:forecastCovenantId,testDate:forecastDate,forecastValue:Number(forecastValue),assumption:forecastAssumption});setNotice('Covenant forecast saved.')}}><Field label="Covenant"><select value={forecastCovenantId} onChange={(e)=>{setForecastCovenantId(e.target.value);const c=covenants.find((x)=>x.id===e.target.value);setForecastValue(c?.currentValue?.toString()??'')}} required><option value="">Select covenant…</option>{covenants.map((c)=><option key={c.id} value={c.id}>{c.name} · {c.operator} {c.threshold}{c.unit}</option>)}</select></Field><Field label="Forecast value"><input type="number" step="0.01" value={forecastValue} onChange={(e)=>setForecastValue(e.target.value)} required/></Field><Field label="Test date"><input type="date" value={forecastDate} onChange={(e)=>setForecastDate(e.target.value)} required/></Field><Field label="Assumption"><textarea rows={3} value={forecastAssumption} onChange={(e)=>setForecastAssumption(e.target.value)} required/></Field><div className="form-actions"><button className="button primary">Save forecast</button></div></form><div className="forecast-list">{state.advanced.covenantForecasts.filter((f)=>covenants.some((c)=>c.id===f.covenantId)).map((f)=>{const c=covenants.find((x)=>x.id===f.covenantId);return <div key={f.id}><span><strong>{c?.name??f.covenantId}</strong><small>{f.testDate} · forecast {f.forecastValue}{c?.unit} · headroom {f.headroom.toFixed(2)}{c?.unit}</small><p>{f.assumption}</p></span><Status tone={f.status==='comfortable'?'success':f.status==='watch'?'warning':'danger'}>{f.status.replaceAll('_',' ')}</Status></div>})}</div></div></Card>}

    <div className="servicing-grid">
      <Card title="Periodic reporting" subtitle="Required post-funding information with clear ownership and submission state.">
        <div className="reporting-list">{reporting.map((item)=><div key={item.id}><span><strong>{item.title}</strong><small>{item.frequency.replace('_',' ')} · due {item.dueDate}</small>{item.remediation&&<em>{item.remediation}</em>}</span><Status tone={item.status==='accepted'?'success':item.status==='rejected'?'danger':item.status==='submitted'||item.status==='under_review'?'info':'warning'}>{item.status.replace('_',' ')}</Status><button className="button secondary" disabled={!['required','rejected'].includes(item.status)} onClick={()=>{setReportingOpen(item.id);setReportingDocumentId('')}}>Submit update</button></div>)}</div>
      </Card>
      <Card title="Maturity & refinancing" subtitle="Start the next financing action before the current facility reaches maturity.">
        <div className="maturity-card"><span className="maturity-date">{facility.maturityDate}</span><strong>{maturityLabel}</strong><p>Use a servicing request to start an extension, amendment or refinancing discussion. The request remains linked to {facility.id} and the original application {facility.applicationId}.</p><div className="row-actions"><button className="button primary" onClick={()=>{setRequestType('refinance');setSubject(`Refinancing of ${facility.id}`);setRequestOpen(true)}}>Start refinance request</button><button className="button secondary" onClick={()=>{setRequestType('extension');setSubject(`Extension request for ${facility.id}`);setRequestOpen(true)}}>Request extension</button></div></div>
      </Card>
    </div>

    <Card title="Servicing requests" subtitle="Waiver, consent, amendment, extension, refinance and payment-notice history.">
      {requests.length===0?<EmptyState title="No servicing requests" body="Post-funding requests you submit will be tracked here with their PiHub review state."/>:<div className="servicing-request-list">{requests.map((item)=><div key={item.id}><span><strong>{item.subject}</strong><small>{item.type.replaceAll('_',' ')} · {new Date(item.createdAt).toLocaleString()}</small><p>{item.description}</p></span><Status tone={requestTone(item.status) as any}>{item.status.replaceAll('_',' ')}</Status><button className="button secondary" disabled={!['draft','submitted'].includes(item.status)} onClick={()=>{withdrawServicingRequest(item.id);setNotice('Servicing request withdrawn.')}}>Withdraw</button></div>)}</div>}
    </Card>

    {reportingOpen&&<div className="modal-backdrop" role="presentation" onMouseDown={(e)=>{if(e.currentTarget===e.target)setReportingOpen(null)}}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="reporting-title"><div className="modal-head"><div><h2 id="reporting-title">Submit facility reporting</h2><p>{reporting.find((item)=>item.id===reportingOpen)?.title}</p></div><button className="icon-button" aria-label="Close" onClick={()=>setReportingOpen(null)}><Icon name="x"/></button></div>{facilityDocuments.length===0?<div className="modal-empty"><p>Upload the supporting report first. It will remain linked to the funded application and this reporting obligation.</p><Link className="button primary" to="/documents" onClick={()=>setReportingOpen(null)}>Upload supporting document</Link></div>:<form onSubmit={(e)=>{e.preventDefault();if(!reportingDocumentId)return;const obligation=reporting.find((item)=>item.id===reportingOpen);submitReportingObligation(reportingOpen,reportingDocumentId);setReportingOpen(null);setReportingDocumentId('');setNotice(`${obligation?.title ?? 'Reporting item'} submitted with supporting document for PiHub review.`)}}><Field label="Supporting document" helper="Choose an uploaded document from this funded application."><select value={reportingDocumentId} onChange={(e)=>setReportingDocumentId(e.target.value)} required><option value="">Select document…</option>{facilityDocuments.map((doc)=><option key={doc.id} value={doc.id}>{doc.name} · v{doc.version}</option>)}</select></Field><div className="form-actions"><button className="button primary" disabled={!reportingDocumentId}>Submit reporting</button><button type="button" className="button secondary" onClick={()=>setReportingOpen(null)}>Cancel</button></div></form>}</div></div>}

    {requestOpen&&<div className="modal-backdrop" role="presentation" onMouseDown={(e)=>{if(e.currentTarget===e.target)setRequestOpen(false)}}><div className="modal servicing-modal" role="dialog" aria-modal="true" aria-labelledby="servicing-request-title"><div className="modal-head"><div><h2 id="servicing-request-title">New servicing request</h2><p>Linked to {facility.id}</p></div><button className="icon-button" aria-label="Close" onClick={()=>setRequestOpen(false)}><Icon name="x"/></button></div><form onSubmit={submitRequest}><Field label="Request type"><select value={requestType} onChange={(e)=>setRequestType(e.target.value as ServicingRequest['type'])}><option value="consent">Consent</option><option value="waiver">Waiver</option><option value="amendment">Amendment</option><option value="extension">Extension</option><option value="refinance">Refinance</option><option value="facility_increase">Facility increase</option><option value="additional_drawdown">Additional drawdown</option><option value="rollover">Rollover</option><option value="partial_prepayment">Partial prepayment</option><option value="full_repayment">Full repayment</option><option value="payment_account_change">Payment account change</option><option value="payoff">Payoff / discharge</option></select></Field><Field label="Subject"><input value={subject} onChange={(e)=>setSubject(e.target.value)} required/></Field><Field label="Description"><textarea rows={5} value={description} onChange={(e)=>setDescription(e.target.value)} required placeholder="Explain the requested change, business reason, timing and supporting information."/></Field><div className="form-actions"><button className="button primary">Submit request</button><button type="button" className="button secondary" onClick={()=>setRequestOpen(false)}>Cancel</button></div></form></div></div>}

    {paymentOpen&&<div className="modal-backdrop" role="presentation" onMouseDown={(e)=>{if(e.currentTarget===e.target)setPaymentOpen(null)}}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="payment-notice-title"><div className="modal-head"><div><h2 id="payment-notice-title">Report payment made</h2><p>This creates a payment notice for PiHub review. It does not mark the facility payment as settled.</p></div><button className="icon-button" aria-label="Close" onClick={()=>setPaymentOpen(null)}><Icon name="x"/></button></div><form onSubmit={(e)=>{e.preventDefault();if(!paymentOpen||!paymentNote.trim())return;reportPaymentMade(paymentOpen,paymentNote);setPaymentOpen(null);setPaymentNote('');setNotice('Payment notice submitted for PiHub reconciliation.')}}><Field label="Payment reference / note"><textarea rows={4} value={paymentNote} onChange={(e)=>setPaymentNote(e.target.value)} required placeholder="Payment date, bank reference and any relevant remittance details."/></Field><div className="form-actions"><button className="button primary">Submit payment notice</button><button type="button" className="button secondary" onClick={()=>setPaymentOpen(null)}>Cancel</button></div></form></div></div>}
  </div>;
}
