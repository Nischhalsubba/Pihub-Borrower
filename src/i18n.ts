import type { Locale } from './state/model';

const dictionary = {
  en: {
    overview: 'Overview', portfolio: 'Portfolio', qualification: 'Pre-qualification', products: 'Financing products', applications: 'My applications', newApplication: 'New application',
    financing: 'Financing request', company: 'Company', project: 'Project / Property', financials: 'Financials', connections: 'Connected data', dataRoom: 'Data room', disclosures: 'Disclosures & consent', documents: 'Documents',
    requests: 'PiHub requests', messages: 'Messages', activity: 'Activity', versions: 'Application versions', notificationsPage: 'Notifications', scenarioLab: 'Scenario lab', negotiation: 'Negotiation', closing: 'Terms & closing', capital: 'Draws & inspections', calendar: 'Calendar', servicing: 'Loan servicing', payments: 'Payments & statements', esg: 'ESG & sustainability', team: 'Organization & team', account: 'Account', privacy: 'Privacy & data rights', complaints: 'Complaints & disputes', copilot: 'Borrower Copilot', help: 'Help',
    search: 'Search workspace', saved: 'Saved', demo: 'Demo workspace', continue: 'Continue application', submit: 'Submit application',
    open: 'Open', upload: 'Upload', download: 'Download', replace: 'Replace', remove: 'Remove', save: 'Save changes',
    noResults: 'No matching results', notifications: 'Notifications', markAllRead: 'Mark all read', signOut: 'Sign out', resetDemo: 'Reset demo data'
  },
  de: {
    overview: 'Übersicht', portfolio: 'Portfolio', qualification: 'Vorqualifizierung', products: 'Finanzierungsprodukte', applications: 'Meine Anträge', newApplication: 'Neuer Antrag',
    financing: 'Finanzierungsanfrage', company: 'Unternehmen', project: 'Projekt / Immobilie', financials: 'Finanzen', connections: 'Verbundene Daten', dataRoom: 'Datenraum', disclosures: 'Freigaben & Einwilligung', documents: 'Dokumente',
    requests: 'PiHub-Anfragen', messages: 'Nachrichten', activity: 'Aktivität', versions: 'Antragsversionen', notificationsPage: 'Benachrichtigungen', scenarioLab: 'Szenario-Labor', negotiation: 'Verhandlung', closing: 'Konditionen & Closing', capital: 'Auszahlungen & Prüfungen', calendar: 'Kalender', servicing: 'Kreditverwaltung', payments: 'Zahlungen & Abrechnungen', esg: 'ESG & Nachhaltigkeit', team: 'Organisation & Team', account: 'Konto', privacy: 'Datenschutz & Datenrechte', complaints: 'Beschwerden & Streitfälle', copilot: 'Borrower Copilot', help: 'Hilfe',
    search: 'Arbeitsbereich durchsuchen', saved: 'Gespeichert', demo: 'Demo-Arbeitsbereich', continue: 'Antrag fortsetzen', submit: 'Antrag einreichen',
    open: 'Öffnen', upload: 'Hochladen', download: 'Herunterladen', replace: 'Ersetzen', remove: 'Entfernen', save: 'Änderungen speichern',
    noResults: 'Keine passenden Ergebnisse', notifications: 'Benachrichtigungen', markAllRead: 'Alle als gelesen markieren', signOut: 'Abmelden', resetDemo: 'Demo-Daten zurücksetzen'
  }
} as const;

export type TranslationKey = keyof typeof dictionary.en;
export const t = (locale: Locale, key: TranslationKey) => dictionary[locale][key] ?? dictionary.en[key];
