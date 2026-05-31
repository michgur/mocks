// Single mock client. Replace each function body with a real fetch call when
// the API is attached. Function signatures should not change.

import type {
  Agent,
  Capability,
  CapabilityStatus,
  CapabilityType,
  CompositionRow,
  CountryCode,
  LegalEntity,
  PhoneNumber,
  Pool,
} from '@/types'
import { seedAgents, seedCapabilities, seedEntities, seedNumbers, seedPools } from './mockData'

type Listener = () => void

const LATENCY_MS = 250

function delay(ms = LATENCY_MS) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}

class MockStore {
  entities: LegalEntity[] = structuredClone(seedEntities)
  capabilities: Capability[] = structuredClone(seedCapabilities)
  numbers: PhoneNumber[] = structuredClone(seedNumbers)
  agents: Agent[] = structuredClone(seedAgents)
  pools: Pool[] = structuredClone(seedPools)
  listeners = new Set<Listener>()

  subscribe(fn: Listener) {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  notify() {
    this.listeners.forEach((l) => l())
  }

  reset() {
    this.entities = structuredClone(seedEntities)
    this.capabilities = structuredClone(seedCapabilities)
    this.numbers = structuredClone(seedNumbers)
    this.agents = structuredClone(seedAgents)
    this.pools = structuredClone(seedPools)
    this.notify()
  }

  clear() {
    this.entities = []
    this.capabilities = []
    this.numbers = []
    this.agents = structuredClone(seedAgents) // keep agents — they exist independently
    this.pools = []
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

export interface CreateCapabilityInput {
  id?: string
  legalEntityId: string
  type: CapabilityType
  countries?: CountryCode[]
  shouldSubmit: boolean
  dependencies?: string[]
  data: Record<string, unknown>
  createdBy: string
}

export interface CreatePoolInput {
  legalEntityId: string
  name: string
  inboundAgentId: string | null
  inboundLastOutgoing?: boolean
  outboundAgentIds: string[]
  autoRotation: boolean
  targetComposition?: CompositionRow[]
}

export const api = {
  async listEntities(): Promise<LegalEntity[]> {
    await delay()
    return structuredClone(store.entities)
  },

  async createEntity(name: string): Promise<LegalEntity> {
    await delay()
    const entity: LegalEntity = {
      id: uid('ent'),
      name,
      createdAt: new Date().toISOString(),
    }
    store.entities.push(entity)
    store.notify()
    return structuredClone(entity)
  },

  async listCapabilities(entityId?: string): Promise<Capability[]> {
    await delay()
    const all = store.capabilities
    return structuredClone(entityId ? all.filter((c) => c.legalEntityId === entityId) : all)
  },

  async getCapability(id: string): Promise<Capability | null> {
    await delay()
    const c = store.capabilities.find((x) => x.id === id)
    return c ? structuredClone(c) : null
  },

  async upsertCapability(input: CreateCapabilityInput): Promise<Capability> {
    await delay()
    const now = new Date().toISOString()
    const existing = input.id ? store.capabilities.find((c) => c.id === input.id) : undefined

    const nextStatus: CapabilityStatus = input.shouldSubmit
      ? hasUnmetDependency(input.dependencies ?? [])
        ? 'waiting'
        : 'in_review'
      : 'draft'

    if (existing) {
      existing.data = { ...existing.data, ...input.data }
      existing.dependencies = input.dependencies ?? existing.dependencies
      existing.status = nextStatus
      existing.updatedAt = now
      existing.rejection = nextStatus === 'in_review' ? undefined : existing.rejection
      store.notify()
      return structuredClone(existing)
    }

    const created: Capability = {
      id: uid('cap'),
      legalEntityId: input.legalEntityId,
      type: input.type,
      countries: input.countries ?? [],
      status: nextStatus,
      isApproved: false,
      twilioResourceSids: [],
      dependencies: input.dependencies ?? [],
      data: input.data as Capability['data'],
      createdBy: input.createdBy,
      createdAt: now,
      updatedAt: now,
      autoAssign: true,
      assignedNumberIds: [],
    }
    store.capabilities.push(created)
    store.notify()
    return structuredClone(created)
  },

  async submitDraft(id: string): Promise<Capability | null> {
    await delay()
    const c = store.capabilities.find((x) => x.id === id)
    if (!c) return null
    const unmet = hasUnmetDependency(c.dependencies)
    c.status = unmet ? 'waiting' : 'in_review'
    c.updatedAt = new Date().toISOString()
    store.notify()
    return structuredClone(c)
  },

  async setAssignment(id: string, autoAssign: boolean, assignedNumberIds: string[]): Promise<Capability | null> {
    await delay()
    const c = store.capabilities.find((x) => x.id === id)
    if (!c) return null
    c.autoAssign = autoAssign
    c.assignedNumberIds = autoAssign ? eligibleNumberIdsFor(c) : assignedNumberIds
    c.updatedAt = new Date().toISOString()
    store.notify()
    return structuredClone(c)
  },

  async listNumbers(): Promise<PhoneNumber[]> {
    await delay()
    return structuredClone(store.numbers)
  },

  async releaseNumber(id: string): Promise<void> {
    await delay()
    store.numbers = store.numbers.filter((n) => n.id !== id)
    for (const c of store.capabilities) {
      c.assignedNumberIds = c.assignedNumberIds.filter((nid) => nid !== id)
    }
    store.notify()
  },

  async provisionNumbers(poolId: string, composition: CompositionRow[]): Promise<PhoneNumber[]> {
    await delay(500)
    const created: PhoneNumber[] = []
    for (const row of composition) {
      for (let i = 0; i < row.count; i++) {
        const num = createNumberInternal(poolId, row.country, row.region)
        created.push(num)
      }
    }
    store.notify()
    return structuredClone(created)
  },

  async releaseAndReplace(numberId: string): Promise<PhoneNumber | null> {
    await delay(500)
    const existing = store.numbers.find((n) => n.id === numberId)
    if (!existing) return null
    // remove old
    store.numbers = store.numbers.filter((n) => n.id !== numberId)
    for (const c of store.capabilities) {
      c.assignedNumberIds = c.assignedNumberIds.filter((nid) => nid !== numberId)
    }
    // acquire replacement with same shape
    const replacement = createNumberInternal(existing.poolId, existing.country, existing.region)
    store.notify()
    return structuredClone(replacement)
  },

  async listAgents(): Promise<Agent[]> {
    await delay()
    return structuredClone(store.agents)
  },

  async listPools(entityId?: string): Promise<Pool[]> {
    await delay()
    const all = store.pools
    return structuredClone(entityId ? all.filter((p) => p.legalEntityId === entityId) : all)
  },

  async getPool(id: string): Promise<Pool | null> {
    await delay()
    const p = store.pools.find((x) => x.id === id)
    return p ? structuredClone(p) : null
  },

  async createPool(input: CreatePoolInput): Promise<Pool> {
    await delay()
    const now = new Date().toISOString()
    const created: Pool = {
      id: uid('pool'),
      legalEntityId: input.legalEntityId,
      name: input.name,
      inboundAgentId: input.inboundAgentId,
      inboundLastOutgoing: input.inboundLastOutgoing ?? false,
      outboundAgentIds: input.outboundAgentIds,
      autoRotation: input.autoRotation,
      targetComposition: input.targetComposition,
      createdAt: now,
      updatedAt: now,
    }
    store.pools.push(created)
    store.notify()
    return structuredClone(created)
  },

  async updatePool(id: string, patch: Partial<Omit<Pool, 'id' | 'createdAt'>>): Promise<Pool | null> {
    await delay()
    const p = store.pools.find((x) => x.id === id)
    if (!p) return null
    Object.assign(p, patch, { updatedAt: new Date().toISOString() })
    store.notify()
    return structuredClone(p)
  },

  // Demo-only helpers (would not exist in production API)
  async _simulateStatus(id: string, status: CapabilityStatus, rejection?: Capability['rejection']) {
    await delay(50)
    const c = store.capabilities.find((x) => x.id === id)
    if (!c) return
    c.status = status
    c.isApproved = status === 'approved'
    c.rejection = status === 'rejected' ? rejection : undefined
    c.updatedAt = new Date().toISOString()
    store.notify()
  },

  async _reset() {
    store.reset()
  },

  async _clear() {
    store.clear()
  },
}

function hasUnmetDependency(deps: string[]): boolean {
  return deps.some((id) => {
    const dep = store.capabilities.find((c) => c.id === id)
    return !dep || dep.status !== 'approved'
  })
}

function eligibleNumberIdsFor(c: Capability): string[] {
  return store.numbers.filter((n) => isEligibleForCapability(n, c)).map((n) => n.id)
}

export function isEligibleForCapability(n: PhoneNumber, c: Capability): boolean {
  if (c.type === 'country_bundle') return c.countries.includes(n.country)
  if (
    c.type === 'cnam' ||
    c.type === 'a2p_messaging' ||
    c.type === 'stir_shaken' ||
    c.type === 'branded_calls'
  ) {
    return n.country === 'US'
  }
  if (c.type === 'business_profile') return true
  return false
}

function createNumberInternal(poolId: string, country: CountryCode, region?: string): PhoneNumber {
  const num: PhoneNumber = {
    id: uid('pn'),
    poolId,
    number: sampleNumberByCountry(country),
    country,
    region: region && region !== 'Any state' ? region : undefined,
    capabilities: ['voice', 'sms'],
    monthlyPrice: country === 'UK' ? 1.0 : 1.15,
    purchasedAt: new Date().toISOString(),
    callsLast30d: 0,
    // Placeholder health: random 75–95 so fresh numbers feel healthy.
    health: Math.floor(75 + Math.random() * 21),
    assignedServices: [],
  }
  store.numbers.push(num)
  // auto-assign eligible services
  for (const c of store.capabilities) {
    if (c.autoAssign && c.isApproved && isEligibleForCapability(num, c)) {
      c.assignedNumberIds.push(num.id)
      num.assignedServices.push(c.type)
    }
  }
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
