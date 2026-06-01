// ─────────────────────────────────────────────────────────────────────────
// Domain model
//
// The user thinks in CAPABILITIES — channels they turn on ("I want to call /
// text my contacts"). Each capability resolves underneath to a set of
// REQUIREMENTS — the regulatory artifacts (business identity, A2P, STIR/SHAKEN,
// CNAM, country bundle) that carry the draft→review→approved lifecycle.
//
// Requirements, identity, and capabilities all live on the COMPANY (the legal
// entity). A Company has exactly one identity. Numbers belong to an AGENT.
// ─────────────────────────────────────────────────────────────────────────

export type CountryCode = 'US' | 'UK' | 'IL' | 'AU' | 'DE' | 'FR'

/* ── Capabilities: the user-facing channels ──────────────────────────── */

export type CapabilityKind =
  | 'calling'
  | 'texting'
  | 'branded_caller_id'
  | 'caller_id_passthrough'
  | 'alphanumeric_sender_id'

// What we show the user as the rolled-up state of a capability, derived from
// the statuses of its underlying requirements.
export type CapabilityAvailability =
  | 'not_started' // no requirements created yet
  | 'pending' // some requirement is draft / waiting / in review
  | 'action_needed' // a requirement was rejected (or errored)
  | 'available' // every requirement approved

export interface CapabilityView {
  kind: CapabilityKind
  availability: CapabilityAvailability
  requirementTypes: RequirementType[] // the requirements backing this capability
}

/* ── Requirements: the regulatory layer underneath ───────────────────── */

export type RequirementType =
  | 'identity' // the verified business identity — the foundation
  | 'stir_shaken'
  | 'a2p_messaging'
  | 'cnam'
  | 'country_bundle'
  | 'sender_id'

export type RequirementStatus =
  | 'not_started'
  | 'draft'
  | 'waiting' // submitted, but the Company isn't verified yet
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'error'

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

export interface SenderIdData {
  senderId?: string
}

export interface RejectionReason {
  message: string
  field?: string
  code?: string
  explanation?: string
}

export interface Requirement {
  id: string
  companyId: string
  type: RequirementType
  status: RequirementStatus
  isApproved: boolean // distinct from status: stays true even when re-editing
  twilioResourceSids: string[]
  rejection?: RejectionReason
  data: Record<string, unknown> & {
    business?: BusinessProfileData
    representative?: AuthorizedRepData
    messaging?: MessagingData
    cnam?: CnamData
    senderId?: SenderIdData
  }
  createdBy: string
  createdAt: string
  updatedAt: string
}

/* ── Company: the legal entity (one identity each) ───────────────────── */

export type CompanyMode = 'managed' | 'byo'

export interface Company {
  id: string
  name: string
  // The countries this company operates in. A company is NOT tied to one
  // country — it can register for several. `country` is the primary one
  // (drives the identity / requirement mix); `countries` is the full set.
  country: CountryCode
  countries: CountryCode[]
  mode: CompanyMode
  createdAt: string
}

/* ── Provider connection (BYO Twilio) ────────────────────────────────── */

export interface ProviderConnection {
  id: string
  companyId: string
  provider: 'twilio'
  accountSid: string
  connectedAt: string
}

// A number that exists in the connected Twilio account and can be linked to an
// agent (BYO). Distinct from a provisioned PhoneNumber — it's a candidate.
export interface ImportableNumber {
  number: string
  country: CountryCode
  region?: string
}

/* ── Alerts (runtime delivery failures + lifecycle events) ───────────── */

// Stubbed for the prototype. Real design deferred — a platform-wide log/alert
// system. The point this conveys: managed telephony fails at config time
// (caught by the requirement gate), but BYO/SIP bypass that gate, so failures
// surface at *runtime* on the outbound send path. Alerts aggregate by
// (source × capability × error class) and resolve source-aware.
export type AlertSeverity = 'error' | 'warning' | 'info'
export type AlertStatus = 'active' | 'resolved'

export interface Alert {
  id: string
  severity: AlertSeverity
  status: AlertStatus
  title: string
  detail: string // the aggregated description: count + window, or the reason
  sourceName: string
  sourceMode: CompanyMode // drives the source chip (managed vs BYO Twilio)
  capability?: string
  code?: string // e.g. Twilio error 30034
  cta: { label: string; kind: 'twilio' | 'fix' | 'replace'; href?: string }
  timeAgo: string
}

/* ── Notifications (point-in-time lifecycle events) ──────────────────── */

// Distinct from Alerts (open problems that aggregate + resolve). Notifications
// are discrete events on the requirement/number lifecycle — approvals,
// rejections, rotations — each read/unread and chronological. Good news lives
// here too (an approval is a notification; it also clears the matching alert).
export type NotificationKind = 'approved' | 'rejected' | 'rotated' | 'info'

export interface Notification {
  id: string
  kind: NotificationKind
  title: string
  detail: string
  sourceName: string
  sourceMode: CompanyMode
  read: boolean
  // Optional in-app CTA (verb matched to kind: See / Fix / View).
  cta?: { label: string; to: string }
  timeAgo: string
}

/* ── Agents + numbers ────────────────────────────────────────────────── */

// Agents are the AI agents that make/receive calls. Each belongs to a Company
// and owns its own numbers. auto-rotate replaces spam-labeled numbers.
export interface Agent {
  id: string
  name: string
  companyId: string
  autoRotate: boolean
  blockIncoming: boolean
}

export type PhoneNumberStatus = 'active' | 'released'
export type PhoneNumberSource = 'managed' | 'byo'

export interface PhoneNumber {
  id: string
  agentId: string
  number: string
  country: CountryCode
  region?: string
  city?: string
  health: number // 0–100 reputation score
  // When a number is spam-labeled we screenshot the carrier result; the URL is
  // surfaced behind an (i) icon in the health column.
  spamScreenshotUrl?: string
  status: PhoneNumberStatus
  source: PhoneNumberSource
  twilioSid?: string
  callsLast30d: number
  acquiredAt: string
}

// In-flight acquisition. If a PhoneNumber exists it's already provisioned, so
// "requested but not yet bought / waiting on verification / retrying" lives here.
export type ProvisionStatus =
  | 'pending'
  | 'waiting_on_verification'
  | 'partially_filled'
  | 'fulfilled'
  | 'failed'

export interface ProvisionSpec {
  count: number
  country?: CountryCode
  region?: string
}

export interface Provision {
  id: string
  agentId: string
  spec: ProvisionSpec
  status: ProvisionStatus
  acquiredNumberIds: string[]
  createdAt: string
}

/* ── Labels & catalog metadata ───────────────────────────────────────── */

export const CAPABILITY_LABELS: Record<CapabilityKind, string> = {
  calling: 'Outbound Calling',
  texting: 'Text Messaging',
  branded_caller_id: 'Caller ID Name',
  caller_id_passthrough: 'Caller ID Passthrough',
  alphanumeric_sender_id: 'Alphanumeric Sender ID',
}

export const CAPABILITY_DESCRIPTIONS: Record<CapabilityKind, string> = {
  calling: 'Place outbound calls to your contacts.',
  texting: 'Send SMS and MMS to your contacts.',
  branded_caller_id: 'Show your business name on outbound calls.',
  caller_id_passthrough: 'Display your own verified numbers as the caller ID.',
  alphanumeric_sender_id: 'Show your brand name as the SMS sender instead of a number.',
}

export const REQUIREMENT_LABELS: Record<RequirementType, string> = {
  identity: 'Business identity',
  stir_shaken: 'STIR/SHAKEN',
  a2p_messaging: 'A2P 10DLC',
  cnam: 'CNAM',
  country_bundle: 'Regulatory bundle',
  sender_id: 'Sender ID registration',
}

export const REQUIREMENT_TWILIO_PRODUCT: Record<RequirementType, string> = {
  identity: 'Customer Profile',
  stir_shaken: 'STIR/SHAKEN',
  a2p_messaging: 'A2P Brand + Campaign',
  cnam: 'CNAM',
  country_bundle: 'Country Bundle',
  sender_id: 'Alphanumeric Sender ID',
}

export const COUNTRY_LABELS: Record<CountryCode, string> = {
  US: 'United States',
  UK: 'United Kingdom',
  IL: 'Israel',
  AU: 'Australia',
  DE: 'Germany',
  FR: 'France',
}

// Mock monthly price per number, USD — what a single local number costs/mo.
export const NUMBER_MONTHLY_PRICE: Record<CountryCode, number> = {
  US: 1.15,
  UK: 1.0,
  IL: 3.0,
  AU: 3.0,
  DE: 1.5,
  FR: 1.5,
}

export function numberMonthlyPrice(country: CountryCode): number {
  return NUMBER_MONTHLY_PRICE[country] ?? 1.0
}

export function formatUsd(amount: number): string {
  return `$${amount.toFixed(2)}`
}

export const COUNTRY_FLAGS: Record<CountryCode, string> = {
  US: '🇺🇸',
  UK: '🇬🇧',
  IL: '🇮🇱',
  AU: '🇦🇺',
  DE: '🇩🇪',
  FR: '🇫🇷',
}

// Onboarding ships US + UK Companies; the rest are future.
export const SUPPORTED_COUNTRIES: CountryCode[] = ['US', 'UK']

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

/* ── Capability ↔ requirement derivation ─────────────────────────────── */

// Capabilities the user can turn on for a given Company country. Branding
// add-ons depend on country (CNAM is US; Alphanumeric Sender ID is non-US).
export function availableCapabilities(country: CountryCode): CapabilityKind[] {
  if (country === 'US') return ['calling', 'texting', 'branded_caller_id', 'caller_id_passthrough']
  // Non-US (bundle countries): Alphanumeric Sender ID instead of CNAM.
  return ['calling', 'texting', 'caller_id_passthrough', 'alphanumeric_sender_id']
}

// Every capability we surface for a country — the live ones plus future
// ("coming soon") ones, so the Capabilities page doubles as a discovery surface.
export function allCapabilities(country: CountryCode): CapabilityKind[] {
  const ALL: CapabilityKind[] = [
    'calling',
    'texting',
    'branded_caller_id',
    'caller_id_passthrough',
    'alphanumeric_sender_id',
  ]
  return ALL.filter(
    (k) => availableCapabilities(country).includes(k) || isCapabilityFuture(k, country)
  )
}

// The union of every capability across a company's countries, in canonical
// display order — used by the Capabilities page (a discovery surface).
export function allCapabilitiesForCountries(countries: CountryCode[]): CapabilityKind[] {
  const ALL: CapabilityKind[] = [
    'calling',
    'texting',
    'branded_caller_id',
    'caller_id_passthrough',
    'alphanumeric_sender_id',
  ]
  return ALL.filter((k) => countries.some((c) => allCapabilities(c).includes(k)))
}

// Which of the given countries a capability actually applies to — drives the
// "Required for: 🇺🇸 🇬🇧" flag list. Caller ID Name is US-only; Alphanumeric
// Sender ID is non-US; the rest apply everywhere the company operates.
export function capabilityCountries(
  kind: CapabilityKind,
  countries: CountryCode[]
): CountryCode[] {
  switch (kind) {
    case 'branded_caller_id':
      return countries.filter((c) => c === 'US')
    case 'alphanumeric_sender_id':
      return countries.filter((c) => c !== 'US')
    default:
      return countries
  }
}

// Whether a capability is live today vs. modeled-but-future for a country.
export function isCapabilityFuture(kind: CapabilityKind, country: CountryCode): boolean {
  if (kind === 'alphanumeric_sender_id') return true // EU sender ID — future
  if (kind === 'branded_caller_id' && country !== 'US') return true
  return false
}

// The regulated requirements backing a capability, given the Company's country.
// The identity (foundation) is universal and tracked separately, so it is not
// repeated here.
export function requirementsForCapability(
  kind: CapabilityKind,
  country: CountryCode
): RequirementType[] {
  if (country === 'US') {
    switch (kind) {
      case 'calling':
        return ['stir_shaken']
      case 'texting':
        return ['a2p_messaging']
      case 'branded_caller_id':
        return ['cnam']
      case 'caller_id_passthrough':
        return [] // no carrier registration — just passes the number through
      case 'alphanumeric_sender_id':
        return [] // disallowed in the US
    }
  }
  // Non-US Company: the bundle (== identity) grants calling/texting; sender ID
  // is its own registration.
  switch (kind) {
    case 'calling':
    case 'texting':
    case 'caller_id_passthrough':
      return []
    case 'alphanumeric_sender_id':
      return ['sender_id']
    case 'branded_caller_id':
      return [] // future
  }
}

// The requirement that serves as a Company's identity / foundation.
export function identityRequirementType(country: CountryCode): RequirementType {
  return country === 'US' ? 'identity' : 'country_bundle'
}

export function requiresBundle(country: CountryCode): boolean {
  return country !== 'US' && country !== 'IL'
}

// Roll a capability's underlying requirements (plus the foundation identity)
// up into the single availability state shown to the user.
export function deriveCapabilityAvailability(
  kind: CapabilityKind,
  country: CountryCode,
  requirements: Requirement[]
): CapabilityAvailability {
  const identity = requirements.find((r) => r.type === identityRequirementType(country))
  const ownTypes = requirementsForCapability(kind, country)
  const own = ownTypes.map((t) => requirements.find((r) => r.type === t))

  const bad = (r?: Requirement) => r && (r.status === 'rejected' || r.status === 'error')
  // A rejection / error anywhere (foundation or capability) demands action.
  if (bad(identity) || own.some(bad)) return 'action_needed'

  const idApproved = identity?.status === 'approved'

  // Capabilities with no registration of their own ride on the identity alone.
  if (ownTypes.length === 0) {
    if (!identity || identity.status === 'not_started') return 'not_started'
    return idApproved ? 'available' : 'pending'
  }

  // Has its own registration: if none created yet, it simply hasn't been set up.
  if (own.every((r) => !r || r.status === 'not_started')) return 'not_started'
  if (idApproved && own.every((r) => r?.status === 'approved')) return 'available'
  return 'pending'
}
