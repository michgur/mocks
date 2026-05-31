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

export type WizardStepId =
  | 'channels'
  | 'business'
  | 'representative'
  | 'messaging'
  | 'cnam'
  | 'review'

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
  representative: {},
  messaging: {},
  cnam: {},
}

interface VisibleStepOpts {
  includeChannels: boolean
  needIdentity: boolean // whether the business/rep (identity) steps are needed
}

export function computeVisibleSteps(state: WizardFormState, opts: VisibleStepOpts): WizardStepId[] {
  const steps: WizardStepId[] = []
  if (opts.includeChannels) steps.push('channels')
  if (opts.needIdentity) {
    steps.push('business')
    steps.push('representative')
  }
  if (state.capabilities.includes('texting') && state.countries.includes('US')) steps.push('messaging')
  if (state.capabilities.includes('branded_caller_id')) steps.push('cnam')
  steps.push('review')
  return steps
}

export const STEP_TITLES: Record<WizardStepId, string> = {
  channels: 'Capabilities',
  business: 'Business information',
  representative: 'Authorized representative',
  messaging: 'Text messaging',
  cnam: 'Caller ID name',
  review: 'Review',
}

export function validateStep(state: WizardFormState, step: WizardStepId): string[] {
  switch (step) {
    case 'channels':
      return state.capabilities.length === 0 ? ['capabilities'] : []
    case 'business': {
      const b = state.business
      const required: (keyof BusinessProfileData)[] = [
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
      return required.filter((k) => !b[k]).map(String)
    }
    case 'representative': {
      const r = state.representative
      const required: (keyof AuthorizedRepData)[] = ['firstName', 'lastName', 'email', 'phone', 'title']
      return required.filter((k) => !r[k]).map(String)
    }
    case 'messaging': {
      const m = state.messaging
      const required: (keyof MessagingData)[] = ['privacyPolicyUrl', 'termsOfServiceUrl']
      return required.filter((k) => !m[k]).map(String)
    }
    case 'cnam':
      return state.cnam.displayName ? [] : ['displayName']
    case 'review':
      return []
  }
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
