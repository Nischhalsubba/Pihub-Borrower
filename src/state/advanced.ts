import { products } from '../data/demo.js';
import type { BorrowerState, IntegrationEvent, ModuleId } from './model.js';
import type {
  AdvancedBorrowerFeatures,
  BorrowerFeatureAction,
  CopilotMessage,
  DeadlineItem,
  FinancingScenario,
  MatchExplanation,
  PrequalificationAssessment,
  ProductWorkflowProfile
} from './advancedModel.js';

const now = () => new Date().toISOString();
let counter = 0;
const makeId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(++counter).toString(36)}`;

export const workflowProfiles: ProductWorkflowProfile[] = [
  {
    id: 'WF-CONSTRUCTION', label: 'Construction / development finance', kind: 'construction', productIds: ['senior-development-facility', 'whole-loan'],
    requiredSections: ['financing', 'company', 'project', 'financials', 'sources & uses', 'construction budget', 'documents'],
    requiredDocumentCategories: ['Cost plan', 'Planning / permits', 'Valuation', 'Financial model', 'Sponsor equity evidence'],
    servicingModules: ['Draws', 'Inspections', 'Covenants', 'Reporting', 'Payments', 'Maturity'],
    milestoneLabels: ['Application', 'PiHub review', 'Structuring', 'Due diligence', 'Terms', 'Closing', 'Funding', 'Draws & monitoring'],
    explanation: 'Development facilities need budget, construction progress, inspection and draw controls in addition to ordinary underwriting.'
  },
  {
    id: 'WF-BRIDGE', label: 'Bridge / transitional finance', kind: 'bridge', productIds: ['bridge-facility'],
    requiredSections: ['financing', 'company', 'project', 'financials', 'exit / repayment', 'documents'],
    requiredDocumentCategories: ['Valuation', 'Existing debt', 'Repayment evidence', 'Security information'],
    servicingModules: ['Payments', 'Covenants', 'Extension', 'Refinance', 'Payoff'],
    milestoneLabels: ['Application', 'Rapid review', 'Security diligence', 'Terms', 'Closing', 'Funding', 'Exit / refinance'],
    explanation: 'Bridge finance prioritizes certainty of repayment, collateral and time-to-close.'
  },
  {
    id: 'WF-MEZZ', label: 'Mezzanine / subordinated capital', kind: 'mezzanine', productIds: ['mezzanine-capital'],
    requiredSections: ['financing', 'company', 'project', 'financials', 'capital stack', 'documents'],
    requiredDocumentCategories: ['Senior facility', 'Intercreditor information', 'Sponsor equity', 'Business plan'],
    servicingModules: ['Covenants', 'Reporting', 'Consent / waiver', 'Payments', 'Maturity'],
    milestoneLabels: ['Application', 'Capital-stack review', 'Structuring', 'Intercreditor', 'Terms', 'Closing', 'Monitoring'],
    explanation: 'Subordinated capital requires visibility into the full capital stack and senior-lender consent mechanics.'
  },
  {
    id: 'WF-CORPORATE', label: 'Corporate / acquisition finance', kind: 'corporate', productIds: [],
    requiredSections: ['financing', 'company', 'financials', 'management case', 'documents'],
    requiredDocumentCategories: ['Audited accounts', 'Management accounts', 'Business plan', 'Debt schedule'],
    servicingModules: ['Payments', 'Covenants', 'Reporting', 'Consent / waiver'],
    milestoneLabels: ['Application', 'Qualification', 'Credit review', 'Terms', 'Documentation', 'Funding', 'Monitoring'],
    explanation: 'Corporate facilities rely more heavily on operating cash flow, leverage and debt-service capacity than construction progress.'
  }
];

export interface WorkflowReadinessStep {
  id: string;
  label: string;
  href: string;
  detail: string;
  complete: boolean;
  blocking: boolean;
}

export interface WorkflowReadiness {
  profile: ProductWorkflowProfile;
  steps: WorkflowReadinessStep[];
  ready: boolean;
  percentage: number;
  blockers: string[];
}

function normalizedText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function workflowProfileForApplication(state: BorrowerState, applicationId: string): ProductWorkflowProfile {
  const app = state.applications.find((item) => item.id === applicationId);
  const fallback = state.advanced?.workflowProfiles?.find((item) => item.kind === 'corporate') ?? workflowProfiles[workflowProfiles.length - 1];
  if (!app) return fallback;
  const direct = state.advanced?.workflowProfiles?.find((item) => item.productIds.includes(app.financing.productId ?? ''));
  if (direct) return direct;
  const clues = normalizedText(`${app.financing.structure} ${app.financing.purpose} ${app.financing.useOfProceeds} ${app.project.stage}`);
  if (/construction|development|whole loan/.test(clues)) return state.advanced.workflowProfiles.find((item) => item.kind === 'construction') ?? fallback;
  if (/bridge|transitional|refinanc/.test(clues)) return state.advanced.workflowProfiles.find((item) => item.kind === 'bridge') ?? fallback;
  if (/mezz|subordinated|junior/.test(clues)) return state.advanced.workflowProfiles.find((item) => item.kind === 'mezzanine') ?? fallback;
  return fallback;
}

const documentAliases: Record<string, string[]> = {
  'cost plan': ['cost plan', 'construction budget', 'budget'],
  'planning / permits': ['planning', 'permit', 'approval'],
  'valuation': ['valuation', 'appraisal'],
  'financial model': ['financial model', 'model'],
  'sponsor equity evidence': ['sponsor equity', 'equity evidence', 'equity'],
  'existing debt': ['existing debt', 'debt schedule', 'loan schedule'],
  'repayment evidence': ['repayment', 'exit evidence', 'sale evidence'],
  'security information': ['security', 'collateral'],
  'senior facility': ['senior facility', 'senior debt', 'facility agreement'],
  'intercreditor information': ['intercreditor', 'senior lender'],
  'sponsor equity': ['sponsor equity', 'equity'],
  'business plan': ['business plan'],
  'audited accounts': ['audited', 'annual accounts', 'financial statements'],
  'management accounts': ['management accounts', 'monthly accounts'],
  'debt schedule': ['debt schedule', 'existing debt']
};

function hasDocumentCoverage(state: BorrowerState, applicationId: string, requirement: string) {
  const aliases = documentAliases[normalizedText(requirement)] ?? [normalizedText(requirement)];
  return state.documents.some((document) => {
    if (document.applicationId !== applicationId || ['rejected', 'expired'].includes(document.status)) return false;
    const haystack = normalizedText(`${document.category} ${document.requirementLabel ?? ''} ${document.name}`);
    return aliases.some((alias) => haystack.includes(normalizedText(alias)));
  });
}

export function workflowReadiness(state: BorrowerState, applicationId: string): WorkflowReadiness {
  const app = state.applications.find((item) => item.id === applicationId);
  const profile = workflowProfileForApplication(state, applicationId);
  if (!app) return { profile, steps: [], ready: false, percentage: 0, blockers: ['Application not found.'] };
  const steps: WorkflowReadinessStep[] = [];
  if (profile.kind === 'construction' || profile.kind === 'whole_loan') {
    const sources = state.advanced.sourcesUses.filter((item) => item.applicationId === applicationId);
    const budget = state.advanced.constructionBudget.filter((item) => item.applicationId === applicationId);
    const hasSourcesUses = sources.some((item) => item.side === 'source') && sources.some((item) => item.side === 'use');
    const balanced = hasSourcesUses && Math.abs(sources.filter((i) => i.side === 'source').reduce((sum, i) => sum + i.amount, 0) - sources.filter((i) => i.side === 'use').reduce((sum, i) => sum + i.amount, 0)) <= 1;
    steps.push({ id: 'capital-plan', label: 'Sources & Uses and construction budget', href: '/capital', detail: balanced && budget.length ? 'Capital stack and cost plan are populated.' : 'Add balanced Sources & Uses and at least one construction budget line.', complete: balanced && budget.length > 0, blocking: true });
  } else if (profile.kind === 'bridge') {
    const complete = app.financing.repaymentProfile.trim().length >= 20 && app.project.valuation > 0;
    steps.push({ id: 'bridge-exit', label: 'Exit and repayment evidence', href: '/application', detail: complete ? 'Repayment path and valuation are documented.' : 'Describe the repayment/exit path and provide a current valuation.', complete, blocking: true });
  } else if (profile.kind === 'mezzanine' || profile.kind === 'subordinated') {
    const complete = app.financing.sponsorEquity > 0 && app.financing.repaymentProfile.trim().length >= 20;
    steps.push({ id: 'capital-stack', label: 'Capital stack and sponsor support', href: '/application', detail: complete ? 'Sponsor equity and repayment path are documented.' : 'Confirm sponsor equity and the repayment path; senior/intercreditor information is required when senior debt exists.', complete, blocking: true });
  } else {
    const freshFinancials = state.advanced.freshness.some((item) => /financial/i.test(item.fieldGroup) && item.status === 'fresh');
    const connectedFinance = state.advanced.connections.some((item) => ['datev', 'finapi'].includes(item.provider) && item.status === 'connected');
    const complete = app.sectionCompletion.financials && (freshFinancials || connectedFinance || state.documents.some((d) => d.applicationId === applicationId && /financial|account/i.test(`${d.category} ${d.name}`) && !['rejected','expired'].includes(d.status)));
    steps.push({ id: 'financial-evidence', label: 'Current financial evidence', href: '/connections', detail: complete ? 'Financial information has a usable current source.' : 'Complete Financials and confirm a current accounting, bank or uploaded financial source.', complete, blocking: true });
  }
  const missingDocuments = profile.requiredDocumentCategories.filter((requirement) => !hasDocumentCoverage(state, applicationId, requirement));
  steps.push({ id: 'product-documents', label: `${profile.label} document set`, href: '/data-room', detail: missingDocuments.length ? `Missing: ${missingDocuments.join(', ')}.` : 'Product-specific document coverage is complete.', complete: missingDocuments.length === 0, blocking: true });
  const completeCount = steps.filter((item) => item.complete).length;
  const percentage = steps.length ? Math.round(completeCount / steps.length * 100) : 100;
  return { profile, steps, ready: steps.filter((item) => item.blocking).every((item) => item.complete), percentage, blockers: steps.filter((item) => item.blocking && !item.complete).map((item) => item.detail) };
}

export function createAdvancedInitialState(): AdvancedBorrowerFeatures {
  return {
    workflowProfiles,
    prequalification: [],
    matches: [],
    spvs: [
      { id: 'SPV-001', name: 'Berlin Urban Living GmbH', legalForm: 'GmbH', jurisdiction: 'Germany', registrationNumber: 'HRB 204817 B', applicationIds: ['PH-2026-0147'], status: 'active' },
      { id: 'SPV-002', name: 'Northern Portfolio PropCo GmbH', legalForm: 'GmbH', jurisdiction: 'Germany', registrationNumber: 'HRB 184201 HH', applicationIds: ['PH-2025-0098'], status: 'active' }
    ],
    portfolioViews: [
      { id: 'VIEW-1', name: 'Active financing', statusFilter: 'active', sortBy: 'updated', columns: ['status', 'amount', 'next_action', 'maturity'], createdAt: '2026-08-20T09:00:00.000Z' }
    ],
    sourcesUses: [
      { id: 'SU-1', applicationId: 'PH-2026-0147', side: 'source', category: 'Senior facility', description: 'Requested PiHub-arranged financing', amount: 18_000_000, fundedAmount: 0 },
      { id: 'SU-2', applicationId: 'PH-2026-0147', side: 'source', category: 'Sponsor equity', description: 'Committed sponsor capital', amount: 6_500_000, fundedAmount: 4_100_000 },
      { id: 'SU-3', applicationId: 'PH-2026-0147', side: 'use', category: 'Acquisition / refinance', description: 'Existing acquisition debt refinance', amount: 11_500_000, fundedAmount: 0 },
      { id: 'SU-4', applicationId: 'PH-2026-0147', side: 'use', category: 'Construction', description: 'Remaining construction and project costs', amount: 13_000_000, fundedAmount: 3_800_000 }
    ],
    constructionBudget: [
      { id: 'BUD-100', applicationId: 'PH-2026-0147', costCode: '01', category: 'Land / acquisition', originalBudget: 12_000_000, revisedBudget: 12_000_000, committed: 12_000_000, paidToDate: 12_000_000 },
      { id: 'BUD-200', applicationId: 'PH-2026-0147', costCode: '02', category: 'Hard construction', originalBudget: 15_800_000, revisedBudget: 16_200_000, committed: 11_600_000, paidToDate: 6_400_000 },
      { id: 'BUD-300', applicationId: 'PH-2026-0147', costCode: '03', category: 'Professional / soft costs', originalBudget: 3_500_000, revisedBudget: 3_700_000, committed: 2_900_000, paidToDate: 2_100_000 },
      { id: 'BUD-400', applicationId: 'PH-2026-0147', costCode: '04', category: 'Contingency', originalBudget: 1_200_000, revisedBudget: 600_000, committed: 0, paidToDate: 0 }
    ],
    drawRequests: [],
    inspections: [],
    connections: [
      { id: 'CONN-DATEV', provider: 'datev', label: 'DATEV accounting', status: 'disconnected', scope: ['fiscal years', 'ledger balances', 'postings'] },
      { id: 'CONN-BANK', provider: 'finapi', label: 'Bank accounts via PSD2', status: 'disconnected', scope: ['accounts', 'balances', 'transactions'] },
      { id: 'CONN-ERP', provider: 'erp_api', label: 'ERP / treasury API', status: 'disconnected', scope: ['projects', 'budgets', 'cash flow'] }
    ],
    freshness: [
      { id: 'FRESH-1', source: 'borrower', fieldGroup: 'Company profile', sourceLabel: 'Confirmed by borrower', lastUpdatedAt: '2026-08-26T09:00:00.000Z', confirmedByBorrowerAt: '2026-08-26T09:00:00.000Z', status: 'fresh' },
      { id: 'FRESH-2', source: 'upload', fieldGroup: 'Financial statements', sourceLabel: 'FY2025 uploaded statements', lastUpdatedAt: '2026-07-10T09:00:00.000Z', status: 'needs_confirmation' },
      { id: 'FRESH-3', source: 'project', fieldGroup: 'Construction budget', sourceLabel: 'Borrower cost plan', lastUpdatedAt: '2026-08-18T09:00:00.000Z', status: 'fresh' }
    ],
    cashFlow: [
      { id: 'CF-1', sourceConnectionId: 'CONN-BANK', period: '2026-06', inflows: 4_200_000, outflows: 3_700_000, endingCash: 4_300_000, debtService: 210_000, createdAt: '2026-07-01T06:00:00.000Z' },
      { id: 'CF-2', sourceConnectionId: 'CONN-BANK', period: '2026-07', inflows: 4_650_000, outflows: 4_150_000, endingCash: 4_800_000, debtService: 210_000, createdAt: '2026-08-01T06:00:00.000Z' }
    ],
    dataRoomFolders: [
      { id: 'FOLDER-1', name: 'Corporate & ownership', purpose: 'company_vault', createdAt: '2026-08-20T09:00:00.000Z' },
      { id: 'FOLDER-2', name: 'Project & technical', purpose: 'application', applicationId: 'PH-2026-0147', createdAt: '2026-08-20T09:00:00.000Z' },
      { id: 'FOLDER-3', name: 'Financial & models', purpose: 'application', applicationId: 'PH-2026-0147', createdAt: '2026-08-20T09:00:00.000Z' }
    ],
    companyVault: [],
    documentIntelligence: [],
    disclosures: [],
    scenarios: [],
    negotiations: [],
    signatureEnvelopes: [],
    deadlines: [],
    paymentInstructions: [
      { id: 'PI-1', facilityId: 'FAC-2025-0098', label: 'Operating account', ibanMasked: 'DE•• •••• •••• •••• 4219', accountHolder: 'Northern Portfolio PropCo GmbH', mandateType: 'manual_transfer', status: 'active', isDefault: true }
    ],
    statements: [
      { id: 'STM-2026-Q2', facilityId: 'FAC-2025-0098', periodStart: '2026-04-01', periodEnd: '2026-06-30', openingBalance: 3_700_000, principalPaid: 0, interestPaid: 78_125, feesPaid: 0, closingBalance: 3_700_000, generatedAt: '2026-07-02T08:00:00.000Z' }
    ],
    covenantForecasts: [],
    professionals: [],
    esgProfiles: [
      { id: 'ESG-1', applicationId: 'PH-2026-0147', epcRating: 'A', energyStandard: 'KfW 40 target', renewableSharePct: 48, operationalCo2KgSqm: 8.5, taxonomyAlignedPct: 72, kfwProgram: 'KfW-aligned development target', certifications: ['DGNB target'], updatedAt: '2026-08-25T08:00:00.000Z' }
    ],
    integrations: [
      { id: 'INT-DOCLING', name: 'Document intelligence', kind: 'document_intelligence', provider: 'Docling', mode: 'self_hosted', status: 'configured', capabilities: ['PDF/DOCX/XLSX parsing', 'table extraction', 'structured JSON'] },
      { id: 'INT-FINERACT', name: 'Loan servicing adapter', kind: 'servicing', provider: 'Apache Fineract', mode: 'external_api', status: 'configured', capabilities: ['repayment schedule', 'charges', 'loan transactions'] },
      { id: 'INT-TEMPORAL', name: 'Workflow orchestration', kind: 'workflow', provider: 'Temporal', mode: 'self_hosted', status: 'configured', capabilities: ['durable workflows', 'retries', 'timers'] },
      { id: 'INT-ESIGN', name: 'E-signature adapter', kind: 'esign', provider: 'Documenso API', mode: 'external_api', status: 'configured', capabilities: ['signing envelopes', 'signer status', 'completed PDF'] }
    ],
    complaints: [],
    exportPackages: [],
    copilot: [
      { id: 'COP-0', role: 'assistant', body: 'I can explain outstanding PiHub requests, document gaps, covenant obligations, upcoming deadlines and financing terms using this workspace data.', createdAt: '2026-08-28T01:00:00.000Z', href: '/requests' }
    ]
  };
}

function emit(state: BorrowerState, aggregateType: IntegrationEvent['aggregateType'], aggregateId: string, type: string, targetModules: ModuleId[], payload: Record<string, unknown>): BorrowerState {
  const event: IntegrationEvent = { id: makeId('EVT'), aggregateType, aggregateId, type, targetModules, payload, createdAt: now(), state: 'queued' };
  return { ...state, outbox: [event, ...state.outbox], lastSavedAt: now() };
}

function addActivity(state: BorrowerState, label: string, detail?: string, applicationId?: string): BorrowerState {
  return { ...state, activity: [{ id: makeId('ACT'), applicationId, type: 'borrower.feature', label, detail, actor: 'Borrower', createdAt: now() }, ...state.activity], lastSavedAt: now() };
}

function notify(state: BorrowerState, title: string, body: string, href: string, kind: BorrowerState['notifications'][number]['kind'] = 'status'): BorrowerState {
  return { ...state, notifications: [{ id: makeId('NOT'), kind, title, body, href, read: false, createdAt: now() }, ...state.notifications], lastSavedAt: now() };
}

export function scenarioMetrics(s: FinancingScenario) {
  const annualRate = s.referenceRatePct + s.marginBps / 100;
  const annualInterest = s.amount * annualRate / 100;
  const fees = s.amount * s.feesPct / 100;
  const annualAmortization = s.amount * s.amortizationPct / 100;
  const ltv = s.propertyValue > 0 ? s.amount / s.propertyValue * 100 : 0;
  const ltc = s.amount + s.equity > 0 ? s.amount / (s.amount + s.equity) * 100 : 0;
  const debtService = annualInterest + annualAmortization;
  const dscr = debtService > 0 ? s.projectedAnnualNOI / debtService : 0;
  const totalInterest = annualInterest * s.tenorMonths / 12;
  const allInCost = totalInterest + fees;
  return { annualRate, annualInterest, fees, annualAmortization, ltv, ltc, debtService, dscr, totalInterest, allInCost };
}

export function calculateMatches(state: BorrowerState, applicationId: string): MatchExplanation[] {
  const app = state.applications.find((item) => item.id === applicationId);
  if (!app) return [];
  return products.map((product) => {
    let score = 50;
    const reasons: string[] = [];
    const gaps: string[] = [];
    if (app.financing.amount >= product.amountMin && app.financing.amount <= product.amountMax) { score += 20; reasons.push('Requested amount is inside the product range.'); } else { score -= 20; gaps.push('Requested amount sits outside the indicative range.'); }
    if (app.financing.tenorMonths >= product.tenorMin && app.financing.tenorMonths <= product.tenorMax) { score += 10; reasons.push('Requested tenor fits the indicative product range.'); } else { score -= 8; gaps.push('Requested tenor needs structuring discussion.'); }
    if (product.assetClasses.some((asset) => app.project.assetClass.toLowerCase().includes(asset.toLowerCase()) || asset.toLowerCase().includes(app.project.assetClass.toLowerCase()))) { score += 12; reasons.push(`${app.project.assetClass} is an indicated asset class.`); } else { gaps.push('Asset class is not explicitly listed in the indicative product criteria.'); }
    const ltv = app.project.valuation > 0 ? app.financing.amount / app.project.valuation * 100 : 0;
    if (ltv && ltv <= product.ltvMax) { score += 8; reasons.push(`Indicative LTV ${ltv.toFixed(1)}% is within the ${product.ltvMax}% reference.`); } else if (ltv) { score -= 12; gaps.push(`Indicative LTV ${ltv.toFixed(1)}% exceeds the ${product.ltvMax}% reference.`); }
    score = Math.max(0, Math.min(100, score));
    const fit: MatchExplanation['fit'] = score >= 78 ? 'strong' : score >= 55 ? 'possible' : 'weak';
    return { productId: product.id, score, fit, reasons, gaps };
  }).sort((a, b) => b.score - a.score);
}

export function calculatePrequalification(state: BorrowerState, applicationId: string): PrequalificationAssessment | undefined {
  const app = state.applications.find((item) => item.id === applicationId);
  if (!app) return undefined;
  const reasons: string[] = [];
  const blockers: string[] = [];
  const nextActions: string[] = [];
  let score = 35;
  if (app.financing.amount >= 500_000) { score += 10; reasons.push('Financing size is within PiHub’s typical business-financing range.'); } else blockers.push('Requested amount is below the typical PiHub financing range and needs direct review.');
  if (app.company.revenue > 0 || app.project.valuation > 0) { score += 15; reasons.push('The application contains operating or asset-value evidence.'); } else blockers.push('Add operating financials or asset-value evidence.');
  if (app.financing.repaymentProfile.trim().length > 20) { score += 15; reasons.push('A repayment path has been described.'); } else { blockers.push('Repayment path needs more detail.'); nextActions.push('Complete the repayment profile.'); }
  if (app.financing.sponsorEquity > 0) { score += 10; reasons.push('Sponsor equity is identified.'); } else nextActions.push('Confirm sponsor equity and funding schedule.');
  const requiredDocs = state.documents.filter((d) => d.applicationId === applicationId && d.required);
  const completedDocs = requiredDocs.filter((d) => ['uploaded', 'under_review', 'accepted'].includes(d.status));
  if (!requiredDocs.length || completedDocs.length === requiredDocs.length) { score += 15; reasons.push('Required document coverage is currently complete.'); } else { score += Math.round(15 * completedDocs.length / requiredDocs.length); nextActions.push(`${requiredDocs.length - completedDocs.length} required document(s) remain outstanding.`); }
  if (state.organization.verificationStatus === 'verified') { score += 10; reasons.push('Organization verification is complete.'); } else nextActions.push('Complete organization verification before final execution.');
  score = Math.max(0, Math.min(100, score));
  return {
    id: makeId('PREQ'), applicationId, createdAt: now(), score,
    band: score >= 80 ? 'strong_fit' : score >= 60 ? 'potential_fit' : score >= 40 ? 'needs_information' : 'unlikely_fit',
    reasons, blockers, nextActions
  };
}

export function deriveDeadlines(state: BorrowerState): DeadlineItem[] {
  const today = new Date().toISOString().slice(0, 10);
  const statusFor = (date: string, complete = false): DeadlineItem['status'] => complete ? 'complete' : date < today ? 'overdue' : date === today ? 'due' : 'upcoming';
  const items: DeadlineItem[] = [];
  state.requests.forEach((r) => r.dueDate && items.push({ id: `DL-REQ-${r.id}`, applicationId: r.applicationId, kind: 'request', title: r.title, dueDate: r.dueDate, href: '/requests', status: statusFor(r.dueDate, r.status === 'resolved') }));
  state.documents.forEach((d) => d.dueDate && items.push({ id: `DL-DOC-${d.id}`, applicationId: d.applicationId, kind: 'document', title: d.requirementLabel ?? d.name, dueDate: d.dueDate, href: '/data-room', status: statusFor(d.dueDate, d.status === 'accepted') }));
  state.paymentSchedule.forEach((p) => items.push({ id: `DL-PAY-${p.id}`, facilityId: p.facilityId, kind: 'payment', title: `Facility payment ${p.id}`, dueDate: p.dueDate, href: '/payments', status: statusFor(p.dueDate, p.status === 'paid') }));
  state.covenants.forEach((c) => items.push({ id: `DL-COV-${c.id}`, facilityId: c.facilityId, kind: 'covenant', title: c.name, dueDate: c.nextTestDate, href: '/servicing', status: statusFor(c.nextTestDate, false) }));
  state.reportingObligations.forEach((r) => items.push({ id: `DL-REP-${r.id}`, facilityId: r.facilityId, kind: 'reporting', title: r.title, dueDate: r.dueDate, href: '/servicing', status: statusFor(r.dueDate, r.status === 'accepted') }));
  state.closingItems.forEach((c) => c.dueDate && items.push({ id: `DL-CP-${c.id}`, applicationId: c.applicationId, kind: 'closing', title: c.title, dueDate: c.dueDate, href: '/closing', status: statusFor(c.dueDate, c.complete) }));
  state.facilities.forEach((f) => items.push({ id: `DL-MAT-${f.id}`, applicationId: f.applicationId, facilityId: f.id, kind: 'maturity', title: `Facility maturity ${f.id}`, dueDate: f.maturityDate, href: '/servicing', status: statusFor(f.maturityDate, f.status === 'repaid') }));
  state.terms.filter((t) => t.status === 'available').forEach((t) => items.push({ id: `DL-TERM-${t.id}`, applicationId: t.applicationId, kind: 'term_expiry', title: `Indicative terms expire · ${t.provider}`, dueDate: t.expiryDate, href: '/scenario-lab', status: statusFor(t.expiryDate, false) }));
  state.advanced.inspections.forEach((i) => items.push({ id: `DL-INSP-${i.id}`, applicationId: i.applicationId, kind: 'inspection', title: `${i.inspectionType} inspection`, dueDate: i.preferredDate, href: '/capital', status: statusFor(i.preferredDate, i.status === 'completed') }));
  return items.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

function copilotAnswer(state: BorrowerState, body: string): CopilotMessage {
  const q = body.toLowerCase();
  let answer = 'I can help with applications, documents, PiHub requests, terms, facility obligations, covenants and deadlines. Try asking “what do I need to do next?”';
  let href = '/';
  if (q.includes('next') || q.includes('need')) {
    const deadlines = deriveDeadlines(state).filter((d) => d.status !== 'complete').slice(0, 3);
    answer = deadlines.length ? `Your nearest obligations are: ${deadlines.map((d) => `${d.title} (${d.dueDate})`).join('; ')}.` : 'There are no currently outstanding dated obligations in the demo workspace.';
    href = '/calendar';
  } else if (q.includes('document') || q.includes('missing')) {
    const missing = state.documents.filter((d) => d.applicationId === state.activeApplicationId && ['required', 'rejected', 'expired'].includes(d.status));
    answer = missing.length ? `${missing.length} document item(s) need attention: ${missing.map((d) => d.requirementLabel ?? d.name).join('; ')}.` : 'No document requirements currently need attention for the active application.';
    href = '/data-room';
  } else if (q.includes('covenant')) {
    const facility = state.facilities.find((f) => f.applicationId === state.activeApplicationId) ?? state.facilities[0];
    const covs = facility ? state.covenants.filter((c) => c.facilityId === facility.id) : [];
    answer = covs.length ? covs.map((c) => `${c.name}: ${c.currentValue ?? 'not tested'}${c.unit} ${c.operator} ${c.threshold}${c.unit}, next test ${c.nextTestDate}.`).join(' ') : 'No covenants are currently linked to this application.';
    href = '/servicing';
  } else if (q.includes('term') || q.includes('offer')) {
    const offers = state.terms.filter((t) => t.applicationId === state.activeApplicationId && t.status === 'available');
    answer = offers.length ? `There are ${offers.length} active indicative offers. The lowest margin shown is ${Math.min(...offers.map((t) => t.marginBps))} bps over the reference rate. Compare total cost, fees, leverage and covenant implications before deciding.` : 'No active indicative offers are available for this application.';
    href = '/scenario-lab';
  } else if (q.includes('request') || q.includes('pihub')) {
    const open = state.requests.filter((r) => r.applicationId === state.activeApplicationId && r.status !== 'resolved');
    answer = open.length ? `${open.length} PiHub request(s) remain open: ${open.map((r) => r.title).join('; ')}.` : 'No PiHub requests are open for the active application.';
    href = '/requests';
  }
  return { id: makeId('COP'), role: 'assistant', body: answer, createdAt: now(), href };
}

export function applyAdvancedAction(state: BorrowerState, action: BorrowerFeatureAction): BorrowerState {
  let advanced = state.advanced;
  let result: BorrowerState = { ...state, lastSavedAt: now() };
  switch (action.type) {
    case 'prequalify': {
      const assessment = calculatePrequalification(state, action.applicationId);
      const matches = calculateMatches(state, action.applicationId);
      if (!assessment) return state;
      advanced = { ...advanced, prequalification: [assessment, ...advanced.prequalification], matches };
      result = { ...result, advanced };
      result = addActivity(result, 'Pre-qualification refreshed', `${assessment.score}/100 · ${assessment.band.replaceAll('_', ' ')}`, action.applicationId);
      result = emit(result, 'application', action.applicationId, 'application.prequalification.completed', ['advisory'], { score: assessment.score, band: assessment.band, topMatches: matches.slice(0, 3).map((m) => ({ productId: m.productId, score: m.score })) });
      return result;
    }
    case 'save_portfolio_view': {
      const view = { id: makeId('VIEW'), name: action.name.trim() || 'Saved view', statusFilter: action.statusFilter, sortBy: action.sortBy, columns: action.columns, createdAt: now() } as const;
      return { ...result, advanced: { ...advanced, portfolioViews: [view, ...advanced.portfolioViews] } };
    }
    case 'create_draw': {
      const number = advanced.drawRequests.filter((d) => d.applicationId === action.applicationId).length + 1;
      const draw = { id: makeId('DRAW'), applicationId: action.applicationId, facilityId: state.facilities.find((f) => f.applicationId === action.applicationId)?.id, number, requestedAmount: action.requestedAmount, requestedDate: now().slice(0, 10), neededBy: action.neededBy, status: 'draft' as const, lineItems: action.lineItems, note: action.note };
      result = { ...result, advanced: { ...advanced, drawRequests: [draw, ...advanced.drawRequests] } };
      return addActivity(result, `Draw request #${number} created`, `${action.requestedAmount.toLocaleString()} requested`, action.applicationId);
    }
    case 'submit_draw': {
      const draw = advanced.drawRequests.find((d) => d.id === action.drawRequestId);
      if (!draw || draw.status !== 'draft') return state;
      advanced = { ...advanced, drawRequests: advanced.drawRequests.map((d) => d.id === draw.id ? { ...d, status: 'submitted' as const } : d) };
      result = { ...result, advanced };
      result = emit(result, 'application', draw.applicationId, 'construction.draw.submitted', ['advisory', 'investor'], { drawRequestId: draw.id, requestedAmount: draw.requestedAmount, neededBy: draw.neededBy });
      return notify(addActivity(result, `Draw request #${draw.number} submitted`, draw.note, draw.applicationId), 'Draw request submitted', `Draw #${draw.number} is ready for PiHub review.`, '/capital', 'servicing');
    }
    case 'request_inspection': {
      const inspection = { id: makeId('INSP'), applicationId: action.applicationId, drawRequestId: action.drawRequestId, inspectionType: action.inspectionType, requestedDate: now().slice(0, 10), preferredDate: action.preferredDate, status: 'requested' as const };
      result = { ...result, advanced: { ...advanced, inspections: [inspection, ...advanced.inspections] } };
      result = emit(result, 'application', action.applicationId, 'construction.inspection.requested', ['advisory'], { inspectionId: inspection.id, drawRequestId: action.drawRequestId, preferredDate: action.preferredDate, inspectionType: action.inspectionType });
      return notify(addActivity(result, 'Inspection requested', `${action.inspectionType} · preferred ${action.preferredDate}`, action.applicationId), 'Inspection requested', 'PiHub will coordinate scheduling.', '/capital', 'servicing');
    }
    case 'connect_source': {
      const existing = advanced.connections.find((c) => c.provider === action.provider);
      const connection = existing ? { ...existing, label: action.label, scope: action.scope, status: 'connected' as const, lastSyncAt: now(), accountCount: action.provider === 'finapi' ? 3 : undefined } : { id: makeId('CONN'), provider: action.provider, label: action.label, status: 'connected' as const, scope: action.scope, lastSyncAt: now() };
      advanced = { ...advanced, connections: existing ? advanced.connections.map((c) => c.id === existing.id ? connection : c) : [connection, ...advanced.connections] };
      result = { ...result, advanced };
      result = emit(result, 'organization', state.organization.id, 'data.connection.authorized', ['admin', 'advisory'], { connectionId: connection.id, provider: connection.provider, scope: connection.scope });
      return notify(addActivity(result, `${connection.label} connected`, connection.scope.join(', ')), 'Data source connected', connection.label, '/connections', 'security');
    }
    case 'sync_source': {
      const conn = advanced.connections.find((c) => c.id === action.connectionId);
      if (!conn || conn.status !== 'connected') return state;
      const refreshed = advanced.freshness.map((f) => ({ ...f, lastUpdatedAt: now(), status: 'needs_confirmation' as const, source: conn.provider, sourceLabel: conn.label }));
      advanced = { ...advanced, connections: advanced.connections.map((c) => c.id === conn.id ? { ...c, lastSyncAt: now(), status: 'connected' as const } : c), freshness: refreshed };
      result = { ...result, advanced };
      return addActivity(result, `${conn.label} synchronized`, 'Imported values require borrower confirmation before becoming submitted application data.');
    }
    case 'disconnect_source': {
      const conn = advanced.connections.find((c) => c.id === action.connectionId);
      if (!conn) return state;
      advanced = { ...advanced, connections: advanced.connections.map((c) => c.id === conn.id ? { ...c, status: 'disconnected' as const } : c) };
      result = { ...result, advanced };
      return emit(addActivity(result, `${conn.label} disconnected`), 'organization', state.organization.id, 'data.connection.revoked', ['admin'], { connectionId: conn.id, provider: conn.provider });
    }
    case 'confirm_freshness': {
      advanced = { ...advanced, freshness: advanced.freshness.map((f) => f.id === action.freshnessId ? { ...f, status: 'fresh' as const, confirmedByBorrowerAt: now() } : f) };
      return { ...result, advanced };
    }
    case 'create_folder': {
      const folder = { id: makeId('FOLDER'), name: action.name.trim() || 'Untitled folder', purpose: action.purpose, applicationId: action.applicationId, createdAt: now() };
      return { ...result, advanced: { ...advanced, dataRoomFolders: [folder, ...advanced.dataRoomFolders] } };
    }
    case 'add_vault_item': {
      const doc = state.documents.find((d) => d.id === action.documentId);
      if (!doc) return state;
      const item = { id: makeId('VAULT'), documentId: doc.id, label: action.label || doc.name, category: action.category || doc.category, validUntil: action.validUntil, reusable: true, applicationIds: [doc.applicationId] };
      return { ...result, advanced: { ...advanced, companyVault: [item, ...advanced.companyVault] } };
    }
    case 'analyze_document': {
      const doc = state.documents.find((d) => d.id === action.documentId);
      if (!doc) return state;
      const lower = `${doc.name} ${doc.category}`.toLowerCase();
      const predictedCategory = lower.includes('financial') || lower.includes('audit') ? 'Financial statements' : lower.includes('cost') || lower.includes('budget') ? 'Project cost plan' : lower.includes('valuation') ? 'Valuation' : doc.category;
      const warnings: string[] = [];
      if (doc.size === 0) warnings.push('No uploaded binary is available for extraction in demo mode.');
      if (doc.status === 'expired') warnings.push('Document is marked expired and should be replaced.');
      const analysis = { id: makeId('DOCINT'), documentId: doc.id, engine: 'demo' as const, status: warnings.length ? 'needs_review' as const : 'processed' as const, predictedCategory, confidence: doc.size ? 0.91 : 0.62, extractedFields: (lower.includes('financial') ? { fiscalYear: 2025, currency: 'EUR', revenue: 38_000_000, ebitda: 6_400_000 } : {}) as Record<string, string | number>, warnings, tamperSignals: [], createdAt: now() };
      result = { ...result, advanced: { ...advanced, documentIntelligence: [analysis, ...advanced.documentIntelligence.filter((a) => a.documentId !== doc.id)] } };
      return emit(addActivity(result, 'Document intelligence completed', `${doc.name} · ${predictedCategory}`, doc.applicationId), 'document', doc.id, 'document.intelligence.completed', ['advisory'], { predictedCategory, confidence: analysis.confidence, warnings });
    }
    case 'create_disclosure': {
      const grant = { id: makeId('DISC'), applicationId: action.applicationId, providerName: action.providerName, providerType: action.providerType, documentIds: action.documentIds, purpose: action.purpose, status: 'active' as const, consentedAt: now(), expiresAt: action.expiresAt };
      result = { ...result, advanced: { ...advanced, disclosures: [grant, ...advanced.disclosures] } };
      result = emit(result, 'application', action.applicationId, 'disclosure.consent.granted', ['advisory', 'admin'], { disclosureId: grant.id, providerName: grant.providerName, documentIds: grant.documentIds, purpose: grant.purpose, expiresAt: grant.expiresAt });
      return notify(addActivity(result, 'Disclosure consent granted', `${grant.providerName} · ${grant.documentIds.length} document(s)`, action.applicationId), 'Disclosure consent recorded', grant.providerName, '/disclosures', 'security');
    }
    case 'revoke_disclosure': {
      const grant = advanced.disclosures.find((d) => d.id === action.disclosureId);
      if (!grant || grant.status !== 'active') return state;
      advanced = { ...advanced, disclosures: advanced.disclosures.map((d) => d.id === grant.id ? { ...d, status: 'revoked' as const, revokedAt: now() } : d) };
      result = { ...result, advanced };
      return emit(addActivity(result, 'Disclosure consent revoked', grant.providerName, grant.applicationId), 'application', grant.applicationId, 'disclosure.consent.revoked', ['advisory', 'admin'], { disclosureId: grant.id, providerName: grant.providerName });
    }
    case 'save_scenario': {
      const scenario = { ...action.scenario, id: makeId('SCN'), createdAt: now() };
      return addActivity({ ...result, advanced: { ...advanced, scenarios: [scenario, ...advanced.scenarios] } }, 'Financing scenario saved', scenario.name, scenario.applicationId);
    }
    case 'send_negotiation_message': {
      if (!action.body.trim()) return state;
      const existing = advanced.negotiations.find((n) => n.termSheetId === action.termSheetId);
      const message = { id: makeId('NMSG'), author: 'borrower' as const, body: action.body.trim(), createdAt: now() };
      const thread = existing ? { ...existing, messages: [...existing.messages, message] } : { id: makeId('NEG'), applicationId: action.applicationId, termSheetId: action.termSheetId, status: 'open' as const, messages: [message], counters: [] };
      advanced = { ...advanced, negotiations: existing ? advanced.negotiations.map((n) => n.id === existing.id ? thread : n) : [thread, ...advanced.negotiations] };
      result = { ...result, advanced };
      return emit(addActivity(result, 'Term-sheet question sent', action.body.trim(), action.applicationId), 'terms', action.termSheetId, 'terms.negotiation.message', ['advisory'], { body: action.body.trim() });
    }
    case 'submit_counter': {
      if (!action.requestedValue.trim() || !action.rationale.trim()) return state;
      const existing = advanced.negotiations.find((n) => n.termSheetId === action.termSheetId);
      const counter = { id: makeId('COUNTER'), field: action.field, requestedValue: action.requestedValue.trim(), rationale: action.rationale.trim(), status: 'proposed' as const, createdAt: now() };
      const thread = existing ? { ...existing, counters: [...existing.counters, counter] } : { id: makeId('NEG'), applicationId: action.applicationId, termSheetId: action.termSheetId, status: 'open' as const, messages: [], counters: [counter] };
      advanced = { ...advanced, negotiations: existing ? advanced.negotiations.map((n) => n.id === existing.id ? thread : n) : [thread, ...advanced.negotiations] };
      result = { ...result, advanced };
      return emit(addActivity(result, 'Commercial counter proposed', `${action.field}: ${action.requestedValue}`, action.applicationId), 'terms', action.termSheetId, 'terms.counter.proposed', ['advisory', 'investor'], { field: action.field, requestedValue: action.requestedValue, rationale: action.rationale });
    }
    case 'create_signature_envelope': {
      const envelope = { id: makeId('SIGN'), applicationId: action.applicationId, title: action.title, provider: action.provider, documentIds: action.documentIds, signers: action.signerEmails.filter(Boolean).map((email, i) => ({ email, name: email.split('@')[0], order: i + 1, status: 'sent' as const })), status: 'sent' as const, createdAt: now() };
      result = { ...result, advanced: { ...advanced, signatureEnvelopes: [envelope, ...advanced.signatureEnvelopes] } };
      return emit(addActivity(result, 'Signature envelope sent', envelope.title, action.applicationId), 'closing', envelope.id, 'esign.envelope.sent', ['advisory', 'admin'], { provider: envelope.provider, documentIds: envelope.documentIds, signerCount: envelope.signers.length });
    }
    case 'sign_envelope_demo': {
      const env = advanced.signatureEnvelopes.find((e) => e.id === action.envelopeId);
      if (!env || env.status === 'completed') return state;
      const signers = env.signers.map((s) => s.email === action.signerEmail ? { ...s, status: 'signed' as const } : s);
      const completed = signers.every((s) => s.status === 'signed');
      advanced = { ...advanced, signatureEnvelopes: advanced.signatureEnvelopes.map((e) => e.id === env.id ? { ...e, signers, status: completed ? 'completed' as const : 'partially_signed' as const } : e) };
      result = { ...result, advanced };
      return emit(addActivity(result, 'Signature status updated', `${action.signerEmail} signed`, env.applicationId), 'closing', env.id, completed ? 'esign.envelope.completed' : 'esign.signer.signed', ['advisory', 'admin'], { signerEmail: action.signerEmail, completed });
    }
    case 'create_payment_instruction': {
      const instruction = { id: makeId('PI'), facilityId: action.facilityId, label: action.label, ibanMasked: action.ibanMasked, accountHolder: action.accountHolder, mandateType: action.mandateType, status: 'pending_verification' as const, isDefault: false };
      result = { ...result, advanced: { ...advanced, paymentInstructions: [instruction, ...advanced.paymentInstructions] } };
      return emit(addActivity(result, 'Payment instruction submitted', action.label), 'facility', action.facilityId, 'facility.payment_instruction.submitted', ['advisory', 'admin'], { paymentInstructionId: instruction.id, mandateType: action.mandateType });
    }
    case 'set_default_payment_instruction': {
      const instruction = advanced.paymentInstructions.find((p) => p.id === action.instructionId && p.status === 'active');
      if (!instruction) return state;
      advanced = { ...advanced, paymentInstructions: advanced.paymentInstructions.map((p) => p.facilityId === instruction.facilityId ? { ...p, isDefault: p.id === instruction.id } : p) };
      return { ...result, advanced };
    }
    case 'save_covenant_forecast': {
      const covenant = state.covenants.find((c) => c.id === action.covenantId);
      if (!covenant) return state;
      const headroom = covenant.operator === '<=' ? covenant.threshold - action.forecastValue : action.forecastValue - covenant.threshold;
      const denom = Math.max(Math.abs(covenant.threshold), 1);
      const ratio = headroom / denom;
      const forecast = { id: makeId('COVF'), covenantId: covenant.id, testDate: action.testDate, forecastValue: action.forecastValue, headroom, status: headroom < 0 ? 'at_risk' as const : ratio < .1 ? 'watch' as const : 'comfortable' as const, assumption: action.assumption };
      return addActivity({ ...result, advanced: { ...advanced, covenantForecasts: [forecast, ...advanced.covenantForecasts.filter((f) => f.covenantId !== covenant.id)] } }, 'Covenant forecast saved', `${covenant.name} · ${forecast.status}`);
    }
    case 'invite_professional': {
      const professional = { ...action.professional, id: makeId('PRO'), status: 'invited' as const };
      result = { ...result, advanced: { ...advanced, professionals: [professional, ...advanced.professionals] } };
      return emit(addActivity(result, 'External professional invited', `${professional.name} · ${professional.profession}`), 'organization', state.organization.id, 'organization.professional.invited', ['admin'], { professionalId: professional.id, email: professional.email, applicationIds: professional.applicationIds, permissions: professional.permissions, expiresAt: professional.expiresAt });
    }
    case 'revoke_professional': {
      const professional = advanced.professionals.find((p) => p.id === action.professionalId);
      if (!professional) return state;
      advanced = { ...advanced, professionals: advanced.professionals.map((p) => p.id === professional.id ? { ...p, status: 'revoked' as const } : p) };
      result = { ...result, advanced };
      return emit(addActivity(result, 'External professional access revoked', professional.name), 'organization', state.organization.id, 'organization.professional.revoked', ['admin'], { professionalId: professional.id });
    }
    case 'save_esg': {
      const existing = advanced.esgProfiles.find((p) => p.applicationId === action.profile.applicationId);
      const profile = { ...action.profile, id: existing?.id ?? makeId('ESG'), updatedAt: now() };
      advanced = { ...advanced, esgProfiles: existing ? advanced.esgProfiles.map((p) => p.id === existing.id ? profile : p) : [profile, ...advanced.esgProfiles] };
      result = { ...result, advanced };
      return emit(addActivity(result, 'ESG / sustainability data updated', `${profile.energyStandard} · ${profile.taxonomyAlignedPct}% taxonomy alignment`, profile.applicationId), 'application', profile.applicationId, 'application.esg.updated', ['advisory'], { renewableSharePct: profile.renewableSharePct, taxonomyAlignedPct: profile.taxonomyAlignedPct, kfwProgram: profile.kfwProgram });
    }
    case 'configure_integration': {
      const connector = { ...action.connector, id: makeId('INT'), status: 'configured' as const };
      return { ...result, advanced: { ...advanced, integrations: [connector, ...advanced.integrations] } };
    }
    case 'test_integration': {
      const connector = advanced.integrations.find((i) => i.id === action.connectorId);
      if (!connector) return state;
      advanced = { ...advanced, integrations: advanced.integrations.map((i) => i.id === connector.id ? { ...i, status: 'connected' as const, lastTestAt: now() } : i) };
      return addActivity({ ...result, advanced }, 'Integration test succeeded', connector.name);
    }
    case 'create_complaint': {
      if (!action.complaint.subject.trim() || !action.complaint.description.trim()) return state;
      const complaint = { ...action.complaint, id: makeId('CMP'), status: 'submitted' as const, createdAt: now(), reference: `PIH-CMP-${Date.now().toString().slice(-7)}` };
      result = { ...result, advanced: { ...advanced, complaints: [complaint, ...advanced.complaints] } };
      result = emit(result, 'support', complaint.id, 'complaint.submitted', ['admin'], { applicationId: complaint.applicationId, facilityId: complaint.facilityId, category: complaint.category, reference: complaint.reference });
      return notify(addActivity(result, 'Complaint submitted', `${complaint.reference} · ${complaint.subject}`, complaint.applicationId), 'Complaint received', complaint.reference ?? complaint.subject, '/complaints', 'support');
    }
    case 'create_export': {
      const pkg = { id: makeId('EXPORT'), applicationId: action.applicationId, format: action.format, status: 'ready' as const, createdAt: now(), includedSections: action.includedSections };
      return addActivity({ ...result, advanced: { ...advanced, exportPackages: [pkg, ...advanced.exportPackages] } }, 'Data export package generated', action.includedSections.join(', '), action.applicationId);
    }
    case 'copilot_ask': {
      if (!action.body.trim()) return state;
      const user: CopilotMessage = { id: makeId('COP'), role: 'user', body: action.body.trim(), createdAt: now() };
      const assistant = copilotAnswer(state, action.body);
      return { ...result, advanced: { ...advanced, copilot: [...advanced.copilot, user, assistant] } };
    }
  }
}
