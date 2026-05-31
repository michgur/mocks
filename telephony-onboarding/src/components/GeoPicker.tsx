import { useEffect, useMemo, useRef, useState } from 'react'
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
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

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
    // Reset the search and keep the input focused so the user can keep picking.
    setQuery('')
    inputRef.current?.focus()
  }

  const setCount = (id: string, count: number) =>
    onChange(value.map((v) => (v.geo.id === id ? { ...v, count: Math.max(1, count) } : v)))

  const remove = (id: string) => onChange(value.filter((v) => v.geo.id !== id))

  // States read as "US • Arizona"; countries keep their full name.
  const displayLabel = (g: GeoOption) => (g.region ? `${g.country} • ${g.region}` : g.label)

  return (
    <div className="space-y-3">
      <div className="relative" ref={ref}>
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          placeholder="Search regions…"
          className="pl-9"
        />
        {open && (
          <div className="absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md">
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
                    // Prevent the input from blurring when a geo is clicked.
                    onMouseDown={(e) => e.preventDefault()}
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
        )}
      </div>

      {value.length > 0 && (
        <div className="space-y-1.5">
          {value.map(({ geo, count }) => (
            <div
              key={geo.id}
              className="flex items-center gap-3 rounded-md border bg-background px-3 py-2"
            >
              <span>{COUNTRY_FLAGS[geo.country]}</span>
              <span className="flex-1 text-sm">{displayLabel(geo)}</span>
              <span className="w-20 text-right text-xs tabular-nums text-muted-foreground">
                {formatUsd(numberMonthlyPrice(geo.country) * count)}/mo
              </span>
              <Input
                type="number"
                min={1}
                value={count}
                onChange={(e) => setCount(geo.id, parseInt(e.target.value) || 1)}
                className="h-8 w-20 text-center"
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
  )
}
