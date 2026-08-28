export type WorkflowKind = 'construction' | 'bridge' | 'mezzanine' | 'revenue_based' | 'subordinated' | 'corporate' | 'whole_loan';
export type ConnectionProvider = 'finapi' | 'datev' | 'bank_csv' | 'erp_api' | 'fineract' | 'custom_webhook';

export interface ProductWorkflowProfile {
  id: string;
  label: string;
  kind: WorkflowKind;
  productIds: string[];
  requiredSections: string[];
  requiredDocumentCategories: string[];
  servicingModules: string[];
  milestoneLabels: string[];
  explanation: string;
}

export interface PrequalificationAssessment {
  id: string;
  applicationId: string;
  createdAt: string;
  score: number;
  band: 'strong_fit' | 'potential_fit' | 'needs_information' | 'unlikely_fit';
  reasons: string[];
  blockers: string[];
  nextActions: string[];
}

export interface MatchExplanation {
  productId: string;
  score: number;
  fit: 'strong' | 'possible' | 'weak';
  reasons: string[];
  gaps: string[];
}

export interface SpvRecord {
  id: string;
  name: string;
  legalForm: string;
  jurisdiction: string;
  registrationNumber: string;
  applicationIds: string[];
  status: 'active' | 'inactive';
}

export interface SavedPortfolioView {
  id: string;
  name: string;
  statusFilter: string;
  sortBy: 'updated' | 'amount' | 'maturity' | 'name';
  columns: string[];
  createdAt: string;
}

export interface SourcesUsesLine {
  id: string;
  applicationId: string;
  side: 'source' | 'use';
  category: string;
  description: string;
  amount: number;
  fundedAmount: number;
}

export interface ConstructionBudgetLine {
  id: string;
  applicationId: string;
  costCode: string;
  category: string;
  originalBudget: number;
  revisedBudget: number;
  committed: number;
  paidToDate: number;
}

export interface DrawRequest {
  id: string;
  applicationId: string;
  facilityId?: string;
  number: number;
  requestedAmount: number;
  approvedAmount?: number;
  requestedDate: string;
  neededBy: string;
  status: 'draft' | 'submitted' | 'under_review' | 'inspection_required' | 'approved' | 'partially_approved' | 'funded' | 'rejected' | 'withdrawn';
  lineItems: Array<{ id: string; budgetLineId: string; amount: number; invoiceReference?: string; documentIds: string[] }>;
  note: string;
}

export interface InspectionRequest {
  id: string;
  applicationId: string;
  drawRequestId?: string;
  inspectionType: 'progress' | 'completion' | 'valuation' | 'site';
  requestedDate: string;
  preferredDate: string;
  status: 'requested' | 'scheduled' | 'completed' | 'exception' | 'cancelled';
  inspector?: string;
  reportDocumentId?: string;
  exceptionNote?: string;
}

export interface DataConnection {
  id: string;
  provider: ConnectionProvider;
  label: string;
  status: 'disconnected' | 'pending_consent' | 'connected' | 'syncing' | 'error' | 'expired';
  scope: string[];
  lastSyncAt?: string;
  expiresAt?: string;
  error?: string;
  accountCount?: number;
}

export interface DataFreshnessRecord {
  id: string;
  source: string;
  fieldGroup: string;
  sourceLabel: string;
  lastUpdatedAt: string;
  confirmedByBorrowerAt?: string;
  status: 'fresh' | 'stale' | 'needs_confirmation';
}

export interface CashFlowSnapshot {
  id: string;
  sourceConnectionId: string;
  period: string;
  inflows: number;
  outflows: number;
  endingCash: number;
  debtService: number;
  createdAt: string;
}

export interface DataRoomFolder {
  id: string;
  name: string;
  applicationId?: string;
  purpose: 'application' | 'company_vault' | 'closing' | 'servicing';
  createdAt: string;
}

export interface CompanyVaultItem {
  id: string;
  documentId: string;
  label: string;
  category: string;
  validUntil?: string;
  reusable: boolean;
  applicationIds: string[];
}

export interface DocumentIntelligenceResult {
  id: string;
  documentId: string;
  engine: 'demo' | 'docling';
  status: 'queued' | 'processed' | 'needs_review' | 'failed';
  predictedCategory?: string;
  confidence?: number;
  extractedFields: Record<string, string | number>;
  warnings: string[];
  duplicateOfDocumentId?: string;
  tamperSignals: string[];
  createdAt: string;
}

export interface DisclosureGrant {
  id: string;
  applicationId: string;
  providerName: string;
  providerType: 'lender' | 'investor' | 'adviser' | 'service_provider';
  documentIds: string[];
  purpose: string;
  status: 'pending' | 'active' | 'revoked' | 'expired';
  consentedAt?: string;
  revokedAt?: string;
  expiresAt?: string;
}

export interface FinancingScenario {
  id: string;
  applicationId: string;
  name: string;
  amount: number;
  tenorMonths: number;
  referenceRatePct: number;
  marginBps: number;
  feesPct: number;
  amortizationPct: number;
  equity: number;
  propertyValue: number;
  projectedAnnualNOI: number;
  createdAt: string;
}

export interface NegotiationThread {
  id: string;
  applicationId: string;
  termSheetId: string;
  status: 'open' | 'agreed' | 'closed';
  messages: Array<{ id: string; author: 'borrower' | 'pihub'; body: string; createdAt: string }>;
  counters: Array<{ id: string; field: string; requestedValue: string; rationale: string; status: 'proposed' | 'accepted' | 'declined'; createdAt: string }>;
}

export interface SignatureEnvelope {
  id: string;
  applicationId: string;
  title: string;
  provider: 'demo' | 'documenso' | 'opensign';
  documentIds: string[];
  signers: Array<{ email: string; name: string; order: number; status: 'pending' | 'sent' | 'viewed' | 'signed' | 'declined' }>;
  status: 'draft' | 'sent' | 'partially_signed' | 'completed' | 'voided';
  createdAt: string;
}

export interface DeadlineItem {
  id: string;
  applicationId?: string;
  facilityId?: string;
  kind: 'request' | 'document' | 'payment' | 'covenant' | 'reporting' | 'inspection' | 'closing' | 'maturity' | 'term_expiry';
  title: string;
  dueDate: string;
  href: string;
  status: 'upcoming' | 'due' | 'overdue' | 'complete';
}

export interface PaymentInstruction {
  id: string;
  facilityId: string;
  label: string;
  ibanMasked: string;
  accountHolder: string;
  mandateType: 'manual_transfer' | 'sepa_direct_debit';
  status: 'pending_verification' | 'active' | 'suspended';
  isDefault: boolean;
}

export interface FacilityStatement {
  id: string;
  facilityId: string;
  periodStart: string;
  periodEnd: string;
  openingBalance: number;
  principalPaid: number;
  interestPaid: number;
  feesPaid: number;
  closingBalance: number;
  generatedAt: string;
}

export interface CovenantForecast {
  id: string;
  covenantId: string;
  testDate: string;
  forecastValue: number;
  headroom: number;
  status: 'comfortable' | 'watch' | 'at_risk';
  assumption: string;
}

export interface ExternalProfessional {
  id: string;
  name: string;
  email: string;
  profession: 'accountant' | 'lawyer' | 'tax_adviser' | 'architect' | 'contractor' | 'broker' | 'other';
  applicationIds: string[];
  permissions: Array<'view_documents' | 'upload_documents' | 'respond_requests' | 'view_financials'>;
  expiresAt: string;
  status: 'invited' | 'active' | 'revoked' | 'expired';
}

export interface ESGProfile {
  id: string;
  applicationId: string;
  epcRating: string;
  energyStandard: string;
  renewableSharePct: number;
  operationalCo2KgSqm: number;
  taxonomyAlignedPct: number;
  kfwProgram: string;
  certifications: string[];
  updatedAt: string;
}

export interface IntegrationConnector {
  id: string;
  name: string;
  kind: 'erp' | 'webhook' | 'servicing' | 'workflow' | 'document_intelligence' | 'esign';
  provider: string;
  mode: 'demo' | 'external_api' | 'self_hosted';
  baseUrl?: string;
  status: 'configured' | 'connected' | 'error' | 'disabled';
  lastTestAt?: string;
  capabilities: string[];
}

export interface ComplaintCase {
  id: string;
  applicationId?: string;
  facilityId?: string;
  category: 'payment' | 'document' | 'service' | 'decision' | 'privacy' | 'other';
  subject: string;
  description: string;
  status: 'submitted' | 'acknowledged' | 'under_review' | 'resolved' | 'closed';
  createdAt: string;
  reference?: string;
}

export interface DataExportPackage {
  id: string;
  applicationId?: string;
  format: 'json' | 'csv_manifest';
  status: 'ready';
  createdAt: string;
  includedSections: string[];
}

export interface CopilotMessage {
  id: string;
  role: 'user' | 'assistant';
  body: string;
  createdAt: string;
  href?: string;
}

export interface AdvancedBorrowerFeatures {
  workflowProfiles: ProductWorkflowProfile[];
  prequalification: PrequalificationAssessment[];
  matches: MatchExplanation[];
  spvs: SpvRecord[];
  portfolioViews: SavedPortfolioView[];
  sourcesUses: SourcesUsesLine[];
  constructionBudget: ConstructionBudgetLine[];
  drawRequests: DrawRequest[];
  inspections: InspectionRequest[];
  connections: DataConnection[];
  freshness: DataFreshnessRecord[];
  cashFlow: CashFlowSnapshot[];
  dataRoomFolders: DataRoomFolder[];
  companyVault: CompanyVaultItem[];
  documentIntelligence: DocumentIntelligenceResult[];
  disclosures: DisclosureGrant[];
  scenarios: FinancingScenario[];
  negotiations: NegotiationThread[];
  signatureEnvelopes: SignatureEnvelope[];
  deadlines: DeadlineItem[];
  paymentInstructions: PaymentInstruction[];
  statements: FacilityStatement[];
  covenantForecasts: CovenantForecast[];
  professionals: ExternalProfessional[];
  esgProfiles: ESGProfile[];
  integrations: IntegrationConnector[];
  complaints: ComplaintCase[];
  exportPackages: DataExportPackage[];
  copilot: CopilotMessage[];
}

export type BorrowerFeatureAction =
  | { type: 'prequalify'; applicationId: string }
  | { type: 'save_portfolio_view'; name: string; statusFilter: string; sortBy: SavedPortfolioView['sortBy']; columns: string[] }
  | { type: 'create_draw'; applicationId: string; requestedAmount: number; neededBy: string; note: string; lineItems: DrawRequest['lineItems'] }
  | { type: 'submit_draw'; drawRequestId: string }
  | { type: 'request_inspection'; applicationId: string; drawRequestId?: string; inspectionType: InspectionRequest['inspectionType']; preferredDate: string }
  | { type: 'connect_source'; provider: ConnectionProvider; label: string; scope: string[] }
  | { type: 'sync_source'; connectionId: string }
  | { type: 'disconnect_source'; connectionId: string }
  | { type: 'confirm_freshness'; freshnessId: string }
  | { type: 'create_folder'; name: string; purpose: DataRoomFolder['purpose']; applicationId?: string }
  | { type: 'add_vault_item'; documentId: string; label: string; category: string; validUntil?: string }
  | { type: 'analyze_document'; documentId: string }
  | { type: 'create_disclosure'; applicationId: string; providerName: string; providerType: DisclosureGrant['providerType']; documentIds: string[]; purpose: string; expiresAt?: string }
  | { type: 'revoke_disclosure'; disclosureId: string }
  | { type: 'save_scenario'; scenario: Omit<FinancingScenario, 'id' | 'createdAt'> }
  | { type: 'send_negotiation_message'; termSheetId: string; applicationId: string; body: string }
  | { type: 'submit_counter'; termSheetId: string; applicationId: string; field: string; requestedValue: string; rationale: string }
  | { type: 'create_signature_envelope'; applicationId: string; title: string; documentIds: string[]; signerEmails: string[]; provider: SignatureEnvelope['provider'] }
  | { type: 'sign_envelope_demo'; envelopeId: string; signerEmail: string }
  | { type: 'create_payment_instruction'; facilityId: string; label: string; ibanMasked: string; accountHolder: string; mandateType: PaymentInstruction['mandateType'] }
  | { type: 'set_default_payment_instruction'; instructionId: string }
  | { type: 'save_covenant_forecast'; covenantId: string; testDate: string; forecastValue: number; assumption: string }
  | { type: 'invite_professional'; professional: Omit<ExternalProfessional, 'id' | 'status'> }
  | { type: 'revoke_professional'; professionalId: string }
  | { type: 'save_esg'; profile: Omit<ESGProfile, 'id' | 'updatedAt'> }
  | { type: 'configure_integration'; connector: Omit<IntegrationConnector, 'id' | 'status'> }
  | { type: 'test_integration'; connectorId: string }
  | { type: 'create_complaint'; complaint: Omit<ComplaintCase, 'id' | 'status' | 'createdAt'> }
  | { type: 'create_export'; applicationId?: string; format: DataExportPackage['format']; includedSections: string[] }
  | { type: 'copilot_ask'; body: string };
