import {
  identityRequirementType,
  requirementsForCapability,
  type AuthorizedRepData,
  type BusinessProfileData,
  type CapabilityKind,
  type CnamData,
  type CountryCode,
  type MessagingData,
  type RequirementType,
} from '@/types'

// The wizard is two screens: the user states intent (channels), then confirms a
// mostly AI-prefilled page that folds in identity, representative, messaging and
// CNAM. There is no separate review — the confirm page *is* the review.
export type WizardStepId = 'channels' | 'confirm'

export interface WizardFormState {
  // `country` is the primary country (drives the identity / requirement mix);
  // `countries` is the full set the company's contacts are located in.
  country: CountryCode
  countries: CountryCode[]
  capabilities: CapabilityKind[]
  business: BusinessProfileData
  representative: AuthorizedRepData
  messaging: MessagingData
  cnam: CnamData
}

export const emptyWizardState: WizardFormState = {
  country: 'US',
  countries: ['US'],
  capabilities: ['calling', 'texting', 'branded_caller_id', 'caller_id_passthrough'],
  business: {},
  // The representative defaults to the signed-in user — known from registration,
  // not AI-researched. Only the title/position are asked for on the confirm page.
  representative: {
    firstName: 'Michael',
    lastName: 'Gur',
    email: 'gur@harmony.ai',
    phone: '+1 415 555 0142',
  },
  messaging: {},
  cnam: {},
}

interface VisibleStepOpts {
  includeChannels: boolean
  needIdentity: boolean // whether the business/rep (identity) steps are needed
}

export function computeVisibleSteps(_state: WizardFormState, opts: VisibleStepOpts): WizardStepId[] {
  const steps: WizardStepId[] = []
  if (opts.includeChannels) steps.push('channels')
  steps.push('confirm')
  return steps
}

export const STEP_TITLES: Record<WizardStepId, string> = {
  channels: 'Requirements',
  confirm: 'Company Info',
}

const BUSINESS_REQUIRED: (keyof BusinessProfileData)[] = [
  'legalName',
  'registrationType',
  'registrationNumber',
  'addressLine1',
  'city',
  'postalCode',
  'country',
  'companyType',
  'industry',
]
const REP_REQUIRED: (keyof AuthorizedRepData)[] = ['firstName', 'lastName', 'email', 'phone', 'title']
const MESSAGING_REQUIRED: (keyof MessagingData)[] = ['privacyPolicyUrl', 'termsOfServiceUrl']

export function showMessaging(state: WizardFormState): boolean {
  return state.capabilities.includes('texting') && state.countries.includes('US')
}

export function showCnam(state: WizardFormState): boolean {
  return state.capabilities.includes('branded_caller_id')
}

// Required fields still empty on the confirm page, as plain field keys. The
// confirm UI maps these to labels + anchors so the "needs you" callout can link
// straight to them (the fields AI can't fill: EIN, representative title).
export function missingRequiredFields(
  state: WizardFormState,
  opts: { needIdentity: boolean }
): string[] {
  const out: string[] = []
  if (opts.needIdentity) {
    for (const k of BUSINESS_REQUIRED) if (!state.business[k]) out.push(k)
    for (const k of REP_REQUIRED) if (!state.representative[k]) out.push(k)
  }
  if (showMessaging(state)) for (const k of MESSAGING_REQUIRED) if (!state.messaging[k]) out.push(k)
  if (showCnam(state) && !state.cnam.displayName) out.push('displayName')
  return out
}

export function validateStep(state: WizardFormState, step: WizardStepId): string[] {
  if (step === 'channels') return state.capabilities.length === 0 ? ['capabilities'] : []
  return [] // 'confirm' is validated via missingRequiredFields (needs needIdentity)
}

// The regulated requirement types we'll create from the selected capabilities,
// across every country the company operates in.
export function plannedRequirementTypes(state: WizardFormState): RequirementType[] {
  const types = new Set<RequirementType>()
  for (const kind of state.capabilities) {
    for (const c of state.countries) {
      for (const t of requirementsForCapability(kind, c)) types.add(t)
    }
  }
  return Array.from(types)
}

export function identityType(state: WizardFormState): RequirementType {
  return identityRequirementType(state.country)
}
