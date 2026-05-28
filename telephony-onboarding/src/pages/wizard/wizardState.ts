import {
  capabilityCountries,
  requiresBundle,
  type AuthorizedRepData,
  type BusinessProfileData,
  type CapabilityType,
  type CnamData,
  type CompositionRow,
  type CountryBundleData,
  type CountryCode,
  type MessagingData,
} from '@/types'

export type WizardStepId =
  | 'requirements'
  | 'business'
  | 'representative'
  | 'messaging'
  | 'cnam'
  | 'review'

export interface WizardFormState {
  composition: CompositionRow[]
  capabilities: CapabilityType[]
  business: BusinessProfileData
  representative: AuthorizedRepData
  messaging: MessagingData
  cnam: CnamData
  bundles: Record<string, CountryBundleData>
}

export const emptyWizardState: WizardFormState = {
  composition: [],
  // All requirements capabilities are on by default; the user opts out per row.
  capabilities: ['stir_shaken', 'a2p_messaging', 'cnam'],
  business: {},
  representative: {},
  messaging: {},
  cnam: {},
  bundles: {},
}

/** Unique set of countries derived from the composition rows. */
export function compositionCountries(composition: CompositionRow[]): CountryCode[] {
  return Array.from(new Set(composition.map((c) => c.country)))
}

/**
 * Decide which steps are visible based on selected capabilities + composition countries.
 * Requirements step is only shown for new wizards (controlled by caller).
 *
 * A capability is "effectively selected" only if it's both ticked AND has at least one
 * country it applies to. Capabilities hidden from the requirements UI (because no relevant
 * country is selected) are treated as unselected.
 */
export function computeVisibleSteps(
  state: WizardFormState,
  opts: { includeRequirements: boolean }
): WizardStepId[] {
  const steps: WizardStepId[] = []
  if (opts.includeRequirements) steps.push('requirements')

  const isSelected = (t: CapabilityType) => effectivelySelected(state, t)

  const countries = compositionCountries(state.composition)
  const needsBundle = countries.some(requiresBundle)
  const needsBusiness =
    isSelected('business_profile') ||
    isSelected('cnam') ||
    isSelected('a2p_messaging') ||
    isSelected('stir_shaken') ||
    needsBundle

  const needsRep = needsBusiness || needsBundle
  const needsMessaging = isSelected('a2p_messaging')
  const needsCnam = isSelected('cnam')

  if (needsBusiness) steps.push('business')
  if (needsRep) steps.push('representative')
  if (needsMessaging) steps.push('messaging')
  if (needsCnam) steps.push('cnam')
  steps.push('review')
  return steps
}

function effectivelySelected(state: WizardFormState, type: CapabilityType): boolean {
  if (!state.capabilities.includes(type)) return false
  if (type === 'business_profile') return true
  const countries = compositionCountries(state.composition)
  if (type === 'country_bundle') return countries.some(requiresBundle)
  return capabilityCountries(type, countries).length > 0
}

export const STEP_TITLES: Record<WizardStepId, string> = {
  requirements: 'Numbers you need',
  business: 'Business information',
  representative: 'Authorized representative',
  messaging: 'Messaging',
  cnam: 'Caller ID name',
  review: 'Review',
}

/** Validate one step. Returns the set of invalid field keys (empty = step is valid). */
export function validateStep(state: WizardFormState, step: WizardStepId): string[] {
  switch (step) {
    case 'requirements':
      if (state.composition.length === 0) return ['composition']
      if (state.composition.some((c) => c.count <= 0)) return ['count']
      return []
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

/**
 * Derive the actual capability types we'll create from composition + capability selection.
 * A non-US country in composition brings in a country bundle. US capabilities require a
 * business profile.
 */
export function derivePlannedCapabilities(state: WizardFormState): CapabilityType[] {
  const types = new Set<CapabilityType>()
  for (const t of state.capabilities) {
    if (effectivelySelected(state, t)) types.add(t)
  }
  const countries = compositionCountries(state.composition)
  if (countries.some(requiresBundle)) types.add('country_bundle')
  const hasUSCapability =
    types.has('cnam') ||
    types.has('a2p_messaging') ||
    types.has('stir_shaken') ||
    types.has('caller_id_passthrough') ||
    types.has('branded_calls')
  if (hasUSCapability) types.add('business_profile')
  return Array.from(types)
}
