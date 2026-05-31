import { useEffect, useState } from 'react'
import { api, store } from './client'
import type {
  Agent,
  CapabilityView,
  Company,
  ImportableNumber,
  PhoneNumber,
  Provision,
  ProviderConnection,
  Requirement,
} from '@/types'

// Subscribe a loader to the store so every mutation re-runs it.
function useStoreData<T>(load: () => Promise<T>, deps: unknown[], initial: T) {
  const [data, setData] = useState<T>(initial)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const run = () =>
      load().then((r) => {
        if (!cancelled) {
          setData(r)
          setLoading(false)
        }
      })
    run()
    const unsub = store.subscribe(run)
    return () => {
      cancelled = true
      unsub()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { data, loading }
}

export function useCompanies() {
  const { data, loading } = useStoreData<Company[]>(() => api.listCompanies(), [], [])
  return { companies: data, loading }
}

export function useRequirements(companyId?: string) {
  const { data, loading } = useStoreData<Requirement[]>(
    () => api.listRequirements(companyId),
    [companyId],
    []
  )
  return { requirements: data, loading }
}

export function useCapabilityViews(companyId?: string) {
  const { data, loading } = useStoreData<CapabilityView[]>(
    () => (companyId ? api.listCapabilityViews(companyId) : Promise.resolve([])),
    [companyId],
    []
  )
  return { capabilities: data, loading }
}

export function useAgents(companyId?: string) {
  const { data, loading } = useStoreData<Agent[]>(() => api.listAgents(companyId), [companyId], [])
  return { agents: data, loading }
}

export function useNumbers(agentId?: string) {
  const { data, loading } = useStoreData<PhoneNumber[]>(
    () => api.listNumbers(agentId),
    [agentId],
    []
  )
  return { numbers: data, loading }
}

export function useProvisions(agentId?: string) {
  const { data, loading } = useStoreData<Provision[]>(
    () => api.listProvisions(agentId),
    [agentId],
    []
  )
  return { provisions: data, loading }
}

export function useConnections(companyId?: string) {
  const { data, loading } = useStoreData<ProviderConnection[]>(
    () => api.listConnections(companyId),
    [companyId],
    []
  )
  return { connections: data, loading }
}

export function useImportableNumbers(companyId?: string) {
  const { data, loading } = useStoreData<ImportableNumber[]>(
    () => (companyId ? api.listImportableNumbers(companyId) : Promise.resolve([])),
    [companyId],
    []
  )
  return { importable: data, loading }
}
