export const products = [
    {
        id: 'senior-development-facility', title: 'Senior Development Facility', provider: 'PiHub Private Credit Network', badge: 'Real estate',
        purpose: ['Development', 'Acquisition refinance'], assetClasses: ['Residential', 'Mixed use', 'Logistics'], amountMin: 3_000_000, amountMax: 50_000_000,
        currency: 'EUR', tenorMin: 12, tenorMax: 36, seniority: 'Senior secured', ltvMax: 70, pricing: 'EURIBOR + 5.0–7.0%', availability: 'available',
        requirements: [
            { label: 'Collateral', status: 'required', detail: 'Defined at application review' },
            { label: 'NDA', status: 'required', detail: 'Before protected information is shared' },
            { label: 'External rating', status: 'optional', detail: 'Based on provider criteria' },
            { label: 'Sponsor equity', status: 'required', detail: 'Evidence of committed equity and funding schedule' }
        ],
        materials: [
            { name: 'Indicative term sheet.pdf', description: 'Illustrative non-binding terms' },
            { name: 'Borrower information checklist.pdf', description: 'Typical information and document requirements' }
        ]
    },
    {
        id: 'bridge-facility', title: 'Bridge Facility', provider: 'European Alternative Lending Network', badge: 'Bridge',
        purpose: ['Acquisition', 'Refinancing', 'Equity bridge'], assetClasses: ['Residential', 'Office', 'Healthcare', 'Infrastructure'], amountMin: 1_000_000, amountMax: 25_000_000,
        currency: 'EUR', tenorMin: 6, tenorMax: 24, seniority: 'Senior / stretched senior', ltvMax: 75, pricing: 'From EURIBOR + 6.0%', availability: 'available',
        requirements: [
            { label: 'Collateral', status: 'required', detail: 'First-ranking or otherwise agreed security package' },
            { label: 'Business plan', status: 'required', detail: 'Sources, uses and defined repayment event' },
            { label: 'Valuation', status: 'required', detail: 'Current third-party valuation where applicable' }
        ], materials: [{ name: 'Bridge financing overview.pdf', description: 'Typical structures and process' }]
    },
    {
        id: 'mezzanine-capital', title: 'Mezzanine / Subordinated Capital', provider: 'Special Situations Network', badge: 'Mezzanine',
        purpose: ['Growth', 'Development', 'Recapitalization'], assetClasses: ['Corporate', 'Real estate', 'Infrastructure'], amountMin: 2_000_000, amountMax: 20_000_000,
        currency: 'EUR', tenorMin: 18, tenorMax: 48, seniority: 'Subordinated', ltvMax: 85, pricing: 'Case-specific', availability: 'limited',
        requirements: [
            { label: 'Senior lender consent', status: 'required', detail: 'Intercreditor terms where senior debt exists' },
            { label: 'Sponsor contribution', status: 'required', detail: 'Meaningful sponsor capital at risk' },
            { label: 'Exit visibility', status: 'required', detail: 'Clearly evidenced repayment path' }
        ], materials: [{ name: 'Mezzanine information checklist.pdf', description: 'Required sponsor and project information' }]
    },
    {
        id: 'whole-loan', title: 'Whole Loan / Stretched Senior', provider: 'PiHub Institutional Network', badge: 'Whole loan',
        purpose: ['Development', 'Acquisition', 'Refinancing'], assetClasses: ['Residential', 'Logistics', 'Infrastructure'], amountMin: 5_000_000, amountMax: 75_000_000,
        currency: 'EUR', tenorMin: 12, tenorMax: 42, seniority: 'Senior secured', ltvMax: 80, pricing: 'Case-specific', availability: 'available',
        requirements: [
            { label: 'Security package', status: 'required', detail: 'Asset-backed first-lien security expected' },
            { label: 'Financial model', status: 'required', detail: 'Integrated sources, uses, cash flow and sensitivities' },
            { label: 'ESG data', status: 'optional', detail: 'May improve lender matching for sustainable assets' }
        ], materials: [{ name: 'Whole loan overview.pdf', description: 'Illustrative structuring guide' }]
    }
];
