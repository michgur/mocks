import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { api } from '@/api/client'
import {
  identityRequirementType,
  type CapabilityKind,
  type CountryCode,
  type Requirement,
  type RequirementType,
} from '@/types'
import { useCompanyContext } from '@/state/CompanyContext'
import { WizardLayout } from './WizardLayout'
import {
  computeVisibleSteps,
  emptyWizardState,
  plannedRequirementTypes,
  validateStep,
  type WizardFormState,
  type WizardStepId,
} from './wizardState'
import { ChannelsStep } from './steps/ChannelsStep'
import { BusinessInfoStep } from './steps/BusinessInfoStep'
import { AuthorizedRepStep } from './steps/AuthorizedRepStep'
import { MessagingStep } from './steps/MessagingStep'
import { CnamStep } from './steps/CnamStep'
import { ReviewStep } from './steps/ReviewStep'

const CREATED_BY = 'gur@harmony.ai'

interface WizardConfig {
  includeChannels: boolean
  needIdentity: boolean
  editing?: Requirement
}

export function WizardPage() {
  const navigate = useNavigate()
  const { requirementId } = useParams<{ requirementId?: string }>()
  const [searchParams] = useSearchParams()
  const capabilityParam = searchParams.get('capability') as CapabilityKind | null
  const newCompanyParam = searchParams.get('new_company') === '1'
  // Countries carried over from a reserved number roster, so onboarding opens
  // pre-filled with the regions the user already asked for (still editable).
  const countriesParam = searchParams.get('countries')
  const prefillCountries = countriesParam
    ? (countriesParam.split(',').filter(Boolean) as CountryCode[])
    : null
  const { currentCompany, setCurrentCompanyId, loading: companyLoading } = useCompanyContext()

  const [state, setState] = useState<WizardFormState>(emptyWizardState)
  const [config, setConfig] = useState<WizardConfig | null>(null)
  const [currentStep, setCurrentStep] = useState<WizardStepId>('channels')
  const [submitting, setSubmitting] = useState(false)

  // Configure the wizard once the company context has settled.
  useEffect(() => {
    if (companyLoading || config) return
    let cancelled = false

    const configure = async () => {
      // ── Edit / fix an existing requirement ──────────────────────────────
      if (requirementId) {
        const req = await api.getRequirement(requirementId)
        if (cancelled) return
        if (!req) {
          setConfig({ includeChannels: false, needIdentity: false })
          setCurrentStep('review')
          return
        }
        const company = (await api.listCompanies()).find((c) => c.id === req.companyId)
        if (cancelled) return
        const country = company?.country ?? 'US'
        const isIdentity = req.type === identityRequirementType(country)
        const next: WizardFormState = {
          country,
          countries: company?.countries ?? [country],
          capabilities: capabilitiesForRequirement(req.type),
          business: req.data.business ?? {},
          representative: req.data.representative ?? {},
          messaging: req.data.messaging ?? {},
          cnam: req.data.cnam ?? {},
        }
        const cfg: WizardConfig = { includeChannels: false, needIdentity: isIdentity, editing: req }
        const visible = computeVisibleSteps(next, cfg)
        setState(next)
        setConfig(cfg)
        setCurrentStep(
          req.rejection ? mapFieldToStep(req.rejection.field) ?? visible[0] : visible[0]
        )
        return
      }

      // ── Set up a single capability on an existing company ───────────────
      if (capabilityParam && currentCompany) {
        const country = currentCompany.country
        const reqs = await api.listRequirements(currentCompany.id)
        if (cancelled) return
        const idType = identityRequirementType(country)
        const needIdentity = !reqs.some((r) => r.type === idType)
        const next: WizardFormState = {
          ...emptyWizardState,
          country,
          countries: currentCompany.countries,
          capabilities: [capabilityParam],
        }
        const cfg: WizardConfig = { includeChannels: false, needIdentity }
        const visible = computeVisibleSteps(next, cfg)
        setState(next)
        setConfig(cfg)
        setCurrentStep(visible[0])
        return
      }

      // ── New company onboarding (channels-first) ─────────────────────────
      setState((s) => {
        const countries = prefillCountries ?? currentCompany?.countries ?? s.countries
        return { ...s, country: countries[0] ?? 'US', countries }
      })
      setConfig({ includeChannels: true, needIdentity: true })
      setCurrentStep('channels')
    }

    configure()
    return () => {
      cancelled = true
    }
  }, [companyLoading, config, requirementId, capabilityParam, currentCompany])

  const steps = useMemo(
    () =>
      config
        ? computeVisibleSteps(state, {
            includeChannels: config.includeChannels,
            needIdentity: config.needIdentity,
          })
        : [],
    [state, config]
  )

  if (!config) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading…
      </div>
    )
  }

  const update = (patch: Partial<WizardFormState>) => setState((s) => ({ ...s, ...patch }))

  const currentIndex = steps.indexOf(currentStep)
  const isLast = currentIndex === steps.length - 1

  const done = () => navigate('/capabilities')
  const onCancel = () => done()
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
      done()
      return
    }
    setCurrentStep(steps[currentIndex + 1])
  }

  const submit = async () => {
    // Edit mode: re-upsert just the one requirement.
    if (config.editing) {
      await api.upsertRequirement({
        id: config.editing.id,
        companyId: config.editing.companyId,
        type: config.editing.type,
        shouldSubmit: true,
        data: dataForType(config.editing.type, state),
        createdBy: config.editing.createdBy,
      })
      return
    }

    // Resolve (or create) the company these requirements belong to.
    const isCreatingCompany = newCompanyParam || !currentCompany
    let companyId = currentCompany?.id
    if (isCreatingCompany) {
      const created = await api.createCompany({
        name: state.business.legalName?.trim() || 'New company',
        country: state.country,
        countries: state.countries,
      })
      companyId = created.id
      setCurrentCompanyId(created.id)
    }
    if (!companyId) return

    const existing = await api.listRequirements(companyId)

    // Ensure a foundation exists for every country in scope. Channels-first
    // onboarding can span multiple countries (US → identity, others →
    // country_bundle); targeted flows only touch the primary country.
    const foundationTypes = config.includeChannels
      ? Array.from(new Set(state.countries.map((c) => identityRequirementType(c))))
      : [identityRequirementType(state.country)]
    if (config.needIdentity) {
      for (const t of foundationTypes) {
        if (existing.some((r) => r.type === t)) continue
        await api.upsertRequirement({
          companyId,
          type: t,
          shouldSubmit: true,
          data: dataForType(t, state),
          createdBy: CREATED_BY,
        })
      }
    }

    // Create one requirement per planned regulated type (skip existing ones).
    const after = await api.listRequirements(companyId)
    for (const t of plannedRequirementTypes(state)) {
      if (after.some((r) => r.type === t)) continue
      await api.upsertRequirement({
        companyId,
        type: t,
        shouldSubmit: true,
        data: dataForType(t, state),
        createdBy: CREATED_BY,
      })
    }
  }

  const stepErrors = validateStep(state, currentStep)
  const nextDisabled = stepErrors.length > 0 || submitting

  const insertMockData = () =>
    setState((s) => ({
      ...s,
      capabilities: s.capabilities.length > 0 ? s.capabilities : ['calling', 'texting', 'branded_caller_id'],
      business: {
        legalName: 'Acme Inc.',
        registrationType: 'EIN',
        registrationNumber: '12-3456789',
        addressLine1: '123 Market St',
        city: 'San Francisco',
        state: 'CA',
        postalCode: '94103',
        country: s.country,
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

  const editingType = config.editing?.type

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
      {currentStep === 'channels' && (
        <ChannelsStep
          state={state}
          update={update}
          lockCountry={!!currentCompany && !newCompanyParam && !prefillCountries}
        />
      )}
      {currentStep === 'business' && (
        <BusinessInfoStep
          state={state}
          update={update}
          rejectionField={config.editing?.rejection?.field}
          rejectionMessage={editingType === identityRequirementType(state.country) ? config.editing?.rejection?.message : undefined}
        />
      )}
      {currentStep === 'representative' && <AuthorizedRepStep state={state} update={update} />}
      {currentStep === 'messaging' && <MessagingStep state={state} update={update} />}
      {currentStep === 'cnam' && (
        <CnamStep
          state={state}
          update={update}
          rejectionMessage={editingType === 'cnam' ? config.editing?.rejection?.message : undefined}
          rejectionField={editingType === 'cnam' ? config.editing?.rejection?.field : undefined}
        />
      )}
      {currentStep === 'review' && (
        <ReviewStep state={state} goToStep={goToStep} showIdentity={config.needIdentity} />
      )}

      {currentStep !== 'channels' && currentStep !== 'review' && stepErrors.length > 0 && (
        <div className="mt-6 text-xs text-muted-foreground">
          Fill in all required fields to continue.
        </div>
      )}
    </WizardLayout>
  )
}

function capabilitiesForRequirement(type: RequirementType): CapabilityKind[] {
  switch (type) {
    case 'a2p_messaging':
      return ['texting']
    case 'cnam':
      return ['branded_caller_id']
    case 'stir_shaken':
      return ['calling']
    case 'sender_id':
      return ['alphanumeric_sender_id']
    case 'identity':
    case 'country_bundle':
      return []
  }
}

function dataForType(t: RequirementType, state: WizardFormState): Record<string, unknown> {
  switch (t) {
    case 'identity':
    case 'country_bundle':
      return { business: state.business, representative: state.representative }
    case 'a2p_messaging':
      return { messaging: state.messaging }
    case 'cnam':
      return { cnam: state.cnam }
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
