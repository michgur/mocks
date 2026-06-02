import { useMemo, useState } from 'react'
import { Check, Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  COUNTRY_FLAGS,
  US_STATES,
  formatUsd,
  numberMonthlyPrice,
  type CountryCode,
} from '@/types'

export interface GeoOption {
  id: string
  label: string
  country: CountryCode
  region?: string // US state, when the geo is narrower than the country
}

export interface GeoSelection {
  geo: GeoOption
  count: number
}

// Supported provisioning geos: the two live countries plus every US state.
export const GEO_OPTIONS: GeoOption[] = [
  { id: 'US', label: 'United States', country: 'US' },
  { id: 'UK', label: 'United Kingdom', country: 'UK' },
  ...US_STATES.filter((s) => s !== 'Any state').map((s) => ({
    id: `US-${s}`,
    label: s,
    country: 'US' as CountryCode,
    region: s,
  })),
]

export function GeoPicker({
  value,
  onChange,
}: {
  value: GeoSelection[]
  onChange: (next: GeoSelection[]) => void
}) {
  const [query, setQuery] = useState('')

  const pickedIds = useMemo(() => new Set(value.map((v) => v.geo.id)), [value])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return GEO_OPTIONS
    return GEO_OPTIONS.filter((g) => g.label.toLowerCase().includes(q))
  }, [query])

  const toggle = (geo: GeoOption) => {
    onChange(
      pickedIds.has(geo.id)
        ? value.filter((v) => v.geo.id !== geo.id)
        : [...value, { geo, count: 1 }]
    )
  }

  const setCount = (id: string, count: number) =>
    onChange(value.map((v) => (v.geo.id === id ? { ...v, count: Math.max(1, count) } : v)))

  const remove = (id: string) => onChange(value.filter((v) => v.geo.id !== id))

  // States read as "US • Arizona"; countries keep their full name.
  const displayLabel = (g: GeoOption) => (g.region ? `${g.country} • ${g.region}` : g.label)

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Left: always-open, scrollable region picker. */}
      <div className="flex h-80 flex-col rounded-md border">
        <div className="relative border-b p-2">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search regions…"
            className="h-9 pl-9"
          />
        </div>
        <div className="flex-1 overflow-auto p-1">
          {filtered.length === 0 ? (
            <div className="px-2 py-3 text-center text-sm text-muted-foreground">
              No regions found
            </div>
          ) : (
            filtered.map((g) => {
              const checked = pickedIds.has(g.id)
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => toggle(g)}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
                >
                  <span className="flex h-4 w-4 items-center justify-center">
                    {checked && <Check className="h-3.5 w-3.5 text-primary" />}
                  </span>
                  <span>{COUNTRY_FLAGS[g.country]}</span>
                  <span className="flex-1">{displayLabel(g)}</span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {formatUsd(numberMonthlyPrice(g.country))}/mo
                  </span>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Right: the picked regions with per-geo counts. */}
      <div className="flex h-80 flex-col rounded-md border">
        <div className="border-b px-3 py-2.5 text-sm font-medium">
          Selected{value.length > 0 && <span className="text-muted-foreground"> ({value.length})</span>}
        </div>
        {value.length === 0 ? (
          <div className="flex flex-1 items-center justify-center px-4 text-center text-sm text-muted-foreground">
            Pick regions on the left to add numbers.
          </div>
        ) : (
          <div className="flex-1 space-y-1.5 overflow-auto p-2">
            {value.map(({ geo, count }) => (
              <div
                key={geo.id}
                className="flex items-center gap-2 rounded-md border bg-background px-2.5 py-2"
              >
                <span>{COUNTRY_FLAGS[geo.country]}</span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm">{displayLabel(geo)}</span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {formatUsd(numberMonthlyPrice(geo.country) * count)}/mo
                  </span>
                </div>
                <Input
                  type="number"
                  min={1}
                  value={count}
                  onChange={(e) => setCount(geo.id, parseInt(e.target.value) || 1)}
                  className="h-8 w-16 text-center"
                />
                <button
                  type="button"
                  onClick={() => remove(geo.id)}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={`Remove ${geo.label}`}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
