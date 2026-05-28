export type CapabilityType =
  | 'business_profile'
  | 'country_bundle'
  | 'stir_shaken'
  | 'a2p_messaging'
  | 'cnam'
  | 'caller_id_passthrough'
  | 'alphanumeric_sender_id'
  | 'branded_calls'

export type CapabilityStatus =
  | 'not_configured'
  | 'draft'
  | 'waiting'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'error'

export type CountryCode = 'US' | 'UK' | 'IL' | 'AU' | 'DE' | 'FR'

export interface BusinessProfileData {
  legalName?: string
  registrationType?: 'EIN' | 'DUNS' | 'Other'
  registrationNumber?: string
  addressLine1?: string
  addressLine2?: string
  city?: string
  state?: string
  postalCode?: string
  country?: CountryCode
  companyType?: 'LLC' | 'Corporation' | 'Non-profit' | 'Partnership' | 'Sole Proprietorship'
  businessType?: string
  industry?: string
  regionsOfOperation?: string[]
  website?: string
}

export interface AuthorizedRepData {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  title?: string
  position?: string
}

export interface MessagingData {
  privacyPolicyUrl?: string
  termsOfServiceUrl?: string
}

export interface CnamData {
  displayName?: string
}

export interface CountryBundleData {
  country?: CountryCode
}

export type CapabilityData =
  | BusinessProfileData
  | AuthorizedRepData
  | MessagingData
  | CnamData
  | CountryBundleData
  | Record<string, unknown>

export interface RejectionReason {
  message: string
  field?: string
  code?: string
  explanation?: string
}

export interface Capability {
  id: string
  legalEntityId: string
  type: CapabilityType
  countries: CountryCode[]
  status: CapabilityStatus
  isApproved: boolean
  twilioResourceSids: string[]
  dependencies: string[]
  rejection?: RejectionReason
  data: Record<string, unknown> & {
    business?: BusinessProfileData
    representative?: AuthorizedRepData
    messaging?: MessagingData
    cnam?: CnamData
    bundle?: CountryBundleData
  }
  createdBy: string
  createdAt: string
  updatedAt: string
  autoAssign: boolean
  assignedNumberIds: string[]
}

export interface LegalEntity {
  id: string
  name: string
  createdAt: string
}

export interface PhoneNumber {
  id: string
  number: string
  country: CountryCode
  city?: string
  capabilities: ('voice' | 'sms' | 'mms')[]
  monthlyPrice: number
  purchasedAt: string
  callsLast30d: number
  assignedServices: CapabilityType[]
}

export interface RequirementSelection {
  countries: CountryCode[]
  capabilities: CapabilityType[]
}

// Composition: declarative target shape for the numbers we'll acquire.
export interface CompositionRow {
  country: CountryCode
  region?: string
  count: number
}

// Agents are account-level — the AI agents that make/receive calls.
export interface Agent {
  id: string
  name: string
}

// A pool groups numbers and the policies that apply to them.
export interface Pool {
  id: string
  legalEntityId: string
  name: string
  composition: CompositionRow[]
  inboundAgentId: string | null // null = block incoming
  outboundAgentIds: string[]
  autoRotation: boolean
  createdAt: string
  updatedAt: string
}

export const US_STATES: string[] = [
  'Any state',
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado',
  'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho',
  'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana',
  'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota',
  'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada',
  'New Hampshire', 'New Jersey', 'New Mexico', 'New York',
  'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon',
  'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
  'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia',
  'Washington', 'West Virginia', 'Wisconsin', 'Wyoming',
]

export const CAPABILITY_LABELS: Record<CapabilityType, string> = {
  business_profile: 'Business Profile',
  country_bundle: 'Number Provisioning',
  stir_shaken: 'Outbound Calling',
  a2p_messaging: 'Text Messaging',
  cnam: 'Caller ID Name',
  caller_id_passthrough: 'Caller ID Passthrough',
  alphanumeric_sender_id: 'Alphanumeric Sender ID',
  branded_calls: 'Branded Calls',
}

export const CAPABILITY_DESCRIPTIONS: Record<CapabilityType, string> = {
  business_profile: 'Verify your business with carriers (required for US capabilities).',
  country_bundle: 'Regulatory approval required to buy numbers in this country.',
  stir_shaken: 'Comply with STIR/SHAKEN to prevent call blocking and spam labeling',
  a2p_messaging: 'A2P 10DLC compliant SMS notifications',
  cnam: 'Display your brand name on outbound calls',
  caller_id_passthrough: 'Use the contact’s caller ID when forwarding calls to your team',
  alphanumeric_sender_id: 'Display a customized name in SMS messages.',
  branded_calls: 'Display verified brand identity on outbound calls.',
}

// Shown in the wizard requirements step under each capability when it's unselected.
export const CAPABILITY_WARNINGS: Record<CapabilityType, string> = {
  business_profile: 'Required for US capabilities. You won\'t be able to register CNAM, A2P, or STIR/SHAKEN.',
  country_bundle: '',
  stir_shaken: 'US carriers may block or spam-label your calls.',
  a2p_messaging: 'Required for sending text messages to US contacts.',
  cnam: 'Recipients will see "Unknown" or just your number instead of your brand.',
  caller_id_passthrough: '',
  alphanumeric_sender_id: '',
  branded_calls: '',
}

// Countries each capability applies to, for the flag list on the requirements row.
export function capabilityCountries(t: CapabilityType, selectedCountries: CountryCode[]): CountryCode[] {
  switch (t) {
    case 'stir_shaken':
    case 'a2p_messaging':
    case 'cnam':
    case 'branded_calls':
      return selectedCountries.includes('US') ? ['US'] : []
    case 'country_bundle':
      return selectedCountries.filter(requiresBundle)
    case 'alphanumeric_sender_id':
      return selectedCountries.filter((c) => c === 'DE' || c === 'FR')
    default:
      return []
  }
}

export const CAPABILITY_TWILIO_PRODUCT: Record<CapabilityType, string> = {
  business_profile: 'Customer Profile',
  country_bundle: 'Country Bundle',
  stir_shaken: 'STIR/SHAKEN',
  a2p_messaging: 'A2P Brand + Campaign',
  cnam: 'CNAM',
  caller_id_passthrough: 'Any Caller ID',
  alphanumeric_sender_id: 'Alphanumeric Sender ID',
  branded_calls: 'Branded Calls',
}

export const COUNTRY_LABELS: Record<CountryCode, string> = {
  US: 'United States',
  UK: 'United Kingdom',
  IL: 'Israel',
  AU: 'Australia',
  DE: 'Germany',
  FR: 'France',
}

export const COUNTRY_FLAGS: Record<CountryCode, string> = {
  US: '🇺🇸',
  UK: '🇬🇧',
  IL: '🇮🇱',
  AU: '🇦🇺',
  DE: '🇩🇪',
  FR: '🇫🇷',
}

export const SUPPORTED_COUNTRIES: CountryCode[] = ['US', 'UK']

export function requiresBundle(country: CountryCode): boolean {
  return country === 'UK' || country === 'AU' || country === 'DE' || country === 'FR'
}

// Capabilities shown in the requirements step (excluding always-implicit ones).
export const REQUIREMENTS_CAPABILITIES: CapabilityType[] = [
  'stir_shaken',
  'a2p_messaging',
  'cnam',
]

export function dependsOnBusinessProfile(type: CapabilityType): boolean {
  return (
    type === 'stir_shaken' ||
    type === 'a2p_messaging' ||
    type === 'cnam' ||
    type === 'caller_id_passthrough' ||
    type === 'branded_calls'
  )
}

export function isSupportOnly(type: CapabilityType): boolean {
  return type === 'caller_id_passthrough'
}

export function isFutureOnly(type: CapabilityType): boolean {
  return type === 'alphanumeric_sender_id' || type === 'branded_calls'
}
