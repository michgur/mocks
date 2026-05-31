import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/api/client'
import { useCompanyContext } from '@/state/CompanyContext'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'

// Connecting a Twilio account creates a BYO company: it skips our regulatory
// flow entirely (verification lives in the customer's own Twilio console).
export function ConnectTwilioModal({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const navigate = useNavigate()
  const { setCurrentCompanyId } = useCompanyContext()
  const [name, setName] = useState('')
  const [accountSid, setAccountSid] = useState('')
  const [authToken, setAuthToken] = useState('')
  const [busy, setBusy] = useState(false)

  const valid =
    accountSid.trim().startsWith('AC') &&
    accountSid.trim().length >= 10 &&
    authToken.trim().length > 0

  const reset = () => {
    setName('')
    setAccountSid('')
    setAuthToken('')
  }

  const insertMock = () => {
    setName('Acme Production')
    setAccountSid('AC1234567890abcdef1234567890abcdef')
    setAuthToken('mock_auth_token_0123456789abcdef')
  }

  const connect = async () => {
    setBusy(true)
    try {
      const company = await api.createCompany({
        name: name.trim() || 'Twilio account',
        country: 'US',
        mode: 'byo',
      })
      // We only persist the SID; the auth token isn't stored in the prototype.
      await api.connectProvider(company.id, accountSid.trim())
      setCurrentCompanyId(company.id)
      reset()
      onOpenChange(false)
      navigate('/numbers')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect your Twilio account</DialogTitle>
          <DialogDescription>
            We'll use your own Twilio account for numbers and carrier registrations. Find these
            credentials in your Twilio Console.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="twilio-name">Account name</Label>
            <Input
              id="twilio-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Acme Production"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="twilio-sid">Account SID</Label>
            <Input
              id="twilio-sid"
              value={accountSid}
              onChange={(e) => setAccountSid(e.target.value)}
              placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="twilio-token">Auth Token</Label>
            <Input
              id="twilio-token"
              type="password"
              value={authToken}
              onChange={(e) => setAuthToken(e.target.value)}
              placeholder="Your Twilio auth token"
              autoComplete="off"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" className="mr-auto" onClick={insertMock} disabled={busy}>
            Insert mock data
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={connect} disabled={!valid || busy}>
            {busy ? 'Connecting…' : 'Connect'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
