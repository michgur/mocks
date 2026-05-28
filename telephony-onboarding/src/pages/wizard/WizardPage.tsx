import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { api } from '@/api/client'
import type { Capability, CapabilityType, CountryCode } from '@/types'
import { useEntityContext } from '@/state/EntityContext'
import { WizardLayout } from './WizardLayout'
import {
  compositionCountries,
  computeVisibleSteps,
  derivePlannedCapabilities,
  emptyWizardState,
  STEP_TITLES,
  validateStep,
  type WizardFormState,
  type WizardStepId,
} from './wizardState'
import { RequirementsStep } from './steps/RequirementsStep'
import { RequirementsCapabilityStep } from './steps/RequirementsCapabilityStep'
import { BusinessInfoStep } from './steps/BusinessInfoStep'
import { AuthorizedRepStep } from './steps/AuthorizedRepStep'
import { MessagingStep } from './steps/MessagingStep'
import { CnamStep } from './steps/CnamStep'
import { ReviewStep } from './steps/ReviewStep'

export function WizardPage() {
  const navigate = useNavigate()
  const { capabilityId } = useParams<{ capabilityId?: string }>()
  const [searchParams] = useSearchParams()
  const addType = searchParams.get('add') as CapabilityType | null
  const newEntity = searchParams.get('new_entity') === '1'
  // mode=capability means we entered from "Add capability" — skip composition / pool creation.
  const capabilityMode = searchParams.get('mode') === 'capability'
  const { currentEntity, setCurrentEntityId } = useEntityContext()

  const [state, setState] = useState<WizardFormState>(emptyWizardState)
  const [editingCapability, setEditingCapability] = useState<Capability | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const [currentStep, setCurrentStep] = useState<WizardStepId>('requirements')
  const [submitting, setSubmitting] = useState(false)

  // Creating a new entity needs the business profile step regardless of capability picks.
  const isCreatingEntity = newEntity || !currentEntity

  // For editing: include requirements step only when this is a brand-new wizard.
  const includeRequirements = !capabilityId && !addType
  const steps = useMemo(
    () => computeVisibleSteps(state, { includeRequirements }),
    [state, includeRequirements]
  )

  // Hydrate state for edit / add modes.
  useEffect(() => {
    let cancelled = false
    const hydrate = async () => {
      if (capabilityId) {
        const cap = await api.getCapability(capabilityId)
        if (!cancelled && cap) {
          setEditingCapability(cap)
          setState(stateFromCapability(cap))
          // Focus first relevant step: rejected field's step, else first relevant step.
          const firstStep = cap.rejection
            ? mapFieldToStep(cap.rejection.field)
            : computeVisibleSteps(stateFromCapability(cap), { includeRequirements: false })[0]
          setCurrentStep(firstStep ?? 'review')
          setHydrated(true)
        }
      } else if (addType) {
        const isUSCap = addType === 'cnam' || addType === 'a2p_messaging' || addType === 'stir_shaken'
        setState((s) => ({
          ...s,
          capabilities: [addType],
          composition: isUSCap ? [{ country: 'US', count: 1 }] : s.composition,
        }))
        setCurrentStep(addType === 'cnam' ? 'cnam' : addType === 'a2p_messaging' ? 'messaging' : 'business')
        setHydrated(true)
      } else {
        setHydrated(true)
      }
    }
    hydrate()
    return () => {
      cancelled = true
    }
  }, [capabilityId, addType])

  if (!hydrated) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>
  }

  const update = (patch: Partial<WizardFormState>) => setState((s) => ({ ...s, ...patch }))

  const currentIndex = steps.indexOf(currentStep)
  const isLast = currentIndex === steps.length - 1

  const onCancel = async () => {
    // For new wizards we could persist a draft; for now just navigate home.
    navigate('/business-registration')
  }

  const onBack = () => {
    if (currentIndex > 0) setCurrentStep(steps[currentIndex - 1])
  }

  const goToStep = (s: WizardStepId) => {
    if (steps.includes(s)) setCurrentStep(s)
  }

  const onNext = async () => {
    if (isLast) {
      setSubmitting(true)
      await submit()
      setSubmitting(false)
      navigate('/business-registration')
      return
    }
    setCurrentStep(steps[currentIndex + 1])
  }

  const submit = async () => {
    if (editingCapability) {
      await api.upsertCapability({
        id: editingCapability.id,
        legalEntityId: editingCapability.legalEntityId,
        type: editingCapability.type,
        countries: editingCapability.countries,
        shouldSubmit: true,
        dependencies: editingCapability.dependencies,
        data: { ...collectStateData(state), submittedAt: new Date().toISOString() },
        createdBy: editingCapability.createdBy,
      })
      return
    }

    // Resolve which entity these capabilities will belong to.
    let entityId = currentEntity?.id
    if (isCreatingEntity) {
      const entityName = state.business.legalName?.trim() || 'New Entity'
      const created = await api.createEntity(entityName)
      entityId = created.id
      setCurrentEntityId(created.id)
    }
    if (!entityId) return

    // New wizard: create one capability per planned type, with linked dependencies.
    const planned = derivePlannedCapabilities(state)
    const ids: Partial<Record<CapabilityType, string>> = {}
    // Submit business profile first so its ID can be set as a dependency.
    const order: CapabilityType[] = [
      'business_profile',
      'country_bundle',
      'stir_shaken',
      'a2p_messaging',
      'cnam',
    ]
    for (const t of order) {
      if (!planned.includes(t)) continue
      const isBundle = t === 'country_bundle'
      const bundleCountries: CountryCode[] = compositionCountries(state.composition).filter(
        (c) => c !== 'US' && c !== 'IL'
      )
      if (isBundle) {
        for (const country of bundleCountries) {
          const created = await api.upsertCapability({
            legalEntityId: entityId,
            type: 'country_bundle',
            countries: [country],
            shouldSubmit: true,
            dependencies: [],
            data: { bundle: { country }, representative: state.representative },
            createdBy: 'gur@harmony.ai',
          })
          ids[`country_bundle_${country}` as unknown as CapabilityType] = created.id
        }
        continue
      }
      const dependsOnProfile = t !== 'business_profile'
      const created = await api.upsertCapability({
        legalEntityId: entityId,
        type: t,
        countries: t === 'business_profile' ? [] : ['US'],
        shouldSubmit: true,
        dependencies: dependsOnProfile && ids.business_profile ? [ids.business_profile] : [],
        data: dataForType(t, state),
        createdBy: 'gur@harmony.ai',
      })
      ids[t] = created.id
    }

    // Create the first pool for this entity if none exists yet, but only when we
    // came in through the full setup flow. Capability-mode entries (Add capability)
    // skip this — the user already has numbers and isn't ordering more.
    if (!capabilityMode) {
      const existingPools = await api.listPools(entityId)
      if (existingPools.length === 0 && state.composition.length > 0) {
        const agents = await api.listAgents()
        await api.createPool({
          legalEntityId: entityId,
          name: 'My First Pool',
          composition: state.composition,
          inboundAgentId: agents[0]?.id ?? null,
          outboundAgentIds: agents.map((a) => a.id),
          autoRotation: false,
        })
      }
    }
  }

  // Disable Next if validation fails
  const stepErrors = validateStep(state, currentStep)
  const nextDisabled = stepErrors.length > 0 || submitting

  const insertMockData = () => {
    setState((s) => ({
      ...s,
      composition:
        s.composition.length > 0
          ? s.composition
          : [
              { country: 'US', region: 'California', count: 4 },
              { country: 'US', region: 'New York', count: 3 },
            ],
      capabilities:
        s.capabilities.length > 0 ? s.capabilities : ['stir_shaken', 'a2p_messaging', 'cnam'],
      business: {
        legalName: 'Acme Inc.',
        registrationType: 'EIN',
        registrationNumber: '12-3456789',
        addressLine1: '123 Market St',
        city: 'San Francisco',
        state: 'CA',
        postalCode: '94103',
        country: 'US',
        companyType: 'LLC',
        businessType: 'For-profit',
        industry: 'Healthcare',
        regionsOfOperation: ['United States'],
        website: 'https://acme.example',
      },
      representative: {
        firstName: 'Jamie',
        lastName: 'Chen',
        email: 'jamie@acme.example',
        phone: '+1 415 555 1212',
        title: 'COO',
        position: 'Authorized Representative',
      },
      messaging: {
        privacyPolicyUrl: 'https://acme.example/privacy',
        termsOfServiceUrl: 'https://acme.example/terms',
      },
      cnam: { displayName: 'Acme' },
    }))
  }

  return (
    <WizardLayout
      steps={steps}
      current={currentStep}
      onBack={currentIndex > 0 ? onBack : undefined}
      onCancel={onCancel}
      onNext={onNext}
      nextLabel={isLast ? (submitting ? 'Submitting…' : 'Submit') : 'Next'}
      nextDisabled={nextDisabled}
      onInsertMockData={insertMockData}
    >
      {currentStep === 'requirements' &&
        (capabilityMode ? (
          <RequirementsCapabilityStep state={state} update={update} />
        ) : (
          <RequirementsStep state={state} update={update} />
        ))}
      {currentStep === 'business' && (
        <BusinessInfoStep
          state={state}
          update={update}
          rejectionField={editingCapability?.rejection?.field}
          rejectionMessage={
            editingCapability?.type === 'business_profile' ? editingCapability.rejection?.message : undefined
          }
        />
      )}
      {currentStep === 'representative' && <AuthorizedRepStep state={state} update={update} />}
      {currentStep === 'messaging' && <MessagingStep state={state} update={update} />}
      {currentStep === 'cnam' && (
        <CnamStep
          state={state}
          update={update}
          rejectionMessage={editingCapability?.type === 'cnam' ? editingCapability.rejection?.message : undefined}
          rejectionField={editingCapability?.type === 'cnam' ? editingCapability.rejection?.field : undefined}
        />
      )}
      {currentStep === 'review' && <ReviewStep state={state} goToStep={goToStep} />}

      {STEP_TITLES[currentStep] && stepErrors.length > 0 && currentStep !== 'requirements' && (
        <div className="mt-6 text-xs text-muted-foreground">
          Fill in all required fields to continue.
        </div>
      )}
    </WizardLayout>
  )
}

function stateFromCapability(c: Capability): WizardFormState {
  const d = c.data as WizardFormState & Record<string, unknown>
  return {
    composition: c.countries.map((country) => ({ country, count: 1 })),
    capabilities: [c.type],
    business: (d.business as WizardFormState['business']) ?? {},
    representative: (d.representative as WizardFormState['representative']) ?? {},
    messaging: (d.messaging as WizardFormState['messaging']) ?? {},
    cnam: (d.cnam as WizardFormState['cnam']) ?? {},
    bundles: (d.bundles as WizardFormState['bundles']) ?? {},
  }
}

function collectStateData(state: WizardFormState): Record<string, unknown> {
  return {
    business: state.business,
    representative: state.representative,
    messaging: state.messaging,
    cnam: state.cnam,
    bundles: state.bundles,
  }
}

function dataForType(t: CapabilityType, state: WizardFormState): Record<string, unknown> {
  switch (t) {
    case 'business_profile':
      return { business: state.business, representative: state.representative }
    case 'cnam':
      return { cnam: state.cnam }
    case 'a2p_messaging':
      return { messaging: state.messaging }
    case 'stir_shaken':
      return {}
    default:
      return {}
  }
}

function mapFieldToStep(field?: string): WizardStepId | undefined {
  if (!field) return undefined
  if (['legalName', 'registrationNumber', 'registrationType', 'address', 'website', 'industry'].includes(field))
    return 'business'
  if (['privacyPolicyUrl', 'termsOfServiceUrl'].includes(field)) return 'messaging'
  if (['displayName'].includes(field)) return 'cnam'
  if (['firstName', 'lastName', 'email', 'phone', 'title'].includes(field)) return 'representative'
  return undefined
}
