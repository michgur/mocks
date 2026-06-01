// Single mock client. Replace each function body with a real fetch call when
// the API is attached. Function signatures should not change.

import type {
  Agent,
  Alert,
  CapabilityKind,
  CapabilityView,
  Company,
  CompanyMode,
  CountryCode,
  ImportableNumber,
  Notification,
  PhoneNumber,
  Provision,
  ProvisionSpec,
  ProviderConnection,
  Requirement,
  RequirementStatus,
  RequirementType,
} from '@/types'
import {
  allCapabilitiesForCountries,
  deriveCapabilityAvailability,
  identityRequirementType,
  requirementsForCapability,
} from '@/types'
import {
  mockImportableNumbers,
  seedAgents,
  seedAlerts,
  seedCompanies,
  seedConnections,
  seedNotifications,
  seedNumbers,
  seedProvisions,
  seedRequirements,
} from './mockData'

type Listener = () => void

const LATENCY_MS = 250

function delay(ms = LATENCY_MS) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

class MockStore {
  // Boot into the zero state — the demo starts empty and "Reset to seeded
  // state" (DevToolbar) loads the populated walkthrough.
  companies: Company[] = []
  requirements: Requirement[] = []
  agents: Agent[] = structuredClone(seedAgents).map((a) => ({ ...a }))
  numbers: PhoneNumber[] = []
  provisions: Provision[] = []
  connections: ProviderConnection[] = []
  alerts: Alert[] = []
  notifications: Notification[] = []
  listeners = new Set<Listener>()

  subscribe(fn: Listener) {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  notify() {
    this.listeners.forEach((l) => l())
  }

  reset() {
    this.companies = structuredClone(seedCompanies)
    this.requirements = structuredClone(seedRequirements)
    this.agents = structuredClone(seedAgents)
    this.numbers = structuredClone(seedNumbers)
    this.provisions = structuredClone(seedProvisions)
    this.connections = structuredClone(seedConnections)
    this.alerts = structuredClone(seedAlerts)
    this.notifications = structuredClone(seedNotifications)
    this.notify()
  }

  clear() {
    this.companies = []
    this.requirements = []
    this.numbers = []
    this.provisions = []
    this.connections = []
    this.alerts = []
    this.notifications = []
    this.agents = structuredClone(seedAgents).map((a) => ({ ...a })) // agents exist independently
    this.notify()
  }
}

export const store = new MockStore()

if (typeof window !== 'undefined') {
  ;(window as unknown as { __telephonyStore: MockStore }).__telephonyStore = store
}

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

/* ── Foundation rule helpers ─────────────────────────────────────────── */

function companyById(id: string): Company | undefined {
  return store.companies.find((c) => c.id === id)
}

// Verification is per-country: each country's foundation (US → identity,
// others → country_bundle) is approved independently. Omit `country` to check
// the company's primary foundation.
function isCompanyVerified(companyId: string, country?: CountryCode): boolean {
  const company = companyById(companyId)
  if (!company) return false
  const idType = identityRequirementType(country ?? company.country)
  const identity = store.requirements.find((r) => r.companyId === companyId && r.type === idType)
  return !!identity && identity.status === 'approved'
}

// A regulated requirement waits until the Company is verified; identity itself
// goes straight to review.
function statusOnSubmit(companyId: string, type: RequirementType): RequirementStatus {
  const company = companyById(companyId)
  if (!company) return 'in_review'
  const idType = identityRequirementType(company.country)
  if (type === idType) return 'in_review'
  return isCompanyVerified(companyId) ? 'in_review' : 'waiting'
}

// When identity flips to approved, advance every waiting requirement.
function promoteWaiting(companyId: string) {
  const company = companyById(companyId)
  if (!company) return
  // Primary foundation verified → advance waiting requirements.
  if (isCompanyVerified(companyId)) {
    for (const r of store.requirements) {
      if (r.companyId === companyId && r.status === 'waiting') {
        r.status = 'in_review'
        r.updatedAt = new Date().toISOString()
      }
    }
  }
  // Release each held provision once its own region's foundation is approved.
  for (const p of store.provisions) {
    const agent = store.agents.find((a) => a.id === p.agentId)
    if (agent?.companyId !== companyId || p.status !== 'waiting_on_verification') continue
    if (isCompanyVerified(companyId, p.spec.country)) startProvisioning(p)
  }
}

export interface CreateRequirementInput {
  id?: string
  companyId: string
  type: RequirementType
  shouldSubmit: boolean
  data: Record<string, unknown>
  createdBy: string
}

export interface CreateCompanyInput {
  name: string
  country: CountryCode
  countries?: CountryCode[]
  mode?: CompanyMode
}

export const api = {
  /* ── Companies ─────────────────────────────────────────────────────── */

  async listCompanies(): Promise<Company[]> {
    await delay()
    return structuredClone(store.companies)
  },

  async createCompany(input: CreateCompanyInput): Promise<Company> {
    await delay()
    const countries = input.countries?.length ? input.countries : [input.country]
    const company: Company = {
      id: uid('co'),
      name: input.name,
      country: input.country,
      countries: Array.from(new Set([input.country, ...countries])),
      mode: input.mode ?? 'managed',
      createdAt: new Date().toISOString(),
    }
    store.companies.push(company)
    // Every Company gets a default agent so numbers have somewhere to land.
    store.agents.push({
      id: uid('agent'),
      name: 'Default Agent',
      companyId: company.id,
      autoRotate: true,
      blockIncoming: false,
    })
    store.notify()
    return structuredClone(company)
  },

  // Add a country to an existing company (retroactive expansion).
  async addCompanyCountry(companyId: string, country: CountryCode): Promise<Company | null> {
    await delay()
    const company = companyById(companyId)
    if (!company) return null
    if (!company.countries.includes(country)) company.countries.push(country)
    store.notify()
    return structuredClone(company)
  },

  /* ── Alerts + notifications (stub) ─────────────────────────────────── */

  async listAlerts(): Promise<Alert[]> {
    await delay()
    return structuredClone(store.alerts)
  },

  async listNotifications(): Promise<Notification[]> {
    await delay()
    return structuredClone(store.notifications)
  },

  // Mark a single notification (or all) as read — clears the bell's unread count.
  async markNotificationsRead(id?: string): Promise<void> {
    await delay(50)
    for (const n of store.notifications) {
      if (!id || n.id === id) n.read = true
    }
    store.notify()
  },

  /* ── Requirements ──────────────────────────────────────────────────── */

  async listRequirements(companyId?: string): Promise<Requirement[]> {
    await delay()
    const all = store.requirements
    return structuredClone(companyId ? all.filter((r) => r.companyId === companyId) : all)
  },

  async getRequirement(id: string): Promise<Requirement | null> {
    await delay()
    const r = store.requirements.find((x) => x.id === id)
    return r ? structuredClone(r) : null
  },

  async upsertRequirement(input: CreateRequirementInput): Promise<Requirement> {
    await delay()
    const now = new Date().toISOString()
    const existing = input.id ? store.requirements.find((r) => r.id === input.id) : undefined
    const nextStatus: RequirementStatus = input.shouldSubmit
      ? statusOnSubmit(input.companyId, input.type)
      : 'draft'

    if (existing) {
      existing.data = { ...existing.data, ...input.data }
      existing.status = nextStatus
      existing.updatedAt = now
      existing.rejection = nextStatus === 'in_review' ? undefined : existing.rejection
      store.notify()
      return structuredClone(existing)
    }

    const created: Requirement = {
      id: uid('req'),
      companyId: input.companyId,
      type: input.type,
      status: nextStatus,
      isApproved: false,
      twilioResourceSids: [],
      data: input.data as Requirement['data'],
      createdBy: input.createdBy,
      createdAt: now,
      updatedAt: now,
    }
    store.requirements.push(created)
    store.notify()
    return structuredClone(created)
  },

  async submitRequirement(id: string): Promise<Requirement | null> {
    await delay()
    const r = store.requirements.find((x) => x.id === id)
    if (!r) return null
    r.status = statusOnSubmit(r.companyId, r.type)
    r.updatedAt = new Date().toISOString()
    store.notify()
    return structuredClone(r)
  },

  // Derived per-capability roll-up for a Company.
  async listCapabilityViews(companyId: string): Promise<CapabilityView[]> {
    await delay()
    const company = companyById(companyId)
    if (!company) return []
    const reqs = store.requirements.filter((r) => r.companyId === companyId)
    return allCapabilitiesForCountries(company.countries).map((kind) => ({
      kind,
      availability: deriveCapabilityAvailability(kind, company.country, reqs),
      requirementTypes: requirementsForCapability(kind, company.country),
    }))
  },

  /* ── Agents ────────────────────────────────────────────────────────── */

  async listAgents(companyId?: string): Promise<Agent[]> {
    await delay()
    const all = store.agents
    return structuredClone(companyId ? all.filter((a) => a.companyId === companyId) : all)
  },

  async updateAgent(id: string, patch: Partial<Pick<Agent, 'autoRotate' | 'blockIncoming' | 'name'>>): Promise<Agent | null> {
    await delay()
    const a = store.agents.find((x) => x.id === id)
    if (!a) return null
    Object.assign(a, patch)
    store.notify()
    return structuredClone(a)
  },

  /* ── Numbers ───────────────────────────────────────────────────────── */

  async listNumbers(agentId?: string): Promise<PhoneNumber[]> {
    await delay()
    const active = store.numbers.filter((n) => n.status === 'active')
    return structuredClone(agentId ? active.filter((n) => n.agentId === agentId) : active)
  },

  // Add numbers to an agent. Creates a Provision; if the Company is verified
  // it fulfills immediately, otherwise it waits on verification.
  async addNumbers(agentId: string, spec: ProvisionSpec): Promise<Provision> {
    await delay(500)
    const agent = store.agents.find((a) => a.id === agentId)
    const verified = agent ? isCompanyVerified(agent.companyId, spec.country) : false
    const provision: Provision = {
      id: uid('prov'),
      agentId,
      spec,
      status: verified ? 'pending' : 'waiting_on_verification',
      acquiredNumberIds: [],
      createdAt: new Date().toISOString(),
    }
    store.provisions.push(provision)
    store.notify()
    if (verified) startProvisioning(provision)
    return structuredClone(provision)
  },

  async listProvisions(agentId?: string): Promise<Provision[]> {
    await delay()
    const open = store.provisions.filter((p) => p.status !== 'fulfilled')
    return structuredClone(agentId ? open.filter((p) => p.agentId === agentId) : open)
  },

  // Release a managed number. `replace` tops up an equivalent in the same geo.
  async releaseNumber(id: string, replace: boolean): Promise<PhoneNumber | null> {
    await delay(replace ? 500 : 250)
    const existing = store.numbers.find((n) => n.id === id)
    if (!existing) return null
    existing.status = 'released'
    if (existing.source === 'byo' || !replace) {
      store.notify()
      return null
    }
    const replacement = createNumberInternal(existing.agentId, existing.country, existing.region)
    store.notify()
    return structuredClone(replacement)
  },

  /* ── BYO Twilio ────────────────────────────────────────────────────── */

  async connectProvider(companyId: string, accountSid: string): Promise<ProviderConnection> {
    await delay()
    const conn: ProviderConnection = {
      id: uid('conn'),
      companyId,
      provider: 'twilio',
      accountSid,
      connectedAt: new Date().toISOString(),
    }
    store.connections.push(conn)
    const company = companyById(companyId)
    if (company) company.mode = 'byo'
    store.notify()
    return structuredClone(conn)
  },

  async listConnections(companyId?: string): Promise<ProviderConnection[]> {
    await delay()
    const all = store.connections
    return structuredClone(companyId ? all.filter((c) => c.companyId === companyId) : all)
  },

  // Numbers found in the connected Twilio account that aren't linked yet. We
  // hide any already imported onto one of the company's agents.
  async listImportableNumbers(companyId: string): Promise<ImportableNumber[]> {
    await delay()
    const connected = store.connections.some((c) => c.companyId === companyId)
    if (!connected) return []
    const agentIds = new Set(
      store.agents.filter((a) => a.companyId === companyId).map((a) => a.id)
    )
    const owned = new Set(
      store.numbers
        .filter((n) => agentIds.has(n.agentId) && n.status === 'active')
        .map((n) => n.number)
    )
    return mockImportableNumbers.filter((n) => !owned.has(n.number))
  },

  // Import BYO numbers onto an agent. Gating is bypassed — they just work.
  async importNumbers(agentId: string, picks: ImportableNumber[]): Promise<PhoneNumber[]> {
    await delay(500)
    const created = picks.map((pick) => {
      const n: PhoneNumber = {
        id: uid('pn'),
        agentId,
        number: pick.number,
        country: pick.country,
        region: pick.region,
        health: Math.floor(75 + Math.random() * 21),
        status: 'active',
        source: 'byo',
        callsLast30d: 0,
        acquiredAt: new Date().toISOString(),
      }
      store.numbers.push(n)
      return n
    })
    store.notify()
    return structuredClone(created)
  },

  /* ── Demo-only helpers (would not exist in production API) ─────────── */

  async _simulateRequirementStatus(id: string, status: RequirementStatus, rejection?: Requirement['rejection']) {
    await delay(50)
    const r = store.requirements.find((x) => x.id === id)
    if (!r) return
    r.status = status
    r.isApproved = status === 'approved'
    r.rejection = status === 'rejected' ? rejection : undefined
    r.updatedAt = new Date().toISOString()
    if (status === 'approved') promoteWaiting(r.companyId)
    store.notify()
  },

  async _reset() {
    store.reset()
  },

  async _clear() {
    store.clear()
  },
}

/* ── Internals ───────────────────────────────────────────────────────── */

// Provisioning is asynchronous: numbers are scanned + acquired over time, so we
// stream them in across ticks rather than filling the order instantly. Larger
// orders take more ticks (batched) so progress stays visible without dragging on.
const PROVISION_STEP_MS = 600

function startProvisioning(p: Provision) {
  const agent = store.agents.find((a) => a.id === p.agentId)
  if (!agent) return
  const company = companyById(agent.companyId)
  const country = p.spec.country ?? company?.country ?? 'US'
  const batchSize = Math.max(1, Math.ceil(p.spec.count / 12))

  p.status = 'pending'
  store.notify()

  const step = () => {
    const current = store.provisions.find((x) => x.id === p.id)
    if (!current || current.status === 'fulfilled') return
    const remaining = current.spec.count - current.acquiredNumberIds.length
    for (let i = 0; i < Math.min(batchSize, remaining); i++) {
      const n = createNumberInternal(current.agentId, country, current.spec.region)
      current.acquiredNumberIds.push(n.id)
    }
    const done = current.acquiredNumberIds.length >= current.spec.count
    current.status = done ? 'fulfilled' : 'partially_filled'
    store.notify()
    if (!done) setTimeout(step, PROVISION_STEP_MS)
  }

  setTimeout(step, PROVISION_STEP_MS)
}

function createNumberInternal(agentId: string, country: CountryCode, region?: string): PhoneNumber {
  const num: PhoneNumber = {
    id: uid('pn'),
    agentId,
    number: sampleNumberByCountry(country),
    country,
    region: region && region !== 'Any state' ? region : undefined,
    health: Math.floor(80 + Math.random() * 16), // fresh numbers scan healthy
    status: 'active',
    source: 'managed',
    twilioSid: uid('PN').toUpperCase(),
    callsLast30d: 0,
    acquiredAt: new Date().toISOString(),
  }
  store.numbers.push(num)
  return num
}

function sampleNumberByCountry(country: CountryCode): string {
  const last = Math.floor(1000 + Math.random() * 9000)
  switch (country) {
    case 'US':
      return `+1 (512) 555-${last}`
    case 'UK':
      return `+44 20 7946 ${last}`
    case 'AU':
      return `+61 2 8005 ${last}`
    case 'IL':
      return `+972 3 555 ${last}`
    case 'DE':
      return `+49 30 555 ${last}`
    case 'FR':
      return `+33 1 75 55 ${last}`
  }
}

// A capability kind's underlying requirement types for a company country —
// re-exported for components that render requirement chips.
export function capabilityRequirementTypes(kind: CapabilityKind, country: CountryCode): RequirementType[] {
  return requirementsForCapability(kind, country)
}
