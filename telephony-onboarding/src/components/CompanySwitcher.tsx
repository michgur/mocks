import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Check, ChevronDown, Plus } from 'lucide-react'
import { useCompanyContext } from '@/state/CompanyContext'
import { cn } from '@/lib/utils'

export function CompanySwitcher() {
  const { companies, currentCompany, setCurrentCompanyId } = useCompanyContext()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const onCreateNew = () => {
    setOpen(false)
    navigate('/wizard?new_company=1')
  }

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent',
          open && 'bg-accent'
        )}
      >
        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="max-w-[180px] truncate">{currentCompany?.name ?? 'No company'}</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute left-0 z-50 mt-1 w-72 rounded-md border bg-popover p-1 shadow-md">
          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Companies</div>
          {companies.length === 0 ? (
            <div className="px-2 py-3 text-sm text-muted-foreground">No companies yet</div>
          ) : (
            companies.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setCurrentCompanyId(c.id)
                  setOpen(false)
                }}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-left hover:bg-accent"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded bg-muted text-[10px] font-medium uppercase">
                  {c.name.slice(0, 2)}
                </div>
                <span className="flex-1 truncate">{c.name}</span>
                {currentCompany?.id === c.id && <Check className="h-3.5 w-3.5 text-primary" />}
              </button>
            ))
          )}
          <div className="my-1 h-px bg-border" />
          <button
            type="button"
            onClick={onCreateNew}
            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-left hover:bg-accent"
          >
            <Plus className="h-3.5 w-3.5" />
            New company
          </button>
        </div>
      )}
    </div>
  )
}
