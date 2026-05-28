import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  CAPABILITY_DESCRIPTIONS,
  CAPABILITY_LABELS,
  CAPABILITY_WARNINGS,
  COUNTRY_FLAGS,
  COUNTRY_LABELS,
  REQUIREMENTS_CAPABILITIES,
  SUPPORTED_COUNTRIES,
  US_STATES,
  capabilityCountries,
  requiresBundle,
  type CapabilityType,
  type CompositionRow,
  type CountryCode,
} from '@/types'
import { compositionCountries, type WizardFormState } from '../wizardState'

interface Props {
  state: WizardFormState
  update: (patch: Partial<WizardFormState>) => void
}

export function RequirementsStep({ state, update }: Props) {
  const countries = compositionCountries(state.composition)
  const showNumberProvisioning = countries.some(requiresBundle)

  const updateRow = (i: number, patch: Partial<CompositionRow>) => {
    update({
      composition: state.composition.map((r, idx) => (idx === i ? { ...r, ...patch } : r)),
    })
  }

  const addRow = () => {
    update({
      composition: [
        ...state.composition,
        { country: 'US', region: 'Any state', count: 1 },
      ],
    })
  }

  const removeRow = (i: number) => {
    update({ composition: state.composition.filter((_, idx) => idx !== i) })
  }

  const toggleCap = (t: CapabilityType) => {
    const has = state.capabilities.includes(t)
    update({
      capabilities: has ? state.capabilities.filter((x) => x !== t) : [...state.capabilities, t],
    })
  }

  const totalNumbers = state.composition.reduce((sum, r) => sum + (r.count || 0), 0)

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">What numbers do you need?</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Tell us where you'll be calling from. We'll only ask for information required for the
        capabilities you select.
      </p>

      <div className="mt-8">
        <Label className="text-sm font-medium">Composition</Label>
        <p className="mb-3 mt-1 text-xs text-muted-foreground">
          Pick countries, regions, and how many numbers of each.
        </p>

        <div className="space-y-2">
          {state.composition.map((row, i) => (
            <div key={i} className="flex items-center gap-2">
              <Select
                value={row.country}
                onValueChange={(v) => {
                  const country = v as CountryCode
                  updateRow(i, {
                    country,
                    region: country === 'US' ? row.region ?? 'Any state' : undefined,
                  })
                }}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_COUNTRIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      <span className="mr-2">{COUNTRY_FLAGS[c]}</span>
                      {COUNTRY_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {row.country === 'US' && (
                <Select
                  value={row.region ?? 'Any state'}
                  onValueChange={(v) => updateRow(i, { region: v })}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {US_STATES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Input
                type="number"
                min={1}
                value={row.count}
                onChange={(e) =>
                  updateRow(i, { count: Math.max(1, parseInt(e.target.value) || 1) })
                }
                className="w-20 text-center"
              />

              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeRow(i)}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <Button
            variant="ghost"
            size="sm"
            onClick={addRow}
            className="text-muted-foreground"
          >
            <Plus className="h-4 w-4" />
            Add country / region
          </Button>
        </div>

        {totalNumbers > 0 && (
          <div className="mt-3 text-xs text-muted-foreground">
            Total: <span className="font-medium text-foreground">{totalNumbers} numbers</span>
          </div>
        )}
      </div>

      {countries.length > 0 && (
        <div className="mt-10">
          <Label className="text-sm font-medium">Capabilities</Label>
          <p className="mb-3 mt-1 text-xs text-muted-foreground">
            We'll register these with carriers behind the scenes.
          </p>
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
