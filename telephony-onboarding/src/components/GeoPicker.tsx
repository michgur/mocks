import { useMemo, useState } from 'react'
import { Check, ChevronLeft, ChevronRight, Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  CA_PROVINCES,
  COUNTRY_FLAGS,
  COUNTRY_LABELS,
  US_STATES,
  formatUsd,
  numberMonthlyPrice,
  type CountryCode,
} from '@/types'

export interface GeoOption {
  id: string
  label: string
  country: CountryCode
  region?: string // state/province, when the geo is narrower than the country
}

export interface GeoSelection {
  geo: GeoOption
  count: number
}

interface CountryNode {
  country: CountryCode
  label: string
  // Present ⇒ this country is a drill group (pick a specific region). Absent ⇒
  // the country is selected as a whole. We only drill into countries where
  // local numbers are always available without a local-presence bundle (US, CA).
  regions?: string[]
}

const COUNTRY_CATALOG: CountryNode[] = [
  { country: 'US', label: COUNTRY_LABELS.US, regions: US_STATES.filter((s) => s !== 'Any state') },
  { country: 'CA', label: COUNTRY_LABELS.CA, regions: CA_PROVINCES },
  { country: 'UK', label: COUNTRY_LABELS.UK },
  { country: 'AU', label: COUNTRY_LABELS.AU },
]

const regionLeaf = (country: CountryCode, region: string): GeoOption => ({
  id: `${country}-${region}`,
  label: region,
  country,
  region,
})

const countryLeaf = (node: CountryNode): GeoOption => ({
  id: node.country,
  label: node.label,
  country: node.country,
})

// Every selectable region across all countries — what search matches against.
// Drill groups contribute their regions; flat countries contribute themselves.
// The non-selectable top-level "United States"/"Canada" never appear here.
const ALL_LEAVES: GeoOption[] = COUNTRY_CATALOG.flatMap((node) =>
  node.regions ? node.regions.map((r) => regionLeaf(node.country, r)) : [countryLeaf(node)]
)

export function GeoPicker({
  value,
  onChange,
}: {
  value: GeoSelection[]
  onChange: (next: GeoSelection[]) => void
}) {
  const [query, setQuery] = useState('')
  // Which drill group we're inside (null = top-level country list).
  const [drill, setDrill] = useState<CountryCode | null>(null)

  const pickedIds = useMemo(() => new Set(value.map((v) => v.geo.id)), [value])

  const q = query.trim().toLowerCase()
  const searchResults = useMemo(
    () => (q ? ALL_LEAVES.filter((g) => g.label.toLowerCase().includes(q)) : []),
    [q]
  )

  const drillNode = drill ? COUNTRY_CATALOG.find((n) => n.country === drill) : null

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

  // States read as "US • Arizona"; whole-country selections keep their full name.
  const displayLabel = (g: GeoOption) => (g.region ? `${g.country} • ${g.region}` : g.label)

  // A selectable leaf row: check + flag + label + monthly price.
  const leafRow = (g: GeoOption, label: string) => {
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
        <span className="flex-1">{label}</span>
        <span className="text-xs tabular-nums text-muted-foreground">
          {formatUsd(numberMonthlyPrice(g.country))}/mo
        </span>
      </button>
    )
  }

  // A drill row: navigates into the country's regions instead of selecting it.
  const drillRow = (node: CountryNode) => (
    <button
      key={node.country}
      type="button"
      onClick={() => setDrill(node.country)}
      className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent"
    >
      <span className="h-4 w-4" />
      <span>{COUNTRY_FLAGS[node.country]}</span>
      <span className="flex-1">{node.label}</span>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </button>
  )

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Left: searchable, drill-down region picker. */}
      <div className="flex h-80 flex-col rounded-md border">
        <div className="relative border-b p-2">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              // Searching is a flat overlay; exit any drill so clearing the
              // query lands back at the top-level country list.
              if (e.target.value) setDrill(null)
            }}
            placeholder="Search regions…"
            className="h-9 pl-9"
          />
        </div>
        <div className="flex-1 overflow-auto p-1">
          {q ? (
            // Search ignores the hierarchy: flat list of every matching region.
            searchResults.length === 0 ? (
              <div className="px-2 py-3 text-center text-sm text-muted-foreground">
                No regions found
              </div>
            ) : (
              searchResults.map((g) => leafRow(g, displayLabel(g)))
            )
          ) : drillNode ? (
            // Inside a drill group: a back row, then the country's regions.
            <>
              <button
                type="button"
                onClick={() => setDrill(null)}
                className="flex w-full items-center gap-1 rounded-sm px-2 py-1.5 text-left text-sm font-medium hover:bg-accent"
              >
                <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                {drillNode.label}
              </button>
              <div className="my-1 border-t" />
              {drillNode.regions!.map((r) => leafRow(regionLeaf(drillNode.country, r), r))}
            </>
          ) : (
            // Top level: drill countries show a chevron; flat countries are selectable.
            COUNTRY_CATALOG.map((node) =>
              node.regions ? drillRow(node) : leafRow(countryLeaf(node), node.label)
            )
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
