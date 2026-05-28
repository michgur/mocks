import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useEntities } from '@/api/useApi'
import type { LegalEntity } from '@/types'

interface EntityContextValue {
  entities: LegalEntity[]
  currentEntity: LegalEntity | null
  setCurrentEntityId: (id: string) => void
  loading: boolean
}

const EntityContext = createContext<EntityContextValue | null>(null)
const STORAGE_KEY = 'telephony.currentEntityId'

export function EntityProvider({ children }: { children: React.ReactNode }) {
  const { entities, loading } = useEntities()
  const [currentEntityId, setCurrentEntityIdState] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    return window.localStorage.getItem(STORAGE_KEY)
  })

  // If selected entity disappears (cleared/reset), fall back to the first one.
  useEffect(() => {
    if (loading) return
    if (entities.length === 0) {
      setCurrentEntityIdState(null)
      return
    }
    if (!currentEntityId || !entities.find((e) => e.id === currentEntityId)) {
      setCurrentEntityIdState(entities[0].id)
    }
  }, [entities, loading, currentEntityId])

  const setCurrentEntityId = (id: string) => {
    setCurrentEntityIdState(id)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, id)
    }
  }

  const currentEntity = useMemo(
    () => entities.find((e) => e.id === currentEntityId) ?? null,
    [entities, currentEntityId]
  )

  return (
    <EntityContext.Provider value={{ entities, currentEntity, setCurrentEntityId, loading }}>
      {children}
    </EntityContext.Provider>
  )
}

export function useEntityContext() {
  const ctx = useContext(EntityContext)
  if (!ctx) throw new Error('useEntityContext must be used inside EntityProvider')
  return ctx
}
