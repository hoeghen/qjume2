/**
 * Who runs Qjume, written once. E-handelsloven § 7 requires a business
 * selling online to show its name, geographic address, email and CVR number
 * "easily, directly and permanently" — so the site footer, the contact page,
 * the legal pages and the structured data all read it from here, and none of
 * them can drift from the others. Plain data: the build imports it too.
 */
export const COMPANY = {
  name: 'Bitwork',
  cvr: '37653837',
  street: 'Raagaards Alle 15',
  postcode: '2791',
  city: 'Dragør',
  country: 'Danmark',
  email: 'info@qjume.dk',
} as const;

/** "Raagaards Alle 15, 2791 Dragør" */
export const COMPANY_ADDRESS = `${COMPANY.street}, ${COMPANY.postcode} ${COMPANY.city}`;

/** "Bitwork · CVR 37653837 · Raagaards Alle 15, 2791 Dragør" */
export const COMPANY_LINE = `${COMPANY.name} · CVR ${COMPANY.cvr} · ${COMPANY_ADDRESS}`;
