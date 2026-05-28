import { useState } from 'react'
import { ChevronDown, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  CAPABILITY_DESCRIPTIONS,
  CAPABILITY_LABELS,
  CAPABILITY_WARNINGS,
  COUNTRY_FLAGS,
  COUNTRY_LABELS,
  REQUIREMENTS_CAPABILITIES,
  SUPPORTED_COUNTRIES,
  capabilityCountries,
  requiresBundle,
  type CapabilityType,
  type CountryCode,
} from '@/types'
import { compositionCountries, type WizardFormState } from '../wizardState'

interface Props {
  state: WizardFormState
  update: (patch: Partial<WizardFormState>) => void
}

/**
 * Requirements step for the "add capability" entry point. The user already has
 * numbers — they're not specifying composition, just picking which countries
 * and capabilities they want to apply for.
 *
 * Internally the country list is stored as composition rows with count=1; the
 * count is meaningless in this mode and never surfaced to the user.
 */
export function RequirementsCapabilityStep({ state, update }: Props) {
  const countries = compositionCountries(state.composition)
  const showNumberProvisioning = countries.some(requiresBundle)

  const toggleCountry = (c: CountryCode) => {
    const has = countries.includes(c)
    if (has) {
      update({ composition: state.composition.filter((r) => r.country !== c) })
    } else {
      update({ composition: [...state.composition, { country: c, count: 1 }] })
    }
  }

  const toggleCap = (t: CapabilityType) => {
    const has = state.capabilities.includes(t)
    update({
      capabilities: has ? state.capabilities.filter((x) => x !== t) : [...state.capabilities, t],
    })
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">What do you need to set up?</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        We'll only ask for information required for the capabilities you select.
      </p>

      <div className="mt-8">
        <div className="mb-2 text-sm font-medium">Contact countries</div>
        <p className="mb-3 text-xs text-muted-foreground">
          Countries where the people you'll be calling or messaging are located.
        </p>
        <CountryMultiSelect selected={countries} onToggle={toggleCountry} />
      </div>

      {countries.length > 0 && (
        <div className="mt-10">
          <div className="mb-3 text-sm font-medium">Capabilities</div>
          <div className="space-y-2">
            {showNumberProvisioning && (
              <CapabilityRow
                type="country_bundle"
                checked
                interactive={false}
                onToggle={() => {}}
                countries={capabilityCountries('country_bundle', countries)}
              />
            )}
            {REQUIREMENTS_CAPABILITIES.map((type) => {
              const ccs = capabilityCountries(type, countries)
              if (ccs.length === 0) return null
              const checked = state.capabilities.includes(type)
              return (
                <CapabilityRow
                  key={type}
                  type={type}
                  checked={checked}
                  interactive
                  onToggle={() => toggleCap(type)}
                  countries={ccs}
                />
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

interface CapabilityRowProps {
  type: CapabilityType
  checked: boolean
  interactive: boolean
  onToggle: () => void
  countries: CountryCode[]
}

function CapabilityRow({ type, checked, interactive, onToggle, countries }: CapabilityRowProps) {
  const warning = CAPABILITY_WARNINGS[type]
  const Comp = interactive ? 'label' : 'div'
  return (
    <Comp
      className={`flex items-start gap-3 rounded-lg border bg-background p-3 transition-colors ${
        interactive ? 'cursor-pointer hover:border-primary/40' : 'opacity-95'
      }`}
    >
      <Checkbox
        checked={checked}
        onCheckedChange={interactive ? onToggle : undefined}
        disabled={!interactive}
        className="mt-0.5"
      />
      <div className="flex-1">
        <div className="font-medium">{CAPABILITY_LABELS[type]}</div>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">{CAPABILITY_DESCRIPTIONS[type]}</span>
          {countries.length > 0 && (
            <span className="inline-flex items-center gap-0.5 text-base leading-none">
              {countries.map((c) => (
                <span key={c} title={COUNTRY_LABELS[c]}>
                  {COUNTRY_FLAGS[c]}
                </span>
              ))}
            </span>
          )}
        </div>
        {!checked && warning && <div className="mt-2 text-xs text-warning">⚠ {warning}</div>}
      </div>
    </Comp>
  )
}

function CountryMultiSelect({
  selected,
  onToggle,
}: {
  selected: CountryCode[]
  onToggle: (c: CountryCode) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <div
        className="flex min-h-10 cursor-pointer flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm"
        onClick={() => setOpen(!open)}
      >
        {selected.length === 0 && <span className="text-muted-foreground">Select countries…</span>}
        {selected.map((c) => (
          <Badge
            key={c}
            variant="secondary"
            className="cursor-pointer"
            onClick={(e) => {
              e.stopPropagation()
              onToggle(c)
            }}
          >
            <span className="mr-1">{COUNTRY_FLAGS[c]}</span>
            {COUNTRY_LABELS[c]}
            <X className="h-3 w-3 ml-1" />
          </Badge>
        ))}
        <ChevronDown className="ml-auto h-4 w-4 text-muted-foreground" />
      </div>
      {open && (
        <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover p-1 shadow-md">
          {SUPPORTED_COUNTRIES.map((c) => (
            <div
              key={c}
              role="option"
              aria-selected={selected.includes(c)}
              onClick={() => onToggle(c)}
              className="flex w-full cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
            >
              <Checkbox checked={selected.includes(c)} />
              <span>{COUNTRY_FLAGS[c]}</span>
              {COUNTRY_LABELS[c]}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
