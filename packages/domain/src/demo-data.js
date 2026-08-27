export const DEMO_DEAL = Object.freeze({
  id: 'PH-2026-0147',
  name: 'Berlin Residential Development',
  borrower: 'Berlin Living GmbH',
  sponsor: 'ABC Development AG',
  assetClass: 'Multifamily',
  city: 'Berlin',
  country: 'Germany',
  requestedAmount: 18000000,
  currency: 'EUR',
  structure: 'Senior Development Facility',
  tenorMonths: 24,
  ltv: 64.1,
  ltc: 71.3,
  sponsorEquity: 31,
  pricing: 'EURIBOR + 475 bps',
  lien: 'First lien',
  status: 'Underwriting',
  owner: 'Marta Klein',
  nextReview: '2026-08-28',
  progress: 72,
  project: {
    units: 118,
    rentableAreaSqm: 9140,
    permits: 'Building permit secured',
    completion: 'Q4 2028',
    preLet: 18,
    energyStandard: 'KfW 40 / low-carbon heat network'
  },
  financials: {
    revenue: 24600000,
    ebitda: 5100000,
    cash: 3400000,
    netDebt: 9200000,
    projectCost: 25300000,
    currentValue: 28100000,
    gdv: 39400000
  }
});

export const DEMO_DOCUMENTS = Object.freeze([
  { id: 'DOC-001', name: 'FY2025 audited financial statements', category: 'Financial', status: 'Required', owner: 'Borrower', updated: '2026-08-24' },
  { id: 'DOC-002', name: 'Building permit', category: 'Project', status: 'Accepted', owner: 'PiHub', updated: '2026-08-23' },
  { id: 'DOC-003', name: 'Independent valuation report', category: 'Valuation', status: 'In review', owner: 'Advisory', updated: '2026-08-25' },
  { id: 'DOC-004', name: 'Sponsor ownership chart', category: 'Compliance', status: 'Accepted', owner: 'Compliance', updated: '2026-08-22' }
]);

export const DEMO_REQUESTS = Object.freeze([
  { id: 'REQ-01', title: 'Upload FY2025 audited financial statements', due: '2026-08-27', status: 'Open', priority: 'High' },
  { id: 'REQ-02', title: 'Confirm contractor fixed-price scope', due: '2026-08-29', status: 'Open', priority: 'Medium' },
  { id: 'REQ-03', title: 'Provide updated sources and uses', due: '2026-08-30', status: 'Open', priority: 'Medium' }
]);

export const DEMO_MANDATES = Object.freeze([
  { id: 'MAN-2417', client: 'Berlin Living GmbH', transaction: 'Berlin Residential Development', type: 'Debt structuring', amount: 18000000, stage: 'Structuring', owner: 'Marta Klein', nextMilestone: 'Lender shortlist' },
  { id: 'MAN-2398', client: 'Nordhafen Logistics SPV', transaction: 'Hamburg Logistics Portfolio', type: 'Refinancing', amount: 32500000, stage: 'Due diligence', owner: 'Jonas Weber', nextMilestone: 'Valuation sign-off' },
  { id: 'MAN-2361', client: 'CareHaus Holding', transaction: 'Senior Living Expansion', type: 'Acquisition financing', amount: 27000000, stage: 'Term sheet', owner: 'Lena Vogt', nextMilestone: 'Sponsor approval' }
]);

export const DEMO_ORGANIZATIONS = Object.freeze([
  { id: 'ORG-1001', name: 'Berlin Living GmbH', type: 'Borrower', jurisdiction: 'DE', compliance: 'Review due', risk: 'Medium', users: 4 },
  { id: 'ORG-2004', name: 'Rhein Capital Partners', type: 'Investor', jurisdiction: 'DE', compliance: 'Verified', risk: 'Low', users: 11 },
  { id: 'ORG-3012', name: 'PiHub Private Investments GmbH', type: 'Internal', jurisdiction: 'DE', compliance: 'Verified', risk: 'Low', users: 18 }
]);

export const DEMO_USERS = Object.freeze([
  { id: 'USR-1', name: 'Nina Berger', email: 'borrower.demo@pihub.local', organization: 'Berlin Living GmbH', roles: ['Borrower Owner'], modules: ['Borrower'], status: 'Active' },
  { id: 'USR-2', name: 'Marta Klein', email: 'advisory.demo@pihub.local', organization: 'PiHub Private Investments GmbH', roles: ['Advisory Manager'], modules: ['Advisory'], status: 'Active' },
  { id: 'USR-3', name: 'Alex Hoffmann', email: 'admin.demo@pihub.local', organization: 'PiHub Private Investments GmbH', roles: ['Platform Admin', 'Compliance'], modules: ['Admin'], status: 'Active' }
]);

export const DEMO_COMPLIANCE = Object.freeze([
  { id: 'CMP-19', organization: 'Berlin Living GmbH', check: 'KYB annual review', status: 'Action required', owner: 'Compliance', due: '2026-08-30' },
  { id: 'CMP-22', organization: 'ABC Development AG', check: 'UBO evidence', status: 'In review', owner: 'Compliance', due: '2026-08-28' },
  { id: 'CMP-26', organization: 'Rhein Capital Partners', check: 'Professional investor classification', status: 'Verified', owner: 'Compliance', due: '2027-02-15' }
]);

export const DEMO_AUDIT = Object.freeze([
  { id: 'AUD-01', at: '2026-08-25 10:12', actor: 'Marta Klein', action: 'Updated financing structure', entity: 'PH-2026-0147' },
  { id: 'AUD-02', at: '2026-08-25 09:46', actor: 'Nina Berger', action: 'Uploaded valuation report', entity: 'DOC-003' },
  { id: 'AUD-03', at: '2026-08-25 08:55', actor: 'Alex Hoffmann', action: 'Changed user module access', entity: 'USR-2' }
]);

export const euro = value => new Intl.NumberFormat('en-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
