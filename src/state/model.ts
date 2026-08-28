import type { AdvancedBorrowerFeatures } from './advancedModel.js';
export type Locale = 'en' | 'de';
export type ModuleId = 'borrower' | 'advisory' | 'investor' | 'admin';
export type ApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'pihub_review'
  | 'information_required'
  | 'structuring'
  | 'due_diligence'
  | 'investor_review'
  | 'indicative_terms'
  | 'terms_accepted'
  | 'documentation'
  | 'conditions_precedent'
  | 'ready_to_fund'
  | 'funded'
  | 'declined'
  | 'withdrawn'
  | 'archived';

export type DocumentStatus = 'required' | 'uploaded' | 'under_review' | 'accepted' | 'rejected' | 'expired';
export type RequestStatus = 'open' | 'responded' | 'resolved' | 'overdue';
export type NotificationKind = 'request' | 'document' | 'status' | 'terms' | 'closing' | 'message' | 'security' | 'support' | 'servicing' | 'payment' | 'covenant' | 'reporting' | 'privacy';

export interface CompanySection {
  legalName: string;
  registrationNumber: string;
  legalForm: string;
  country: string;
  city: string;
  website: string;
  industry: string;
  description: string;
  ownershipSummary: string;
  uboNames: string;
  bankingRelationships: string;
  revenue: number;
  ebitda: number;
  employees: number;
}

export interface FinancingSection {
  productId: string | null;
  purpose: string;
  amount: number;
  currency: 'EUR' | 'USD' | 'GBP';
  desiredFundingDate: string;
  tenorMonths: number;
  structure: string;
  useOfProceeds: string;
  sponsorEquity: number;
  existingDebt: number;
  repaymentProfile: string;
}

export interface ProjectSection {
  name: string;
  location: string;
  assetClass: string;
  stage: string;
  acquisitionPrice: number;
  constructionBudget: number;
  grossDevelopmentValue: number;
  expectedCompletion: string;
  planningStatus: string;
  preSalesOrLeasing: string;
  valuation: number;
  exitStrategy: string;
  sustainability: string;
}

export interface FinancialSection {
  revenue2024: number;
  revenue2025: number;
  ebitda2024: number;
  ebitda2025: number;
  cash: number;
  debt: number;
  equity: number;
  forecastNote: string;
}

export interface Application {
  id: string;
  organizationId: string;
  name: string;
  status: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  financing: FinancingSection;
  company: CompanySection;
  project: ProjectSection;
  financials: FinancialSection;
  sectionCompletion: Record<'financing' | 'company' | 'project' | 'financials' | 'documents', boolean>;
  version: number;
}

export interface ApplicationVersion {
  id: string;
  applicationId: string;
  version: number;
  reason: string;
  actor: string;
  createdAt: string;
  snapshot: Application;
}

export interface BorrowerDocument {
  id: string;
  applicationId: string;
  category: string;
  name: string;
  requirementLabel?: string;
  mimeType: string;
  size: number;
  status: DocumentStatus;
  required: boolean;
  version: number;
  uploadedAt?: string;
  reviewedAt?: string;
  dueDate?: string;
  rejectionReason?: string;
  blobKey?: string;
}

export interface RequestThread {
  id: string;
  applicationId: string;
  title: string;
  description: string;
  status: RequestStatus;
  owner: 'borrower' | 'pihub';
  createdBy: ModuleId;
  dueDate?: string;
  priority: 'normal' | 'high';
  relatedDocumentId?: string;
  messages: Array<{
    id: string;
    author: 'borrower' | 'pihub';
    text: string;
    createdAt: string;
    attachmentDocumentIds?: string[];
  }>;
}

export interface ActivityEvent {
  id: string;
  applicationId?: string;
  type: string;
  label: string;
  detail?: string;
  actor: string;
  createdAt: string;
}

export interface IntegrationEvent {
  id: string;
  aggregateType: 'application' | 'organization' | 'document' | 'request' | 'terms' | 'closing' | 'user' | 'support' | 'facility' | 'payment' | 'covenant' | 'reporting' | 'servicing_request' | 'privacy_request';
  aggregateId: string;
  type: string;
  targetModules: ModuleId[];
  payload: Record<string, unknown>;
  createdAt: string;
  state: 'queued' | 'acknowledged';
}

export interface Notification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  href: string;
  read: boolean;
  createdAt: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'editor' | 'finance' | 'legal' | 'viewer' | 'signatory';
  status: 'active' | 'invited' | 'revoked';
  invitedAt?: string;
  invitationSentAt?: string;
}

export interface TermSheet {
  id: string;
  applicationId: string;
  provider: string;
  amount: number;
  marginBps: number;
  referenceRate: string;
  tenorMonths: number;
  ltv: number;
  fees: number;
  expiryDate: string;
  status: 'available' | 'accepted' | 'rejected';
}

export interface ClosingItem {
  id: string;
  applicationId: string;
  title: string;
  owner: 'borrower' | 'pihub' | 'legal';
  required: boolean;
  complete: boolean;
  dueDate?: string;
}

export interface SupportTicket {
  id: string;
  applicationId?: string;
  category: 'application' | 'documents' | 'account' | 'technical' | 'other';
  subject: string;
  message: string;
  status: 'open' | 'closed';
  createdAt: string;
}


export interface Facility {
  id: string;
  applicationId: string;
  provider: string;
  originalAmount: number;
  outstandingAmount: number;
  currency: 'EUR';
  referenceRate: string;
  marginBps: number;
  startDate: string;
  maturityDate: string;
  securitySummary: string;
  status: 'pending_funding' | 'active' | 'matured' | 'repaid';
  nextPaymentDate?: string;
}

export interface PaymentScheduleItem {
  id: string;
  facilityId: string;
  dueDate: string;
  principal: number;
  interest: number;
  fees: number;
  status: 'scheduled' | 'due' | 'paid' | 'overdue';
  paidAt?: string;
}

export interface Covenant {
  id: string;
  facilityId: string;
  name: string;
  metric: string;
  operator: '<=' | '>=' | '=';
  threshold: number;
  currentValue?: number;
  unit: '%' | 'x' | 'EUR';
  nextTestDate: string;
  status: 'not_tested' | 'compliant' | 'warning' | 'breach';
}

export interface ReportingObligation {
  id: string;
  facilityId: string;
  title: string;
  frequency: 'monthly' | 'quarterly' | 'annual' | 'event_driven';
  dueDate: string;
  status: 'required' | 'submitted' | 'under_review' | 'accepted' | 'rejected';
  documentId?: string;
  remediation?: string;
}

export interface ServicingRequest {
  id: string;
  facilityId: string;
  type: 'waiver' | 'consent' | 'amendment' | 'extension' | 'refinance' | 'payment_notice' | 'facility_increase' | 'additional_drawdown' | 'rollover' | 'partial_prepayment' | 'full_repayment' | 'payment_account_change' | 'payoff';
  subject: string;
  description: string;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'declined' | 'withdrawn';
  createdAt: string;
  submittedAt?: string;
}

export interface PrivacyRequest {
  id: string;
  type: 'access' | 'export' | 'correction' | 'restriction' | 'deletion';
  status: 'submitted' | 'under_review' | 'completed' | 'declined';
  createdAt: string;
  note?: string;
}

export interface BorrowerState {
  schemaVersion: 5;
  locale: Locale;
  activeApplicationId: string;
  organization: {
    id: string;
    name: string;
    verificationStatus: 'pending' | 'verified' | 'action_required';
  };
  applications: Application[];
  applicationVersions: ApplicationVersion[];
  documents: BorrowerDocument[];
  requests: RequestThread[];
  notifications: Notification[];
  activity: ActivityEvent[];
  outbox: IntegrationEvent[];
  team: TeamMember[];
  terms: TermSheet[];
  closingItems: ClosingItem[];
  savedProductIds: string[];
  comparisonProductIds: string[];
  supportTickets: SupportTicket[];
  facilities: Facility[];
  paymentSchedule: PaymentScheduleItem[];
  covenants: Covenant[];
  reportingObligations: ReportingObligation[];
  servicingRequests: ServicingRequest[];
  privacyRequests: PrivacyRequest[];
  advanced: AdvancedBorrowerFeatures;
  profile: {
    name: string;
    email: string;
    phone: string;
    jobTitle: string;
    notificationEmail: boolean;
  };
  lastSavedAt: string;
}
