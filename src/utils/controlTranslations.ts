import type { TFunction } from 'i18next'

/** Map raw status values from backend/data to i18n keys */
const STATUS_KEYS: Record<string, string> = {
  'Not Started': 'controls.statusNotStarted',
  'Planned': 'controls.statusPlanned',
  'Partial': 'controls.statusPartial',
  'Implemented': 'controls.statusImplemented',
}

/** Map raw category names from controlsData to i18n keys */
const CATEGORY_KEYS: Record<string, string> = {
  'Risk Management': 'controlCategories.riskManagement',
  'Incident Handling': 'controlCategories.incidentHandling',
  'Business Continuity': 'controlCategories.businessContinuity',
  'Supply Chain Security': 'controlCategories.supplyChainSecurity',
  'Secure Development': 'controlCategories.secureDevelopment',
  'Effectiveness Assessment': 'controlCategories.effectivenessAssessment',
  'Cyber Hygiene & Training': 'controlCategories.cyberHygieneTraining',
  'Cryptography & Encryption': 'controlCategories.cryptographyEncryption',
  'Access Control & Asset Management': 'controlCategories.accessControlAssetMgmt',
  'MFA & Secured Communications': 'controlCategories.mfaSecuredComms',
  'Governance': 'controlCategories.governance',
  'Monitoring': 'controlCategories.monitoring',
  'Security Operations': 'controlCategories.securityOperations',
  'Training & Awareness': 'controlCategories.trainingAwareness',
  'HR Security': 'controlCategories.hrSecurity',
  'Cryptography': 'controlCategories.cryptography',
}

/** Translate a control status value */
export function translateStatus(t: TFunction, status: string): string {
  const key = STATUS_KEYS[status]
  return key ? t(key) : status
}

/** Translate a control category name */
export function translateCategory(t: TFunction, name: string): string {
  const key = CATEGORY_KEYS[name]
  return key ? t(key) : name
}
