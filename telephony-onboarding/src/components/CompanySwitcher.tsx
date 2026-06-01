import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Building2, Check, ChevronDown, Plus, Waypoints } from 'lucide-react'
import { useCompanyContext } from '@/state/CompanyContext'
import { ConnectTwilioModal } from './ConnectTwilioModal'
import { cn } from '@/lib/utils'

export function CompanySwitcher() {
  const { companies, currentCompany, setCurrentCompanyId } = useCompanyContext()
  const [open, setOpen] = useState(false)
  const [addMode, setAddMode] = useState(false)
  const [connectOpen, setConnectOpen] = useState(false)
  const navigate = useNavigate()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setAddMode(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const close = () => {
    setOpen(false)
    setAddMode(false)
  }

  // "Add source" fans out into the provider catalog: a managed company
  // registration, or one of the external providers (BYO Twilio, SIP trunk).
  const registerCompany = () => {
    close()
    navigate('/wizard?new_company=1')
  }
  const connectTwilio = () => {
    close()
    setConnectOpen(true)
  }
  const setupSip = () => {
    close()
    // SIP trunking flow — not built yet
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
        {currentCompany?.mode === 'byo' ? (
          <img src="/twilio.svg" alt="" className="h-3.5 w-3.5" />
        ) : (
          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        <span className="max-w-[180px] truncate">{currentCompany?.name ?? 'No source'}</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute left-0 z-50 mt-1 w-72 rounded-md border bg-popover p-1 shadow-md">
          {addMode ? (
            <>
              <button
                type="button"
                onClick={() => setAddMode(false)}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Add source
              </button>
              <div className="my-1 h-px bg-border" />
              <button
                type="button"
                onClick={registerCompany}
                className="flex w-full items-center gap-2.5 rounded-sm px-2 py-1.5 text-sm text-left hover:bg-accent"
              >
                <Building2 className="h-4 w-4 text-muted-foreground" />
                Register company
              </button>
              <button
                type="button"
                onClick={connectTwilio}
                className="flex w-full items-center gap-2.5 rounded-sm px-2 py-1.5 text-sm text-left hover:bg-accent"
              >
                <img src="/twilio.svg" alt="" className="h-4 w-4" />
                BYO Twilio
              </button>
              <button
                type="button"
                onClick={setupSip}
                className="flex w-full items-center gap-2.5 rounded-sm px-2 py-1.5 text-sm text-left hover:bg-accent"
              >
                <Waypoints className="h-4 w-4 text-muted-foreground" />
                SIP Trunking
              </button>
            </>
          ) : (
            <>
              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Sources</div>
              {companies.length === 0 ? (
                <div className="px-2 py-3 text-sm text-muted-foreground">No sources yet</div>
              ) : (
                companies.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setCurrentCompanyId(c.id)
                      close()
                    }}
                    className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-left hover:bg-accent"
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded bg-muted">
                      {c.mode === 'byo' ? (
                        <img src="/twilio.svg" alt="" className="h-3.5 w-3.5" />
                      ) : (
                        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </div>
                    <span className="flex-1 truncate">{c.name}</span>
                    {currentCompany?.id === c.id && <Check className="h-3.5 w-3.5 text-primary" />}
                  </button>
                ))
              )}
              <div className="my-1 h-px bg-border" />
              <button
                type="button"
                onClick={() => setAddMode(true)}
                className="flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-sm text-left hover:bg-accent"
              >
                <span className="flex items-center gap-2">
                  <Plus className="h-3.5 w-3.5" />
                  Add source
                </span>
                <ChevronDown className="h-3.5 w-3.5 -rotate-90 text-muted-foreground" />
              </button>
            </>
          )}
        </div>
      )}

      <ConnectTwilioModal open={connectOpen} onOpenChange={setConnectOpen} />
    </div>
  )
}
