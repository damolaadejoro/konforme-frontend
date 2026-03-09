export interface EUAuthorityInfo {
  name: string
  acronym: string
  website: string
  email: string
  phone: string
}

export interface EUCountryInfo {
  code: string
  name: string
  localName: string
  authority: EUAuthorityInfo
  reportingUrl: string
  nis2TranspositionStatus: 'transposed' | 'partial' | 'pending'
  nis2NationalLaw: string
  primaryLanguage: string
}
