import { createAdvancedInitialState } from './advanced.js';
import type {
  Application,
  ApplicationStatus,
  ApplicationVersion,
  BorrowerDocument,
  BorrowerState,
  ClosingItem,
  Covenant,
  Facility,
  IntegrationEvent,
  ModuleId,
  Notification,
  PaymentScheduleItem,
  PrivacyRequest,
  ReportingObligation,
  RequestThread,
  ServicingRequest,
  SupportTicket,
  TeamMember,
  TermSheet
} from './model.js';

const now = () => new Date().toISOString();
let seq = 0;
const id = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(++seq).toString(36)}`;
const cloneApplication = (app: Application): Application => JSON.parse(JSON.stringify(app)) as Application;

const blankApplication = (applicationId = 'PH-2026-0147'): Application => ({
  id: applicationId,
  organizationId: 'ORG-BERLIN-01',
  name: 'Berlin Residential Development',
  status: 'draft',
  createdAt: now(),
  updatedAt: now(),
  financing: {
    productId: 'senior-development-facility',
    purpose: 'Development financing',
    amount: 18_000_000,
    currency: 'EUR',
    desiredFundingDate: '2026-10-15',
    tenorMonths: 24,
    structure: 'Senior development facility',
    useOfProceeds: 'Construction, acquisition refinance and project costs',
    sponsorEquity: 6_500_000,
    existingDebt: 11_500_000,
    repaymentProfile: 'Repayment from unit sales and refinance of the retained rental block.'
  },
  company: {
    legalName: 'Berlin Urban Living GmbH',
    registrationNumber: 'HRB 204817 B',
    legalForm: 'GmbH',
    country: 'Germany',
    city: 'Berlin',
    website: 'https://example.com',
    industry: 'Real estate development',
    description: 'Residential development sponsor focused on urban infill projects.',
    ownershipSummary: 'Privately held sponsor company with two individual beneficial owners.',
    uboNames: 'Marta Klein (60%); Jonas Weber (40%)',
    bankingRelationships: 'Two German commercial banks and one specialist real-estate lender.',
    revenue: 38_000_000,
    ebitda: 6_400_000,
    employees: 42
  },
  project: {
    name: 'Berlin Residential Development',
    location: 'Berlin, Germany',
    assetClass: 'Residential',
    stage: 'Construction',
    acquisitionPrice: 12_000_000,
    constructionBudget: 20_500_000,
    grossDevelopmentValue: 45_000_000,
    expectedCompletion: '2027-09-30',
    planningStatus: 'Building permit granted; remaining technical approvals in progress.',
    preSalesOrLeasing: '28% of residential units reserved; retained rental block pre-marketing underway.',
    valuation: 45_000_000,
    exitStrategy: 'Unit sales with retained rental block',
    sustainability: 'KfW-aligned energy efficiency target'
  },
  financials: {
    revenue2024: 31_000_000,
    revenue2025: 38_000_000,
    ebitda2024: 5_100_000,
    ebitda2025: 6_400_000,
    cash: 4_800_000,
    debt: 11_500_000,
    equity: 22_000_000,
    forecastNote: 'Base case assumes phased sales beginning Q1 2027.'
  },
  sectionCompletion: { financing: true, company: true, project: true, financials: true, documents: false },
  version: 1
});

function makeVersion(app: Application, reason: string, actor: string): ApplicationVersion {
  return { id: id('VER'), applicationId: app.id, version: app.version, reason, actor, createdAt: now(), snapshot: cloneApplication(app) };
}

export function createInitialState(): BorrowerState {
  const app = blankApplication();
  const fundedApp = blankApplication('PH-2025-0098');
  fundedApp.name = 'Northern Germany Mixed-Use Portfolio';
  fundedApp.status = 'funded';
  fundedApp.financing = { ...fundedApp.financing, productId: 'bridge-facility', purpose: 'Shareholder loan refinance and development costs', amount: 3_700_000, tenorMonths: 24, structure: 'Collateral-based bridge facility', sponsorEquity: 2_300_000, existingDebt: 1_900_000, repaymentProfile: 'Refinance and asset-level disposals across the mixed-use portfolio.' };
  fundedApp.project = { ...fundedApp.project, name: 'Northern Germany Mixed-Use Portfolio', location: 'Northern Germany', assetClass: 'Mixed use', grossDevelopmentValue: 12_500_000, valuation: 9_250_000, sustainability: 'Climate-neutral energy systems and e-mobility infrastructure' };
  fundedApp.sectionCompletion = { financing: true, company: true, project: true, financials: true, documents: true };
  fundedApp.submittedAt = '2025-01-10T09:00:00.000Z';
  const baseNow = now();
  return {
    schemaVersion: 5,
    locale: 'en',
    activeApplicationId: app.id,
    organization: { id: 'ORG-BERLIN-01', name: 'Berlin Urban Living GmbH', verificationStatus: 'pending' },
    applications: [app, fundedApp],
    applicationVersions: [makeVersion(app, 'Application created', 'Borrower'), makeVersion(fundedApp, 'Funded facility snapshot', 'PiHub')],
    documents: [
      { id: 'DOC-REQ-001', applicationId: app.id, category: 'Financials', name: 'FY2025 audited financial statements', requirementLabel: 'FY2025 audited financial statements', mimeType: 'application/pdf', size: 0, status: 'required', required: true, version: 0, dueDate: '2026-09-02' },
      { id: 'DOC-REQ-002', applicationId: app.id, category: 'Project', name: 'Current project cost plan', requirementLabel: 'Current project cost plan', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', size: 0, status: 'required', required: true, version: 0, dueDate: '2026-09-02' }
    ],
    requests: [
      {
        id: 'REQ-1004', applicationId: app.id, title: 'Upload updated FY2025 audited statements',
        description: 'Please provide the final signed audited financial statements for FY2025.',
        status: 'open', owner: 'borrower', createdBy: 'advisory', dueDate: '2026-09-02', priority: 'high',
        messages: [{ id: 'MSG-1', author: 'pihub', text: 'Please upload the signed FY2025 statements and include the auditor report.', createdAt: baseNow }]
      },
      {
        id: 'REQ-1005', applicationId: app.id, title: 'Confirm sponsor equity contribution',
        description: 'Confirm amount already invested and remaining equity injection schedule.',
        status: 'open', owner: 'borrower', createdBy: 'advisory', dueDate: '2026-09-04', priority: 'normal', messages: []
      }
    ],
    notifications: [
      { id: 'NOT-1', kind: 'request', title: 'New PiHub request', body: 'FY2025 audited statements requested', href: '/requests', read: false, createdAt: baseNow },
      { id: 'NOT-2', kind: 'status', title: 'Application review scheduled', body: 'Next PiHub review: 28 Aug 2026', href: '/', read: false, createdAt: baseNow }
    ],
    activity: [
      { id: 'ACT-1', applicationId: app.id, type: 'application.created', label: 'Application created', detail: app.name, actor: 'Borrower', createdAt: baseNow },
      { id: 'ACT-2', applicationId: app.id, type: 'request.created', label: 'PiHub requested information', detail: 'FY2025 audited financial statements', actor: 'PiHub Advisory', createdAt: baseNow }
    ],
    outbox: [],
    team: [
      { id: 'TEAM-1', name: 'Marta Klein', email: 'marta.klein@example.com', role: 'owner', status: 'active' },
      { id: 'TEAM-2', name: 'Jonas Weber', email: 'jonas.weber@example.com', role: 'finance', status: 'active' }
    ],
    terms: [
      { id: 'TERM-1', applicationId: app.id, provider: 'Demo Private Credit Fund', amount: 18_000_000, marginBps: 575, referenceRate: '3M EURIBOR', tenorMonths: 24, ltv: 68, fees: 1.5, expiryDate: '2026-09-30', status: 'available' },
      { id: 'TERM-2', applicationId: app.id, provider: 'European Real Estate Credit Fund', amount: 16_500_000, marginBps: 525, referenceRate: '3M EURIBOR', tenorMonths: 30, ltv: 64, fees: 1.25, expiryDate: '2026-10-03', status: 'available' }
    ],
    closingItems: [
      { id: 'CP-1', applicationId: app.id, title: 'Authorized signatory confirmation', owner: 'borrower', required: true, complete: false, dueDate: '2026-09-20' },
      { id: 'CP-2', applicationId: app.id, title: 'Final corporate approvals', owner: 'borrower', required: true, complete: false, dueDate: '2026-09-22' },
      { id: 'CP-3', applicationId: app.id, title: 'Facility agreement execution', owner: 'legal', required: true, complete: false, dueDate: '2026-09-25' }
    ],
    savedProductIds: ['senior-development-facility'],
    comparisonProductIds: [],
    supportTickets: [],
    facilities: [
      { id: 'FAC-2025-0098', applicationId: fundedApp.id, provider: 'PiHub Private Credit Network', originalAmount: 3_700_000, outstandingAmount: 3_700_000, currency: 'EUR', referenceRate: '3M EURIBOR', marginBps: 625, startDate: '2025-04-01', maturityDate: '2027-03-31', securitySummary: 'First-ranking asset security and portfolio-level guarantees', status: 'active', nextPaymentDate: '2026-10-01' }
    ],
    paymentSchedule: [
      { id: 'PAY-1', facilityId: 'FAC-2025-0098', dueDate: '2026-07-01', principal: 0, interest: 78_125, fees: 0, status: 'paid', paidAt: '2026-07-01T10:00:00.000Z' },
      { id: 'PAY-2', facilityId: 'FAC-2025-0098', dueDate: '2026-10-01', principal: 0, interest: 78_125, fees: 0, status: 'scheduled' },
      { id: 'PAY-3', facilityId: 'FAC-2025-0098', dueDate: '2027-01-01', principal: 0, interest: 78_125, fees: 0, status: 'scheduled' },
      { id: 'PAY-4', facilityId: 'FAC-2025-0098', dueDate: '2027-03-31', principal: 3_700_000, interest: 78_125, fees: 0, status: 'scheduled' }
    ],
    covenants: [
      { id: 'COV-1', facilityId: 'FAC-2025-0098', name: 'Maximum LTV', metric: 'Loan-to-value', operator: '<=', threshold: 65, currentValue: 40, unit: '%', nextTestDate: '2026-09-30', status: 'compliant' },
      { id: 'COV-2', facilityId: 'FAC-2025-0098', name: 'Minimum interest cover', metric: 'ICR', operator: '>=', threshold: 1.5, currentValue: 2.1, unit: 'x', nextTestDate: '2026-09-30', status: 'compliant' }
    ],
    reportingObligations: [
      { id: 'REP-1', facilityId: 'FAC-2025-0098', title: 'Quarterly management accounts', frequency: 'quarterly', dueDate: '2026-10-20', status: 'required' },
      { id: 'REP-2', facilityId: 'FAC-2025-0098', title: 'Updated project progress report', frequency: 'quarterly', dueDate: '2026-10-20', status: 'required' },
      { id: 'REP-3', facilityId: 'FAC-2025-0098', title: 'Annual compliance certificate', frequency: 'annual', dueDate: '2027-01-31', status: 'required' }
    ],
    servicingRequests: [],
    privacyRequests: [],
    advanced: createAdvancedInitialState(),
    profile: { name: 'Marta Klein', email: 'marta.klein@example.com', phone: '+49 30 555 0182', jobTitle: 'Managing Director', notificationEmail: true },
    lastSavedAt: baseNow
  };
}

function normalizeApplication(input: Partial<Application>, fallback: Application): Application {
  return {
    ...fallback,
    ...input,
    financing: { ...fallback.financing, ...(input.financing ?? {}) },
    company: { ...fallback.company, ...(input.company ?? {}) },
    project: { ...fallback.project, ...(input.project ?? {}) },
    financials: { ...fallback.financials, ...(input.financials ?? {}) },
    sectionCompletion: { ...fallback.sectionCompletion, ...(input.sectionCompletion ?? {}) }
  };
}

export function migrateState(input: unknown): BorrowerState {
  const fresh = createInitialState();
  if (!input || typeof input !== 'object') return fresh;
  const source = input as Omit<Partial<BorrowerState>, 'schemaVersion'> & { schemaVersion?: number };
  if (![2, 3, 4, 5].includes(source.schemaVersion ?? 0)) return fresh;
  const applications = Array.isArray(source.applications) && source.applications.length
    ? source.applications.map((item, index) => normalizeApplication(item, index === 0 ? blankApplication(item.id) : blankApplication(item.id)))
    : fresh.applications;
  const activeApplicationId = applications.some((app) => app.id === source.activeApplicationId) ? source.activeApplicationId! : applications[0].id;
  return {
    ...fresh,
    ...source,
    schemaVersion: 5,
    applications,
    activeApplicationId,
    applicationVersions: Array.isArray(source.applicationVersions) && source.applicationVersions.length
      ? source.applicationVersions
      : applications.map((app) => makeVersion(app, 'Migrated application snapshot', 'System')),
    documents: Array.isArray(source.documents) ? source.documents : fresh.documents,
    requests: Array.isArray(source.requests) ? source.requests : fresh.requests,
    notifications: Array.isArray(source.notifications) ? source.notifications : fresh.notifications,
    activity: Array.isArray(source.activity) ? source.activity : fresh.activity,
    outbox: Array.isArray(source.outbox) ? source.outbox : fresh.outbox,
    team: Array.isArray(source.team) ? source.team : fresh.team,
    terms: Array.isArray(source.terms) ? source.terms : fresh.terms,
    closingItems: Array.isArray(source.closingItems) ? source.closingItems : fresh.closingItems,
    savedProductIds: Array.isArray(source.savedProductIds) ? source.savedProductIds : [],
    comparisonProductIds: Array.isArray(source.comparisonProductIds) ? source.comparisonProductIds : [],
    supportTickets: Array.isArray(source.supportTickets) ? source.supportTickets : [],
    // Never inject demo servicing records into a migrated real browser state.
    facilities: Array.isArray(source.facilities) ? source.facilities : [],
    paymentSchedule: Array.isArray(source.paymentSchedule) ? source.paymentSchedule : [],
    covenants: Array.isArray(source.covenants) ? source.covenants : [],
    reportingObligations: Array.isArray(source.reportingObligations) ? source.reportingObligations : [],
    servicingRequests: Array.isArray(source.servicingRequests) ? source.servicingRequests : [],
    privacyRequests: Array.isArray(source.privacyRequests) ? source.privacyRequests : [],
    advanced: source.advanced && typeof source.advanced === 'object' ? { ...fresh.advanced, ...source.advanced } : fresh.advanced
  } as BorrowerState;
}

function withSaved(state: BorrowerState): BorrowerState {
  return { ...state, lastSavedAt: now() };
}

function addActivity(state: BorrowerState, event: Omit<BorrowerState['activity'][number], 'id' | 'createdAt'>): BorrowerState {
  return { ...state, activity: [{ ...event, id: id('ACT'), createdAt: now() }, ...state.activity] };
}

function recordVersion(state: BorrowerState, app: Application, reason: string, actor = 'Borrower'): BorrowerState {
  return { ...state, applicationVersions: [makeVersion(app, reason, actor), ...state.applicationVersions] };
}

function emit(state: BorrowerState, aggregateType: IntegrationEvent['aggregateType'], aggregateId: string, type: string, targetModules: ModuleId[], payload: Record<string, unknown>): BorrowerState {
  const evt: IntegrationEvent = { id: id('EVT'), aggregateType, aggregateId, type, targetModules, payload, createdAt: now(), state: 'queued' };
  return { ...state, outbox: [evt, ...state.outbox] };
}

function notify(state: BorrowerState, notification: Omit<Notification, 'id' | 'createdAt' | 'read'>): BorrowerState {
  return { ...state, notifications: [{ ...notification, id: id('NOT'), createdAt: now(), read: false }, ...state.notifications] };
}

export function activeApplication(state: BorrowerState): Application {
  const app = state.applications.find((item) => item.id === state.activeApplicationId);
  if (!app) throw new Error('Active application missing');
  return app;
}

export function setActiveApplication(state: BorrowerState, applicationId: string): BorrowerState {
  if (!state.applications.some((app) => app.id === applicationId)) return state;
  return withSaved({ ...state, activeApplicationId: applicationId });
}

export function completionPercentage(app: Application, documents: BorrowerDocument[]): number {
  const required = documents.filter((doc) => doc.applicationId === app.id && doc.required);
  const docsComplete = required.length === 0 || required.every((doc) => ['uploaded', 'under_review', 'accepted'].includes(doc.status));
  const completed = [
    app.sectionCompletion.financing,
    app.sectionCompletion.company,
    app.sectionCompletion.project,
    app.sectionCompletion.financials,
    docsComplete
  ].filter(Boolean).length;
  return Math.max(0, Math.min(100, Math.round((completed / 5) * 100)));
}

export function createApplication(state: BorrowerState, input: Pick<Application, 'name'> & { productId?: string | null }): BorrowerState {
  const next = blankApplication(`PH-${new Date().getFullYear()}-${String(state.applications.length + 147).padStart(4, '0')}`);
  next.name = input.name.trim() || 'Untitled financing request';
  next.financing.productId = input.productId ?? null;
  next.sectionCompletion = { financing: false, company: false, project: false, financials: false, documents: false };
  next.financing = { ...next.financing, purpose: '', amount: 0, useOfProceeds: '', existingDebt: 0, repaymentProfile: '' };
  next.company = { ...next.company, legalName: '', registrationNumber: '', description: '', ownershipSummary: '', uboNames: '', bankingRelationships: '' };
  next.project = { ...next.project, name: '', location: '', exitStrategy: '', planningStatus: '', preSalesOrLeasing: '', valuation: 0 };
  let result: BorrowerState = { ...state, applications: [next, ...state.applications], activeApplicationId: next.id };
  result = recordVersion(result, next, 'Application created');
  result = addActivity(result, { applicationId: next.id, type: 'application.created', label: 'New financing application started', detail: next.name, actor: 'Borrower' });
  return withSaved(result);
}

export function createDraftFromVersion(state: BorrowerState, versionId: string): BorrowerState {
  const version = state.applicationVersions.find((item) => item.id === versionId);
  if (!version) return state;
  const base = cloneApplication(version.snapshot);
  const newId = `PH-${new Date().getFullYear()}-${String(state.applications.length + 147).padStart(4, '0')}`;
  const next: Application = { ...base, id: newId, name: `${base.name} - copy`, status: 'draft', createdAt: now(), updatedAt: now(), submittedAt: undefined, version: 1 };
  let result: BorrowerState = { ...state, applications: [next, ...state.applications], activeApplicationId: next.id };
  result = recordVersion(result, next, `Draft copied from ${version.applicationId} v${version.version}`);
  result = addActivity(result, { applicationId: next.id, type: 'application.version.copied', label: 'Draft created from prior version', detail: `${version.applicationId} v${version.version}`, actor: 'Borrower' });
  return withSaved(result);
}

export function updateApplicationSection<K extends keyof Pick<Application, 'financing' | 'company' | 'project' | 'financials'>>(
  state: BorrowerState,
  section: K,
  patch: Partial<Application[K]>,
  complete = true
): BorrowerState {
  const app = activeApplication(state);
  const nextSection = { ...app[section], ...patch } as Application[K];
  if (JSON.stringify(nextSection) === JSON.stringify(app[section]) && app.sectionCompletion[section] === complete) return state;
  const nextApp: Application = {
    ...app,
    [section]: nextSection,
    sectionCompletion: { ...app.sectionCompletion, [section]: complete },
    updatedAt: now(),
    version: app.version + 1
  };
  let result = { ...state, applications: state.applications.map((item) => item.id === app.id ? nextApp : item) };
  result = recordVersion(result, nextApp, `${String(section)} information updated`);
  result = addActivity(result, { applicationId: app.id, type: `application.${String(section)}.updated`, label: `${String(section)} information updated`, actor: 'Borrower' });
  return withSaved(result);
}

function createFacilityForApplication(state: BorrowerState, applicationId: string): BorrowerState {
  if (state.facilities.some((facility) => facility.applicationId === applicationId)) return state;
  const app = state.applications.find((item) => item.id === applicationId);
  if (!app) return state;
  const accepted = state.terms.find((term) => term.applicationId === applicationId && term.status === 'accepted');
  const start = new Date();
  const maturity = new Date(start);
  maturity.setMonth(maturity.getMonth() + (accepted?.tenorMonths ?? app.financing.tenorMonths ?? 24));
  const facility: Facility = {
    id: id('FAC'), applicationId, provider: accepted?.provider ?? 'PiHub financing provider', originalAmount: accepted?.amount ?? app.financing.amount, outstandingAmount: accepted?.amount ?? app.financing.amount, currency: 'EUR', referenceRate: accepted?.referenceRate ?? '3M EURIBOR', marginBps: accepted?.marginBps ?? 600, startDate: start.toISOString().slice(0, 10), maturityDate: maturity.toISOString().slice(0, 10), securitySummary: 'Security package documented during closing', status: 'active'
  };
  let result = { ...state, facilities: [facility, ...state.facilities] };
  result = emit(result, 'facility', facility.id, 'facility.activated', ['advisory', 'investor', 'admin'], { applicationId, provider: facility.provider, originalAmount: facility.originalAmount, maturityDate: facility.maturityDate });
  return result;
}

export function setApplicationStatus(state: BorrowerState, status: ApplicationStatus, actor = 'Borrower'): BorrowerState {
  const app = activeApplication(state);
  const nextApp: Application = { ...app, status, updatedAt: now(), version: app.version + 1, ...(status === 'submitted' ? { submittedAt: now() } : {}) };
  let result = { ...state, applications: state.applications.map((item) => item.id === app.id ? nextApp : item) };
  result = recordVersion(result, nextApp, `Status changed to ${status.replaceAll('_', ' ')}`, actor);
  result = addActivity(result, { applicationId: app.id, type: `application.${status}`, label: `Application moved to ${status.replaceAll('_', ' ')}`, actor });
  const targets: ModuleId[] = status === 'submitted' ? ['advisory', 'admin'] : ['advisory'];
  result = emit(result, 'application', app.id, `application.${status}`, targets, { status, version: nextApp.version, organizationId: app.organizationId });
  result = notify(result, { kind: 'status', title: 'Application status updated', body: status.replaceAll('_', ' '), href: '/' });
  if (status === 'funded') result = createFacilityForApplication(result, app.id);
  return withSaved(result);
}

export function withdrawApplication(state: BorrowerState, applicationId: string): BorrowerState {
  const current = state.applications.find((app) => app.id === applicationId);
  if (!current || ['funded', 'withdrawn', 'archived'].includes(current.status)) return state;
  const switched = setActiveApplication(state, applicationId);
  return setApplicationStatus(switched, 'withdrawn', 'Borrower');
}

export function upsertDocument(state: BorrowerState, document: Omit<BorrowerDocument, 'id' | 'version' | 'status' | 'uploadedAt'> & { id?: string }): BorrowerState {
  const existing = document.id ? state.documents.find((item) => item.id === document.id) : undefined;
  const next: BorrowerDocument = {
    ...(existing ?? {} as BorrowerDocument),
    ...document,
    id: existing?.id ?? id('DOC'),
    version: (existing?.version ?? 0) + 1,
    status: 'uploaded',
    uploadedAt: now(),
    reviewedAt: undefined,
    rejectionReason: undefined,
    required: document.required ?? existing?.required ?? true
  };
  let result = { ...state, documents: existing ? state.documents.map((item) => item.id === existing.id ? next : item) : [next, ...state.documents] };
  const app = result.applications.find((item) => item.id === next.applicationId) ?? activeApplication(result);
  const required = result.documents.filter((doc) => doc.applicationId === app.id && doc.required);
  const docsComplete = required.length === 0 || required.every((doc) => ['uploaded', 'under_review', 'accepted'].includes(doc.status));
  result = { ...result, applications: result.applications.map((item) => item.id === app.id ? { ...item, sectionCompletion: { ...item.sectionCompletion, documents: docsComplete }, updatedAt: now() } : item) };
  result = addActivity(result, { applicationId: next.applicationId, type: 'document.uploaded', label: 'Document uploaded', detail: next.name, actor: 'Borrower' });
  result = emit(result, 'document', next.id, 'document.uploaded', ['advisory', 'admin'], { applicationId: next.applicationId, category: next.category, name: next.name, version: next.version });
  return withSaved(result);
}

export function removeDocument(state: BorrowerState, documentId: string): BorrowerState {
  const doc = state.documents.find((item) => item.id === documentId);
  if (!doc) return state;
  const documents = doc.required
    ? state.documents.map((item) => item.id === documentId ? { ...item, name: item.requirementLabel ?? item.name, size: 0, status: 'required' as const, blobKey: undefined, uploadedAt: undefined, reviewedAt: undefined, rejectionReason: undefined } : item)
    : state.documents.filter((item) => item.id !== documentId);
  let result = { ...state, documents };
  result = addActivity(result, { applicationId: doc.applicationId, type: 'document.removed', label: doc.required ? 'Required document upload removed' : 'Document removed', detail: doc.name, actor: 'Borrower' });
  return withSaved(result);
}

export function respondToRequest(state: BorrowerState, requestId: string, text: string, attachmentDocumentIds: string[] = []): BorrowerState {
  const req = state.requests.find((item) => item.id === requestId);
  if (!req || !text.trim()) return state;
  const message = { id: id('MSG'), author: 'borrower' as const, text: text.trim(), createdAt: now(), attachmentDocumentIds };
  const nextReq: RequestThread = { ...req, status: 'responded', owner: 'pihub', messages: [...req.messages, message] };
  let result = { ...state, requests: state.requests.map((item) => item.id === requestId ? nextReq : item) };
  result = addActivity(result, { applicationId: req.applicationId, type: 'request.responded', label: 'PiHub request answered', detail: req.title, actor: 'Borrower' });
  result = emit(result, 'request', req.id, 'request.responded', ['advisory'], { applicationId: req.applicationId, text: message.text, attachmentDocumentIds });
  result = notify(result, { kind: 'request', title: 'Response submitted', body: req.title, href: '/requests' });
  return withSaved(result);
}

export function markNotificationRead(state: BorrowerState, notificationId?: string): BorrowerState {
  return withSaved({ ...state, notifications: state.notifications.map((item) => notificationId ? (item.id === notificationId ? { ...item, read: true } : item) : { ...item, read: true }) });
}

export function inviteTeamMember(state: BorrowerState, input: Pick<TeamMember, 'name' | 'email' | 'role'>): BorrowerState {
  if (!input.email.includes('@')) return state;
  const created = now();
  const member: TeamMember = { ...input, id: id('TEAM'), status: 'invited', invitedAt: created, invitationSentAt: created };
  let result = { ...state, team: [...state.team, member] };
  result = addActivity(result, { type: 'team.invited', label: 'Team member invited', detail: input.email, actor: 'Borrower owner' });
  result = emit(result, 'user', member.id, 'organization.invitation.created', ['admin'], { organizationId: state.organization.id, email: input.email, role: input.role });
  return withSaved(result);
}

export function resendTeamInvitation(state: BorrowerState, memberId: string): BorrowerState {
  const member = state.team.find((item) => item.id === memberId);
  if (!member || member.status !== 'invited') return state;
  const sentAt = now();
  let result = { ...state, team: state.team.map((item) => item.id === memberId ? { ...item, invitationSentAt: sentAt } : item) };
  result = addActivity(result, { type: 'team.invitation.resent', label: 'Team invitation resent', detail: member.email, actor: 'Borrower owner' });
  result = emit(result, 'user', member.id, 'organization.invitation.resent', ['admin'], { organizationId: state.organization.id, email: member.email, role: member.role });
  return withSaved(result);
}

export function updateTeamMember(state: BorrowerState, memberId: string, patch: Partial<Pick<TeamMember, 'role' | 'status'>>): BorrowerState {
  const existing = state.team.find((item) => item.id === memberId);
  if (!existing || existing.role === 'owner') return state;
  let result = { ...state, team: state.team.map((item) => item.id === memberId ? { ...item, ...patch } : item) };
  result = emit(result, 'user', memberId, 'organization.member.updated', ['admin'], { organizationId: state.organization.id, ...patch });
  return withSaved(result);
}

export function decideTermSheet(state: BorrowerState, termId: string, decision: 'accepted' | 'rejected'): BorrowerState {
  const term = state.terms.find((item) => item.id === termId);
  if (!term || term.status !== 'available') return state;
  const nextTerm: TermSheet = { ...term, status: decision };
  let result = { ...state, terms: state.terms.map((item) => item.id === termId ? nextTerm : item) };
  result = addActivity(result, { applicationId: term.applicationId, type: `terms.${decision}`, label: `Indicative terms ${decision}`, detail: term.provider, actor: 'Borrower' });
  result = emit(result, 'terms', term.id, `terms.${decision}`, ['advisory', 'investor'], { applicationId: term.applicationId, provider: term.provider });
  if (decision === 'accepted') {
    result = { ...result, terms: result.terms.map((item) => item.applicationId === term.applicationId && item.id !== termId && item.status === 'available' ? { ...item, status: 'rejected' as const } : item) };
    result = setActiveApplication(result, term.applicationId);
    result = setApplicationStatus(result, 'terms_accepted', 'Borrower');
  }
  return withSaved(result);
}

export function toggleClosingItem(state: BorrowerState, itemId: string, complete: boolean): BorrowerState {
  const item = state.closingItems.find((entry) => entry.id === itemId);
  if (!item || item.owner !== 'borrower') return state;
  const next: ClosingItem = { ...item, complete };
  let result = { ...state, closingItems: state.closingItems.map((entry) => entry.id === itemId ? next : entry) };
  result = addActivity(result, { applicationId: item.applicationId, type: complete ? 'closing.item.completed' : 'closing.item.reopened', label: complete ? 'Closing item completed' : 'Closing item reopened', detail: item.title, actor: 'Borrower' });
  result = emit(result, 'closing', item.id, complete ? 'closing.item.completed' : 'closing.item.reopened', ['advisory', 'admin'], { applicationId: item.applicationId, title: item.title, complete });
  const allBorrowerComplete = result.closingItems.filter((entry) => entry.applicationId === item.applicationId && entry.owner === 'borrower' && entry.required).every((entry) => entry.complete);
  if (allBorrowerComplete) result = notify(result, { kind: 'closing', title: 'Borrower closing items complete', body: 'PiHub will review the remaining closing conditions.', href: '/closing' });
  return withSaved(result);
}

export function toggleSavedProduct(state: BorrowerState, productId: string): BorrowerState {
  const savedProductIds = state.savedProductIds.includes(productId) ? state.savedProductIds.filter((id) => id !== productId) : [...state.savedProductIds, productId];
  return withSaved({ ...state, savedProductIds });
}

export function toggleComparedProduct(state: BorrowerState, productId: string): BorrowerState {
  if (state.comparisonProductIds.includes(productId)) return withSaved({ ...state, comparisonProductIds: state.comparisonProductIds.filter((id) => id !== productId) });
  if (state.comparisonProductIds.length >= 3) return state;
  return withSaved({ ...state, comparisonProductIds: [...state.comparisonProductIds, productId] });
}

export function createSupportTicket(state: BorrowerState, input: Pick<SupportTicket, 'category' | 'subject' | 'message'>): BorrowerState {
  if (!input.subject.trim() || !input.message.trim()) return state;
  const ticket: SupportTicket = { ...input, id: id('SUP'), applicationId: state.activeApplicationId, status: 'open', createdAt: now() };
  let result = { ...state, supportTickets: [ticket, ...state.supportTickets] };
  result = addActivity(result, { applicationId: state.activeApplicationId, type: 'support.request.created', label: 'Support request created', detail: input.subject, actor: 'Borrower' });
  result = emit(result, 'support', ticket.id, 'support.request.created', ['admin'], { applicationId: state.activeApplicationId, category: input.category, subject: input.subject });
  result = notify(result, { kind: 'support', title: 'Support request created', body: input.subject, href: '/help' });
  return withSaved(result);
}

export function createServicingRequest(state: BorrowerState, input: Pick<ServicingRequest, 'facilityId' | 'type' | 'subject' | 'description'>): BorrowerState {
  const facility = state.facilities.find((item) => item.id === input.facilityId);
  if (!facility || !input.subject.trim() || !input.description.trim()) return state;
  const request: ServicingRequest = { ...input, id: id('SRV'), status: 'submitted', createdAt: now(), submittedAt: now() };
  let result = { ...state, servicingRequests: [request, ...state.servicingRequests] };
  result = addActivity(result, { applicationId: facility.applicationId, type: 'servicing.request.submitted', label: `${input.type.replaceAll('_', ' ')} request submitted`, detail: input.subject, actor: 'Borrower' });
  result = emit(result, 'servicing_request', request.id, 'servicing.request.submitted', ['advisory', 'investor', 'admin'], { facilityId: facility.id, applicationId: facility.applicationId, type: input.type, subject: input.subject });
  result = notify(result, { kind: 'servicing', title: 'Servicing request submitted', body: input.subject, href: '/servicing' });
  return withSaved(result);
}

export function withdrawServicingRequest(state: BorrowerState, requestId: string): BorrowerState {
  const request = state.servicingRequests.find((item) => item.id === requestId);
  if (!request || !['draft', 'submitted'].includes(request.status)) return state;
  const facility = state.facilities.find((item) => item.id === request.facilityId);
  let result = { ...state, servicingRequests: state.servicingRequests.map((item) => item.id === requestId ? { ...item, status: 'withdrawn' as const } : item) };
  result = addActivity(result, { applicationId: facility?.applicationId, type: 'servicing.request.withdrawn', label: 'Servicing request withdrawn', detail: request.subject, actor: 'Borrower' });
  result = emit(result, 'servicing_request', request.id, 'servicing.request.withdrawn', ['advisory', 'investor', 'admin'], { facilityId: request.facilityId });
  return withSaved(result);
}

export function submitReportingObligation(state: BorrowerState, obligationId: string, documentId?: string): BorrowerState {
  const obligation = state.reportingObligations.find((item) => item.id === obligationId);
  if (!obligation || !['required', 'rejected'].includes(obligation.status)) return state;
  const facility = state.facilities.find((item) => item.id === obligation.facilityId);
  const next: ReportingObligation = { ...obligation, status: 'submitted', documentId, remediation: undefined };
  let result = { ...state, reportingObligations: state.reportingObligations.map((item) => item.id === obligationId ? next : item) };
  result = addActivity(result, { applicationId: facility?.applicationId, type: 'reporting.submitted', label: 'Facility reporting submitted', detail: obligation.title, actor: 'Borrower' });
  result = emit(result, 'reporting', obligation.id, 'reporting.submitted', ['advisory', 'investor'], { facilityId: obligation.facilityId, documentId, title: obligation.title });
  result = notify(result, { kind: 'reporting', title: 'Reporting item submitted', body: obligation.title, href: '/servicing' });
  return withSaved(result);
}

export function reportPaymentMade(state: BorrowerState, paymentId: string, note: string): BorrowerState {
  const payment = state.paymentSchedule.find((item) => item.id === paymentId);
  if (!payment || payment.status === 'paid' || !note.trim()) return state;
  return createServicingRequest(state, { facilityId: payment.facilityId, type: 'payment_notice', subject: `Payment notice for ${payment.dueDate}`, description: note.trim() });
}

export function createPrivacyRequest(state: BorrowerState, type: PrivacyRequest['type'], note = ''): BorrowerState {
  const existing = state.privacyRequests.find((item) => item.type === type && ['submitted', 'under_review'].includes(item.status));
  if (existing) return state;
  const request: PrivacyRequest = { id: id('PRV'), type, status: 'submitted', createdAt: now(), note: note.trim() || undefined };
  let result = { ...state, privacyRequests: [request, ...state.privacyRequests] };
  result = addActivity(result, { type: 'privacy.request.submitted', label: `Privacy ${type} request submitted`, detail: request.note, actor: 'Borrower' });
  result = emit(result, 'privacy_request', request.id, 'privacy.request.submitted', ['admin'], { organizationId: state.organization.id, type, note: request.note });
  result = notify(result, { kind: 'privacy', title: 'Privacy request submitted', body: type.replaceAll('_', ' '), href: '/privacy' });
  return withSaved(result);
}

export function nextFacilityPayment(state: BorrowerState, facilityId: string): PaymentScheduleItem | undefined {
  return state.paymentSchedule.filter((item) => item.facilityId === facilityId && item.status !== 'paid').sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
}

export function facilityHealth(state: BorrowerState, facilityId: string): { covenantStatus: Covenant['status']; outstandingReporting: number } {
  const covenants = state.covenants.filter((item) => item.facilityId === facilityId);
  const covenantStatus: Covenant['status'] = covenants.some((item) => item.status === 'breach') ? 'breach' : covenants.some((item) => item.status === 'warning') ? 'warning' : covenants.every((item) => item.status === 'compliant') ? 'compliant' : 'not_tested';
  const outstandingReporting = state.reportingObligations.filter((item) => item.facilityId === facilityId && ['required', 'rejected'].includes(item.status)).length;
  return { covenantStatus, outstandingReporting };
}

export function updateProfile(state: BorrowerState, patch: Partial<BorrowerState['profile']>): BorrowerState {
  return withSaved({ ...state, profile: { ...state.profile, ...patch } });
}

export function setLocale(state: BorrowerState, locale: BorrowerState['locale']): BorrowerState {
  return withSaved({ ...state, locale });
}

export function setVerificationStatus(state: BorrowerState, verificationStatus: BorrowerState['organization']['verificationStatus']): BorrowerState {
  let result = { ...state, organization: { ...state.organization, verificationStatus } };
  result = emit(result, 'organization', state.organization.id, 'organization.verification.status', ['admin', 'advisory'], { verificationStatus });
  return withSaved(result);
}
