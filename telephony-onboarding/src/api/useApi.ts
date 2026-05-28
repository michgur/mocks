import { useEffect, useState } from 'react'
import { api, store } from './client'
import type { Agent, Capability, LegalEntity, PhoneNumber, Pool } from '@/types'

export function useCapabilities(entityId?: string) {
  const [capabilities, setCapabilities] = useState<Capability[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const result = await api.listCapabilities(entityId)
      if (!cancelled) {
        setCapabilities(result)
        setLoading(false)
      }
    }
    load()
    const unsub = store.subscribe(() => {
      api.listCapabilities(entityId).then((r) => {
        if (!cancelled) setCapabilities(r)
      })
    })
    return () => {
      cancelled = true
      unsub()
    }
  }, [entityId])

  return { capabilities, loading }
}

export function useNumbers() {
  const [numbers, setNumbers] = useState<PhoneNumber[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const result = await api.listNumbers()
      if (!cancelled) {
        setNumbers(result)
        setLoading(false)
      }
    }
    load()
    const unsub = store.subscribe(() => {
      api.listNumbers().then((r) => {
        if (!cancelled) setNumbers(r)
      })
    })
    return () => {
      cancelled = true
      unsub()
    }
  }, [])

  return { numbers, loading }
}

export function useAgents() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const result = await api.listAgents()
      if (!cancelled) {
        setAgents(result)
        setLoading(false)
      }
    }
    load()
    const unsub = store.subscribe(() => {
      api.listAgents().then((r) => {
        if (!cancelled) setAgents(r)
      })
    })
    return () => {
      cancelled = true
      unsub()
    }
  }, [])

  return { agents, loading }
}

export function usePools(entityId?: string) {
  const [pools, setPools] = useState<Pool[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const result = await api.listPools(entityId)
      if (!cancelled) {
        setPools(result)
        setLoading(false)
      }
    }
    load()
    const unsub = store.subscribe(() => {
      api.listPools(entityId).then((r) => {
        if (!cancelled) setPools(r)
      })
    })
    return () => {
      cancelled = true
      unsub()
    }
  }, [entityId])

  return { pools, loading }
}

export function useEntities() {
  const [entities, setEntities] = useState<LegalEntity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const result = await api.listEntities()
      if (!cancelled) {
        setEntities(result)
        setLoading(false)
      }
    }
    load()
    const unsub = store.subscribe(() => {
      api.listEntities().then((r) => {
        if (!cancelled) setEntities(r)
      })
    })
    return () => {
      cancelled = true
      unsub()
    }
  }, [])

  return { entities, loading }
}
