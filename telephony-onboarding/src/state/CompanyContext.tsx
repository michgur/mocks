import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useCompanies } from '@/api/useApi'
import type { Company } from '@/types'

interface CompanyContextValue {
  companies: Company[]
  currentCompany: Company | null
  setCurrentCompanyId: (id: string) => void
  loading: boolean
}

const CompanyContext = createContext<CompanyContextValue | null>(null)
const STORAGE_KEY = 'telephony.currentCompanyId'

export function CompanyProvider({ children }: { children: React.ReactNode }) {
  const { companies, loading } = useCompanies()
  const [currentCompanyId, setCurrentCompanyIdState] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    return window.localStorage.getItem(STORAGE_KEY)
  })

  // If the selected Company disappears (cleared/reset), fall back to the first.
  useEffect(() => {
    if (loading) return
    if (companies.length === 0) {
      setCurrentCompanyIdState(null)
      return
    }
    if (!currentCompanyId || !companies.find((c) => c.id === currentCompanyId)) {
      setCurrentCompanyIdState(companies[0].id)
    }
  }, [companies, loading, currentCompanyId])

  const setCurrentCompanyId = (id: string) => {
    setCurrentCompanyIdState(id)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, id)
    }
  }

  const currentCompany = useMemo(
    () => companies.find((c) => c.id === currentCompanyId) ?? null,
    [companies, currentCompanyId]
  )

  return (
    <CompanyContext.Provider value={{ companies, currentCompany, setCurrentCompanyId, loading }}>
      {children}
    </CompanyContext.Provider>
  )
}

export function useCompanyContext() {
  const ctx = useContext(CompanyContext)
  if (!ctx) throw new Error('useCompanyContext must be used inside CompanyProvider')
  return ctx
}
