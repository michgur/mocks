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
  missingRequiredFields,
  plannedRequirementTypes,
  validateStep,
  type WizardFormState,
  type WizardStepId,
} from './wizardState'
import { ChannelsStep } from './steps/ChannelsStep'
import { ConfirmStep } from './steps/ConfirmStep'

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
  // Implicit AI fill: `aiActive` drives the banner (Clear ⇄ Undo); `aiSnapshot`
  // retains the filled values so Undo can repaint them after a Clear.
  const [aiActive, setAiActive] = useState(false)
  const [aiSnapshot, setAiSnapshot] = useState<AiFillPatch | null>(null)

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
          setCurrentStep('confirm')
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
          documents: req.data.documents ?? {},
        }
        const cfg: WizardConfig = { includeChannels: false, needIdentity: isIdentity, editing: req }
        // Editing an existing requirement: show real submitted values, not AI guesses.
        setState(next)
        setConfig(cfg)
        setAiActive(false)
        setCurrentStep('confirm')
        return
      }

      // ── Set up a single capability on an existing company ───────────────
      if (capabilityParam && currentCompany) {
        const country = currentCompany.country
        const reqs = await api.listRequirements(currentCompany.id)
        if (cancelled) return
        const idType = identityRequirementType(country)
        const needIdentity = !reqs.some((r) => r.type === idType)
        const base: WizardFormState = {
          ...emptyWizardState,
          country,
          countries: currentCompany.countries,
          capabilities: [capabilityParam],
        }
        const fill = aiPrefill(base, currentCompany.name)
        setState({ ...base, ...fill })
        setAiSnapshot(fill)
        setAiActive(true)
        setConfig({ includeChannels: false, needIdentity })
        setCurrentStep('confirm')
        return
      }

      // ── New company onboarding (channels-first) ─────────────────────────
      const countries = prefillCountries ?? currentCompany?.countries ?? emptyWizardState.countries
      const base: WizardFormState = {
        ...emptyWizardState,
        country: countries[0] ?? 'US',
        countries,
      }
      const fill = aiPrefill(base, currentCompany?.name)
      setState({ ...base, ...fill })
      setAiSnapshot(fill)
      setAiActive(true)
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

  // The banner's Clear empties the AI-filled sections but keeps the snapshot, so
  // Undo can repaint them — Clear is reversible, not destructive.
  const onClearAi = () => {
    // Only clear what Sienna filled. The representative is known from registration,
    // and title/position are the user's own input — both survive a clear.
    setState((s) => ({ ...s, business: {}, messaging: {}, cnam: {} }))
    setAiActive(false)
  }
  const onUndoAi = () => {
    if (aiSnapshot) setState((s) => ({ ...s, ...aiSnapshot }))
    setAiActive(true)
  }

  const currentIndex = steps.indexOf(currentStep)
  const isLast = currentIndex === steps.length - 1

  // Return to wherever the wizard was opened from (e.g. the Agents page),
  // falling back to Telephony.
  const done = () => navigate(searchParams.get('return') || '/capabilities')
  const onCancel = () => done()
  const onBack = () => {
    if (currentIndex > 0) setCurrentStep(steps[currentIndex - 1])
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

  const stepErrors =
    currentStep === 'confirm'
      ? missingRequiredFields(state, { needIdentity: config.needIdentity })
      : validateStep(state, currentStep)
  const nextDisabled = stepErrors.length > 0 || submitting

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
    >
      {currentStep === 'channels' && (
        <ChannelsStep
          state={state}
          update={update}
          lockCountry={!!currentCompany && !newCompanyParam && !prefillCountries}
        />
      )}
      {currentStep === 'confirm' && (
        <ConfirmStep
          state={state}
          update={update}
          showIdentity={config.needIdentity}
          aiActive={aiActive}
          onClearAi={onClearAi}
          onUndoAi={onUndoAi}
          businessRejectionField={config.editing?.rejection?.field}
          businessRejectionMessage={
            editingType === identityRequirementType(state.country)
              ? config.editing?.rejection?.message
              : undefined
          }
          cnamRejectionField={editingType === 'cnam' ? config.editing?.rejection?.field : undefined}
          cnamRejectionMessage={editingType === 'cnam' ? config.editing?.rejection?.message : undefined}
        />
      )}

      {currentStep === 'confirm' && stepErrors.length > 0 && (
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
      return { business: state.business, representative: state.representative }
    case 'country_bundle':
      return { business: state.business, representative: state.representative, documents: state.documents }
    case 'a2p_messaging':
      return { messaging: state.messaging }
    case 'cnam':
      return { cnam: state.cnam }
    default:
      return {}
  }
}

type AiFillPatch = Pick<WizardFormState, 'business' | 'messaging' | 'cnam'>

// Stand-in for Sienna, the research agent: derives what's publicly discoverable
// from the company name + the user's email domain. Deliberately leaves the fields
// it can't find empty — the private registration/EIN number. The representative is
// not AI-filled: it's the signed-in user, known from registration.
function aiPrefill(state: WizardFormState, companyName?: string): AiFillPatch {
  const name = (companyName ?? 'Acme Inc.').trim()
  const domain = CREATED_BY.split('@')[1] ?? 'example.com'
  const site = `https://${domain}`
  const cnam = name.replace(/\b(inc|llc|ltd|co|corp)\.?$/i, '').trim().slice(0, 15)
  return {
    business: {
      legalName: name,
      registrationType: 'EIN',
      addressLine1: '548 Market St',
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94104',
      country: state.country,
      companyType: 'Corporation',
      industry: 'Technology',
      website: site,
    },
    messaging: {
      privacyPolicyUrl: `${site}/privacy`,
      termsOfServiceUrl: `${site}/terms`,
    },
    cnam: { displayName: cnam },
  }
}
