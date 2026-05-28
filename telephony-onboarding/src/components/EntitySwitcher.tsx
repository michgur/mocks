import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Check, ChevronDown, Plus } from 'lucide-react'
import { useEntityContext } from '@/state/EntityContext'
import { cn } from '@/lib/utils'

export function EntitySwitcher() {
  const { entities, currentEntity, setCurrentEntityId } = useEntityContext()
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
    navigate('/wizard?new_entity=1')
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent',
          open && 'bg-accent'
        )}
      >
        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="max-w-[180px] truncate">
          {currentEntity?.name ?? 'No entity'}
        </span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-1 w-72 rounded-md border bg-popover p-1 shadow-md">
          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Business registrations</div>
          {entities.length === 0 ? (
            <div className="px-2 py-3 text-sm text-muted-foreground">No registrations yet</div>
          ) : (
            entities.map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => {
                  setCurrentEntityId(e.id)
                  setOpen(false)
                }}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-left hover:bg-accent"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded bg-muted text-[10px] font-medium uppercase">
                  {e.name.slice(0, 2)}
                </div>
                <span className="flex-1 truncate">{e.name}</span>
                {currentEntity?.id === e.id && <Check className="h-3.5 w-3.5 text-primary" />}
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
            New business registration
          </button>
        </div>
      )}
    </div>
  )
}
