import test from 'node:test';
import assert from 'node:assert/strict';
import {
  activeApplication,
  completionPercentage,
  createApplication,
  createDraftFromVersion,
  createInitialState,
  createSupportTicket,
  createServicingRequest,
  createPrivacyRequest,
  decideTermSheet,
  inviteTeamMember,
  markNotificationRead,
  nextFacilityPayment,
  facilityHealth,
  migrateState,
  resendTeamInvitation,
  respondToRequest,
  reportPaymentMade,
  submitReportingObligation,
  setActiveApplication,
  setApplicationStatus,
  toggleClosingItem,
  toggleComparedProduct,
  toggleSavedProduct,
  updateApplicationSection,
  upsertDocument,
  withdrawServicingRequest,
  withdrawApplication
} from '../.core-build/state/core.js';

test('initial demo state has canonical pre-funding and funded borrower applications', () => {
  const state = createInitialState();
  assert.equal(state.applications.length, 2);
  assert.equal(activeApplication(state).id, state.activeApplicationId);
  assert.equal(state.schemaVersion, 5);
  assert.equal(state.applicationVersions.length, 2);
  assert.ok(state.applications.some((app) => app.status === 'funded'));
  assert.equal(state.facilities.length, 1);
});

test('new application starts as a clean draft with canonical id', () => {
  const initial = createInitialState();
  const next = createApplication(initial, { name: 'Hamburg Logistics Expansion', productId: 'bridge-facility' });
  const app = activeApplication(next);
  assert.equal(app.name, 'Hamburg Logistics Expansion');
  assert.equal(app.status, 'draft');
  assert.equal(app.financing.productId, 'bridge-facility');
  assert.equal(app.sectionCompletion.financing, false);
  assert.ok(app.id.startsWith('PH-'));
  assert.ok(next.applicationVersions.some((v) => v.applicationId === app.id));
});

test('application selector opens the requested canonical application', () => {
  const initial = createInitialState();
  const withSecond = createApplication(initial, { name: 'Second application' });
  const firstId = initial.activeApplicationId;
  const selected = setActiveApplication(withSecond, firstId);
  assert.equal(activeApplication(selected).id, firstId);
});

test('application section updates are versioned and snapshot history is retained', () => {
  const initial = createInitialState();
  const before = activeApplication(initial).version;
  const next = updateApplicationSection(initial, 'financing', { amount: 25_000_000, purpose: 'Acquisition refinance' }, true);
  const app = activeApplication(next);
  assert.equal(app.financing.amount, 25_000_000);
  assert.equal(app.financing.purpose, 'Acquisition refinance');
  assert.equal(app.version, before + 1);
  assert.equal(app.sectionCompletion.financing, true);
  assert.equal(next.applicationVersions[0].version, app.version);
  assert.equal(next.applicationVersions[0].snapshot.financing.amount, 25_000_000);
});

test('prior application version can create a new draft without overwriting history', () => {
  const initial = createInitialState();
  const changed = updateApplicationSection(initial, 'financing', { amount: 23_000_000 }, true);
  const oldVersion = changed.applicationVersions.find((v) => v.version === 1);
  assert.ok(oldVersion);
  const copied = createDraftFromVersion(changed, oldVersion.id);
  const app = activeApplication(copied);
  assert.equal(app.status, 'draft');
  assert.equal(app.version, 1);
  assert.equal(app.financing.amount, 18_000_000);
  assert.notEqual(app.id, oldVersion.applicationId);
});

test('submitting an application emits canonical cross-module events', () => {
  const initial = createInitialState();
  const next = setApplicationStatus(initial, 'submitted');
  const app = activeApplication(next);
  assert.equal(app.status, 'submitted');
  assert.equal(next.outbox[0].aggregateId, app.id);
  assert.equal(next.outbox[0].type, 'application.submitted');
  assert.deepEqual(next.outbox[0].targetModules, ['advisory', 'admin']);
});

test('application can be withdrawn but terminal funded application cannot be withdrawn', () => {
  const initial = createInitialState();
  const withdrawn = withdrawApplication(initial, initial.activeApplicationId);
  assert.equal(activeApplication(withdrawn).status, 'withdrawn');
  const funded = setApplicationStatus(initial, 'funded', 'PiHub');
  const blocked = withdrawApplication(funded, funded.activeApplicationId);
  assert.equal(activeApplication(blocked).status, 'funded');
});

test('document upload emits document event and increases document completeness', () => {
  const initial = createInitialState();
  const req = initial.documents[0];
  const next = upsertDocument(initial, {
    id: req.id,
    applicationId: req.applicationId,
    category: req.category,
    name: 'audited-2025.pdf',
    mimeType: 'application/pdf',
    size: 1024,
    required: true,
    blobKey: 'blob:test'
  });
  const uploaded = next.documents.find((d) => d.id === req.id);
  assert.equal(uploaded?.status, 'uploaded');
  assert.equal(uploaded?.version, 1);
  assert.equal(next.outbox[0].type, 'document.uploaded');
});

test('responding to a PiHub request transfers ownership back to PiHub and emits Advisory event', () => {
  const initial = createInitialState();
  const request = initial.requests[0];
  const next = respondToRequest(initial, request.id, 'Uploaded the signed FY2025 statements.');
  const updated = next.requests.find((r) => r.id === request.id);
  assert.equal(updated?.status, 'responded');
  assert.equal(updated?.owner, 'pihub');
  assert.equal(next.outbox[0].type, 'request.responded');
  assert.deepEqual(next.outbox[0].targetModules, ['advisory']);
});

test('team invitation and resend both create admin-facing governance events', () => {
  const initial = createInitialState();
  const invited = inviteTeamMember(initial, { name: 'Legal Counsel', email: 'legal@example.com', role: 'legal' });
  const member = invited.team.at(-1);
  assert.equal(member?.status, 'invited');
  assert.equal(invited.outbox[0].type, 'organization.invitation.created');
  assert.deepEqual(invited.outbox[0].targetModules, ['admin']);
  const resent = resendTeamInvitation(invited, member.id);
  assert.equal(resent.outbox[0].type, 'organization.invitation.resent');
});

test('accepting one indicative term rejects competing available terms and advances lifecycle', () => {
  const initial = createInitialState();
  const term = initial.terms[0];
  const next = decideTermSheet(initial, term.id, 'accepted');
  assert.equal(next.terms.find((t) => t.id === term.id)?.status, 'accepted');
  assert.equal(next.terms.find((t) => t.id !== term.id)?.status, 'rejected');
  assert.equal(activeApplication(next).status, 'terms_accepted');
  assert.ok(next.outbox.some((event) => event.type === 'terms.accepted' && event.targetModules.includes('investor')));
});

test('borrower can complete only borrower-owned closing items', () => {
  const initial = createInitialState();
  const borrowerItem = initial.closingItems.find((item) => item.owner === 'borrower');
  const legalItem = initial.closingItems.find((item) => item.owner === 'legal');
  assert.ok(borrowerItem && legalItem);
  const next = toggleClosingItem(initial, borrowerItem.id, true);
  assert.equal(next.closingItems.find((i) => i.id === borrowerItem.id)?.complete, true);
  const blocked = toggleClosingItem(next, legalItem.id, true);
  assert.equal(blocked.closingItems.find((i) => i.id === legalItem.id)?.complete, false);
});

test('notification controls have real persisted state transitions', () => {
  const initial = createInitialState();
  const next = markNotificationRead(initial);
  assert.equal(next.notifications.every((n) => n.read), true);
});

test('product save and compare preferences are real state, with compare capped at three', () => {
  let state = createInitialState();
  state = toggleSavedProduct(state, 'bridge-facility');
  assert.ok(state.savedProductIds.includes('bridge-facility'));
  for (const id of ['a','b','c','d']) state = toggleComparedProduct(state, id);
  assert.deepEqual(state.comparisonProductIds, ['a','b','c']);
  state = toggleComparedProduct(state, 'b');
  assert.deepEqual(state.comparisonProductIds, ['a','c']);
});

test('support request creates an Admin-facing event and visible ticket history', () => {
  const initial = createInitialState();
  const next = createSupportTicket(initial, { category: 'documents', subject: 'Upload problem', message: 'The PDF will not upload.' });
  assert.equal(next.supportTickets.length, 1);
  assert.equal(next.supportTickets[0].status, 'open');
  assert.equal(next.outbox[0].type, 'support.request.created');
  assert.deepEqual(next.outbox[0].targetModules, ['admin']);
});

test('completion percentage incorporates required document state', () => {
  const initial = createInitialState();
  const app = activeApplication(initial);
  const before = completionPercentage(app, initial.documents);
  assert.equal(before, 80);
  let next = initial;
  for (const req of initial.documents) {
    next = upsertDocument(next, { id: req.id, applicationId: req.applicationId, category: req.category, name: `${req.id}.pdf`, mimeType: 'application/pdf', size: 100, required: true, blobKey: `blob:${req.id}` });
  }
  const after = completionPercentage(activeApplication(next), next.documents);
  assert.equal(after, 100);
});

test('schema-v2 browser state migrates into the current schema without losing applications', () => {
  const initial = createInitialState();
  const legacy = { ...initial, schemaVersion: 2, savedProductIds: undefined, applicationVersions: undefined, supportTickets: undefined, comparisonProductIds: undefined };
  const migrated = migrateState(legacy);
  assert.equal(migrated.schemaVersion, 5);
  assert.equal(migrated.applications.length, initial.applications.length);
  assert.ok(migrated.applicationVersions.length >= 1);
  assert.deepEqual(migrated.supportTickets, []);
});


test('funded application activation creates a canonical facility and downstream event', () => {
  const initial = createInitialState();
  const next = setApplicationStatus(initial, 'funded', 'PiHub');
  const app = activeApplication(next);
  const facility = next.facilities.find((item) => item.applicationId === app.id);
  assert.ok(facility);
  assert.equal(facility?.originalAmount, app.financing.amount);
  assert.ok(next.outbox.some((event) => event.type === 'facility.activated' && event.aggregateId === facility?.id));
});

test('servicing request has a complete borrower start and withdraw lifecycle', () => {
  const initial = createInitialState();
  const facility = initial.facilities[0];
  const submitted = createServicingRequest(initial, {
    facilityId: facility.id,
    type: 'waiver',
    subject: 'Temporary covenant waiver',
    description: 'Request a temporary waiver while an updated valuation is completed.'
  });
  const request = submitted.servicingRequests[0];
  assert.equal(request.status, 'submitted');
  assert.ok(submitted.outbox.some((event) => event.type === 'servicing.request.submitted' && event.aggregateId === request.id));
  assert.deepEqual(submitted.outbox.find((event) => event.aggregateId === request.id)?.targetModules, ['advisory', 'investor', 'admin']);
  const withdrawn = withdrawServicingRequest(submitted, request.id);
  assert.equal(withdrawn.servicingRequests.find((item) => item.id === request.id)?.status, 'withdrawn');
  assert.ok(withdrawn.outbox.some((event) => event.type === 'servicing.request.withdrawn' && event.aggregateId === request.id));
});

test('payment reporting creates a reconciliation request without falsely settling the payment', () => {
  const initial = createInitialState();
  const payment = nextFacilityPayment(initial, initial.facilities[0].id);
  assert.ok(payment);
  const next = reportPaymentMade(initial, payment.id, 'Paid by bank transfer, reference ABC-001.');
  assert.equal(next.paymentSchedule.find((item) => item.id === payment.id)?.status, payment.status);
  assert.equal(next.servicingRequests[0]?.type, 'payment_notice');
  assert.match(next.servicingRequests[0]?.subject ?? '', /Payment notice/);
});

test('facility health exposes covenant and reporting obligations without investor-only analytics', () => {
  const initial = createInitialState();
  const health = facilityHealth(initial, initial.facilities[0].id);
  assert.equal(health.covenantStatus, 'compliant');
  assert.equal(health.outstandingReporting, 3);
});

test('periodic reporting submission is persisted and emitted to Advisory and Investor', () => {
  const initial = createInitialState();
  const obligation = initial.reportingObligations[0];
  const next = submitReportingObligation(initial, obligation.id, 'DOC-REPORT-001');
  assert.equal(next.reportingObligations.find((item) => item.id === obligation.id)?.status, 'submitted');
  const event = next.outbox.find((item) => item.aggregateId === obligation.id && item.type === 'reporting.submitted');
  assert.ok(event);
  assert.deepEqual(event?.targetModules, ['advisory', 'investor']);
});

test('privacy rights create Admin/Compliance requests and reject duplicate active requests', () => {
  const initial = createInitialState();
  const requested = createPrivacyRequest(initial, 'export', 'Please include my Borrower account data.');
  assert.equal(requested.privacyRequests.length, 1);
  assert.equal(requested.privacyRequests[0].status, 'submitted');
  assert.ok(requested.outbox.some((event) => event.type === 'privacy.request.submitted' && event.targetModules.includes('admin')));
  const duplicate = createPrivacyRequest(requested, 'export', 'Second request');
  assert.equal(duplicate.privacyRequests.length, 1);
});

test('schema-v3 state migrates post-funding collections safely', () => {
  const initial = createInitialState();
  const legacy = {
    ...initial,
    schemaVersion: 3,
    facilities: undefined,
    paymentSchedule: undefined,
    covenants: undefined,
    reportingObligations: undefined,
    servicingRequests: undefined,
    privacyRequests: undefined
  };
  const migrated = migrateState(legacy);
  assert.equal(migrated.schemaVersion, 5);
  assert.deepEqual(migrated.facilities, []);
  assert.deepEqual(migrated.servicingRequests, []);
  assert.deepEqual(migrated.privacyRequests, []);
});

import { applyAdvancedAction, calculateMatches, calculatePrequalification, deriveDeadlines, scenarioMetrics, workflowProfileForApplication, workflowReadiness } from '../.core-build/state/advanced.js';

test('product-aware prequalification produces explainable readiness and matches', () => {
  const initial = createInitialState();
  const assessment = calculatePrequalification(initial, initial.activeApplicationId);
  const matches = calculateMatches(initial, initial.activeApplicationId);
  assert.ok(assessment);
  assert.ok(assessment.score >= 0 && assessment.score <= 100);
  assert.ok(Array.isArray(assessment.reasons));
  assert.ok(matches.length > 0);
  assert.ok(matches.every((m) => m.reasons.length + m.gaps.length > 0));
  const next = applyAdvancedAction(initial, { type: 'prequalify', applicationId: initial.activeApplicationId });
  assert.ok(next.advanced.prequalification.length > 0);
  assert.ok(next.advanced.matches.length > 0);
});

test('construction draw lifecycle creates a borrower request then an Advisory/Investor handoff', () => {
  const initial = createInitialState();
  const appId = initial.activeApplicationId;
  const created = applyAdvancedAction(initial, { type: 'create_draw', applicationId: appId, requestedAmount: 250000, neededBy: '2026-10-15', note: 'First progress draw', lineItems: [] });
  const draw = created.advanced.drawRequests[0];
  assert.equal(draw.status, 'draft');
  const submitted = applyAdvancedAction(created, { type: 'submit_draw', drawRequestId: draw.id });
  assert.equal(submitted.advanced.drawRequests.find((d) => d.id === draw.id)?.status, 'submitted');
  assert.ok(submitted.outbox.some((e) => e.type === 'construction.draw.submitted' && e.targetModules.includes('advisory') && e.targetModules.includes('investor')));
});

test('inspection requests are linked to the canonical application and workflow', () => {
  const initial = createInitialState();
  const next = applyAdvancedAction(initial, { type: 'request_inspection', applicationId: initial.activeApplicationId, inspectionType: 'progress', preferredDate: '2026-10-10' });
  assert.equal(next.advanced.inspections[0].applicationId, initial.activeApplicationId);
  assert.ok(next.outbox.some((e) => e.type === 'construction.inspection.requested'));
});

test('connected-data source tracks consent/sync state and data freshness confirmation', () => {
  const initial = createInitialState();
  const connected = applyAdvancedAction(initial, { type: 'connect_source', provider: 'datev', label: 'DATEV accounting', scope: ['ledger','balances'] });
  const connection = connected.advanced.connections[0];
  assert.ok(connection);
  const synced = applyAdvancedAction(connected, { type: 'sync_source', connectionId: connection.id });
  assert.equal(synced.advanced.connections.find((c) => c.id === connection.id)?.status, 'connected');
  const freshness = synced.advanced.freshness[0];
  if (freshness) {
    const confirmed = applyAdvancedAction(synced, { type: 'confirm_freshness', freshnessId: freshness.id });
    assert.equal(confirmed.advanced.freshness.find((f) => f.id === freshness.id)?.status, 'fresh');
  }
});

test('document intelligence produces borrower-reviewable extraction rather than silent mutation', () => {
  const initial = createInitialState();
  const doc = initial.documents[0];
  const next = applyAdvancedAction(initial, { type: 'analyze_document', documentId: doc.id });
  const analysis = next.advanced.documentIntelligence.find((a) => a.documentId === doc.id);
  assert.ok(analysis);
  assert.ok(['processed','needs_review'].includes(analysis.status));
  assert.ok(analysis.predictedCategory);
});

test('disclosure consent is revocable and emits audit-oriented cross-module events', () => {
  const initial = createInitialState();
  const appId = initial.activeApplicationId;
  const docIds = initial.documents.filter((d) => d.applicationId === appId).slice(0,2).map((d) => d.id);
  const granted = applyAdvancedAction(initial, { type: 'create_disclosure', applicationId: appId, providerName: 'Example Credit Fund', providerType: 'lender', documentIds: docIds, purpose: 'Indicative credit review' });
  const grant = granted.advanced.disclosures[0];
  assert.equal(grant.status, 'active');
  const revoked = applyAdvancedAction(granted, { type: 'revoke_disclosure', disclosureId: grant.id });
  assert.equal(revoked.advanced.disclosures.find((d) => d.id === grant.id)?.status, 'revoked');
  assert.ok(revoked.outbox.some((e) => e.type === 'disclosure.consent.revoked'));
});

test('scenario lab computes leverage, debt service and all-in cost without changing authoritative terms', () => {
  const initial = createInitialState();
  const scenario = { applicationId: initial.activeApplicationId, name: 'Base case', amount: 10000000, tenorMonths: 24, referenceRatePct: 2.5, marginBps: 550, feesPct: 1, amortizationPct: 2, equity: 4000000, propertyValue: 16000000, projectedAnnualNOI: 1600000 };
  const metrics = scenarioMetrics({ ...scenario, id: 'S', createdAt: new Date().toISOString() });
  assert.equal(Math.round(metrics.ltv * 10) / 10, 62.5);
  assert.ok(metrics.debtService > 0);
  assert.ok(metrics.allInCost > 0);
  const next = applyAdvancedAction(initial, { type: 'save_scenario', scenario });
  assert.equal(next.advanced.scenarios[0].name, 'Base case');
});

test('term negotiation and e-sign package preserve explicit lender/advisory boundaries', () => {
  const initial = createInitialState();
  const term = initial.terms.find((t) => t.applicationId === initial.activeApplicationId) ?? initial.terms[0];
  const messaged = applyAdvancedAction(initial, { type: 'send_negotiation_message', applicationId: term.applicationId, termSheetId: term.id, body: 'Can the amortization be reduced in year one?' });
  assert.equal(messaged.advanced.negotiations[0].messages.length, 1);
  const countered = applyAdvancedAction(messaged, { type: 'submit_counter', applicationId: term.applicationId, termSheetId: term.id, field: 'Margin', requestedValue: '500 bps', rationale: 'Lower leverage and additional equity.' });
  assert.equal(countered.advanced.negotiations[0].counters.length, 1);
  const envelope = applyAdvancedAction(countered, { type: 'create_signature_envelope', applicationId: term.applicationId, title: 'Indicative term acknowledgement', documentIds: [], signerEmails: ['borrower@example.com'], provider: 'demo' });
  assert.equal(envelope.advanced.signatureEnvelopes[0].status, 'sent');
});

test('payment instructions require verification and covenant forecasts remain separate from actual compliance', () => {
  const initial = createInitialState();
  const facility = initial.facilities[0];
  const withInstruction = applyAdvancedAction(initial, { type: 'create_payment_instruction', facilityId: facility.id, label: 'Treasury account', ibanMasked: 'DE••1234', accountHolder: initial.organization.name, mandateType: 'sepa_direct_debit' });
  assert.equal(withInstruction.advanced.paymentInstructions[0].status, 'pending_verification');
  const covenant = initial.covenants[0];
  const forecasted = applyAdvancedAction(withInstruction, { type: 'save_covenant_forecast', covenantId: covenant.id, testDate: covenant.nextTestDate, forecastValue: covenant.threshold, assumption: 'Base case' });
  assert.equal(forecasted.covenants[0].status, initial.covenants[0].status);
  assert.ok(forecasted.advanced.covenantForecasts.length > 0);
});

test('external professionals are application-scoped, time-limited and revocable', () => {
  const initial = createInitialState();
  const invited = applyAdvancedAction(initial, { type: 'invite_professional', professional: { name: 'External Counsel', email: 'counsel@example.com', profession: 'lawyer', applicationIds: [initial.activeApplicationId], permissions: ['view_documents'], expiresAt: '2026-12-31' } });
  const person = invited.advanced.professionals[0];
  assert.equal(person.status, 'invited');
  assert.deepEqual(person.applicationIds, [initial.activeApplicationId]);
  const revoked = applyAdvancedAction(invited, { type: 'revoke_professional', professionalId: person.id });
  assert.equal(revoked.advanced.professionals.find((p) => p.id === person.id)?.status, 'revoked');
});

test('calendar aggregates obligations across origination, closing and servicing', () => {
  const initial = createInitialState();
  const deadlines = deriveDeadlines(initial);
  assert.ok(deadlines.some((d) => d.kind === 'request'));
  assert.ok(deadlines.some((d) => d.kind === 'payment'));
  assert.ok(deadlines.some((d) => d.kind === 'covenant'));
  assert.ok(deadlines.every((d) => d.href.startsWith('/')));
});

test('complaints, exports and Copilot create persistent borrower-visible outcomes', () => {
  const initial = createInitialState();
  const complaint = applyAdvancedAction(initial, { type: 'create_complaint', complaint: { applicationId: initial.activeApplicationId, category: 'service', subject: 'Response timing', description: 'Please review the outstanding request timeline.' } });
  assert.ok(complaint.advanced.complaints[0].reference);
  const exported = applyAdvancedAction(complaint, { type: 'create_export', applicationId: initial.activeApplicationId, format: 'csv_manifest', includedSections: ['documents','requests'] });
  assert.equal(exported.advanced.exportPackages[0].status, 'ready');
  const copiloted = applyAdvancedAction(exported, { type: 'copilot_ask', body: 'Which documents are missing?' });
  assert.equal(copiloted.advanced.copilot.at(-2)?.role, 'user');
  assert.equal(copiloted.advanced.copilot.at(-1)?.role, 'assistant');
});


test('product-aware workflow changes submission requirements by financing structure', () => {
  const initial = createInitialState();
  const constructionProfile = workflowProfileForApplication(initial, initial.activeApplicationId);
  assert.equal(constructionProfile.kind, 'construction');
  const construction = workflowReadiness(initial, initial.activeApplicationId);
  assert.ok(construction.steps.some((step) => step.id === 'capital-plan'));
  assert.ok(construction.steps.some((step) => step.id === 'product-documents'));

  const withBridge = createApplication(initial, { name: 'Bridge refinance', productId: 'bridge-facility' });
  const bridge = workflowReadiness(withBridge, withBridge.activeApplicationId);
  assert.equal(bridge.profile.kind, 'bridge');
  assert.ok(bridge.steps.some((step) => step.id === 'bridge-exit'));
});

test('product-aware readiness is blocking until its deal-specific evidence is complete', () => {
  const initial = createInitialState();
  const readiness = workflowReadiness(initial, initial.activeApplicationId);
  assert.equal(readiness.ready, false);
  assert.ok(readiness.blockers.length > 0);
  assert.ok(readiness.percentage >= 0 && readiness.percentage <= 100);
});
