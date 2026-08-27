// Product-flow fixtures derived from the legacy PiHub Figma structure.
// Visual presentation intentionally remains owned by the current Investor design system.

export const CREDIT_RATING_AGENCIES = Object.freeze([
  'Creditreform',
  'Euler Hermes',
  'Fitch',
  'Standard & Poors',
  "Moody's",
  'Bank / Other',
]);

export const BORROWER_DOCUMENT_REQUIREMENTS = Object.freeze([
  { id: 'financial-statements', name: 'Balance sheet and P&L (last 3 years)', category: 'Financial' },
  { id: 'bwa', name: 'Latest BWA / management accounts', category: 'Financial' },
  { id: 'trade-register', name: 'Trade register excerpt', category: 'Corporate' },
  { id: 'shareholders', name: 'List of shareholders', category: 'Corporate' },
  { id: 'articles', name: 'Bylaws / articles of incorporation', category: 'Corporate' },
  { id: 'business-plan', name: 'Business plan', category: 'Business' },
  { id: 'financial-plan', name: 'Financial plan (next 3 years)', category: 'Financial' },
  { id: 'owner-information', name: 'Information about owner / UBO', category: 'Compliance' },
  { id: 'other', name: 'Other supporting documents', category: 'Other' },
]);

export const FINANCING_PRODUCTS = Object.freeze([
  {
    id: 'PRD-2401', title: 'Senior Development Facility', creditType: 'Development financing', industry: 'Real estate', region: 'Berlin', county: 'Berlin', minAmount: 5000000, maxAmount: 30000000, minTerm: 12, maxTerm: 36, collateral: true, ndaRequired: true, ratingRequired: false, provider: 'Rhein Capital Partners', availability: 'Open', createdAt: '2026-07-15', deadline: '2026-10-31', interest: 'EURIBOR + 475 bps', description: 'Senior secured development financing for well-capitalized residential projects with defined construction milestones and documented sponsor equity.', attachments: ['Indicative term sheet.pdf', 'Due diligence checklist.pdf'],
  },
  {
    id: 'PRD-2402', title: 'Acquisition Bridge', creditType: 'Acquisition financing', industry: 'Real estate', region: 'Germany', county: 'Nationwide', minAmount: 2000000, maxAmount: 20000000, minTerm: 6, maxTerm: 24, collateral: true, ndaRequired: false, ratingRequired: false, provider: 'NordBank Credit Fund', availability: 'Open', createdAt: '2026-07-28', deadline: '2026-11-15', interest: 'EURIBOR + 525 bps', description: 'Short-duration acquisition bridge for completed or substantially de-risked assets while long-term financing or disposal is arranged.', attachments: ['Acquisition bridge criteria.pdf'],
  },
  {
    id: 'PRD-2403', title: 'Working Capital Revolver', creditType: 'Revolving credit', industry: 'Business services', region: 'DACH', county: 'Multi-region', minAmount: 250000, maxAmount: 8000000, minTerm: 12, maxTerm: 48, collateral: false, ndaRequired: false, ratingRequired: true, provider: 'PiHub Credit Partners', availability: 'Open', createdAt: '2026-08-02', deadline: '2026-12-31', interest: 'EURIBOR + 390 bps', description: 'Flexible revolving working-capital line for established operating companies with recurring revenues and transparent monthly reporting.', attachments: ['Revolver information pack.pdf'],
  },
  {
    id: 'PRD-2404', title: 'Purchase Financing / Finetrading', creditType: 'Purchase financing / Finetrading', industry: 'Trade & distribution', region: 'Germany', county: 'Nationwide', minAmount: 100000, maxAmount: 5000000, minTerm: 2, maxTerm: 18, collateral: false, ndaRequired: false, ratingRequired: true, provider: 'TradeFlow Finance', availability: 'Open', createdAt: '2026-08-10', deadline: '2026-10-15', interest: 'Risk-based margin', description: 'Purchase-order and inventory financing for qualified trading businesses with verifiable buyer and supplier relationships.', attachments: ['Finetrading eligibility.pdf'],
  },
  {
    id: 'PRD-2405', title: 'Green Retrofit Facility', creditType: 'Project financing', industry: 'Real estate', region: 'Germany', county: 'Nationwide', minAmount: 1000000, maxAmount: 15000000, minTerm: 18, maxTerm: 60, collateral: true, ndaRequired: true, ratingRequired: false, provider: 'Sustainability Credit Fund', availability: 'On hold', createdAt: '2026-08-12', deadline: '2026-11-30', interest: 'EURIBOR + 410 bps', description: 'Energy-efficiency retrofit financing whose intake is temporarily paused while the provider updates eligibility criteria.', attachments: ['Retrofit eligibility preview.pdf'],
  },
]);

export const ADMIN_REFERENCE_SEED = Object.freeze({
  states: ['Berlin', 'Bavaria', 'Hamburg', 'Hesse', 'North Rhine-Westphalia'],
  counties: ['Berlin', 'Munich', 'Hamburg', 'Frankfurt', 'Cologne'],
  industries: ['Real estate', 'Business services', 'Trade & distribution', 'Healthcare', 'Logistics'],
  services: ['Development financing', 'Acquisition financing', 'Revolving credit', 'Purchase financing / Finetrading'],
  ratingAgencies: CREDIT_RATING_AGENCIES,
});

export const ADMIN_ACCOUNT_DIRECTORY = Object.freeze([
  { id: 'ACC-B-101', type: 'Borrower', name: 'Nina Berger', email: 'borrower.demo@pihub.local', phone: '+49 30 555 0147', organization: 'Berlin Living GmbH', createdAt: '2026-02-11', status: 'Active' },
  { id: 'ACC-B-102', type: 'Borrower', name: 'Sofia Wagner', email: 'sofia.wagner@example.test', phone: '+49 89 555 0192', organization: 'Neue Wohnbau GmbH', createdAt: '2026-05-19', status: 'Active' },
  { id: 'ACC-B-103', type: 'Borrower', name: 'David Lorenz', email: 'david.lorenz@example.test', phone: '+49 40 555 0113', organization: 'Nordhafen Logistics SPV', createdAt: '2026-06-04', status: 'Active' },
  { id: 'ACC-I-201', type: 'Investor', name: 'Daniel Becker', email: 'investor.demo@pihub.local', phone: '+49 69 555 0201', organization: 'Rhein Capital Partners', createdAt: '2026-01-23', status: 'Active' },
  { id: 'ACC-I-202', type: 'Investor', name: 'Thomas Frei', email: 'thomas.frei@example.test', phone: '+41 44 555 0202', organization: 'Alpine Pension Fund', createdAt: '2026-04-17', status: 'Active' },
  { id: 'ACC-I-203', type: 'Investor', name: 'Helena Kraus', email: 'helena.kraus@example.test', phone: '+49 211 555 0203', organization: 'NordBank Credit Fund', createdAt: '2026-07-03', status: 'Active' },
]);

export const ADMIN_OPERATION_QUEUES = Object.freeze({
  productRequests: [
    { id: 'PRQ-101', applicant: 'Berlin Living GmbH', product: 'Senior Development Facility', status: 'Under review', owner: 'Product operations' },
    { id: 'PRQ-102', applicant: 'Nordhafen Logistics SPV', product: 'Acquisition Bridge', status: 'Ready', owner: 'Product operations' },
  ],
  creditRequests: [
    { id: 'CR-601', applicant: 'Berlin Living GmbH', amount: 18000000, status: 'Credit review', owner: 'Credit committee' },
    { id: 'CR-602', applicant: 'CareHaus Holding', amount: 27000000, status: 'Information required', owner: 'Credit team' },
  ],
});
