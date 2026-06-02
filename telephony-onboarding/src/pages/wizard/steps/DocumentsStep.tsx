import { useRef, useState } from 'react'
import { FileText, Upload, X } from 'lucide-react'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { requiredBundleDocuments, type WizardFormState } from '../wizardState'
import type { BundleDocumentValue, DocumentProof, DocumentProofKind } from '@/types'

interface Props {
  state: WizardFormState
  update: (patch: Partial<WizardFormState>) => void
}

export function DocumentsStep({ state, update }: Props) {
  const proofs = requiredBundleDocuments(state)

  const setDoc = (kind: DocumentProofKind, patch: Partial<BundleDocumentValue>) =>
    update({
      documents: {
        ...state.documents,
        [kind]: { ...state.documents[kind], ...patch },
      },
    })

  return (
    <div className="space-y-4">
      {proofs.map((proof) => (
        <DocumentRow
          key={proof.kind}
          proof={proof}
          value={state.documents[proof.kind] ?? {}}
          onChange={(patch) => setDoc(proof.kind, patch)}
        />
      ))}
    </div>
  )
}

function DocumentRow({
  proof,
  value,
  onChange,
}: {
  proof: DocumentProof
  value: BundleDocumentValue
  onChange: (patch: Partial<BundleDocumentValue>) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const pick = (file?: File) => {
    if (file) onChange({ fileName: file.name })
  }

  return (
    <div className="rounded-lg border p-4">
      <div className="text-sm font-medium">{proof.label}</div>
      <p className="mt-0.5 text-xs text-muted-foreground">{proof.help}</p>

      <div className="mt-3 space-y-3">
        <div>
          <Label className="mb-1.5 block text-xs">Document type</Label>
          <Select value={value.documentType ?? ''} onValueChange={(v) => onChange({ documentType: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Select a document…" />
            </SelectTrigger>
            <SelectContent>
              {proof.documentTypes.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {value.fileName ? (
          <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate">{value.fileName}</span>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={() => onChange({ fileName: undefined })}
              className="text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Remove file"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragging(false)
              pick(e.dataTransfer.files?.[0])
            }}
            className={cn(
              'flex w-full flex-col items-center justify-center gap-1.5 rounded-md border border-dashed px-4 py-6 text-center transition-colors',
              dragging ? 'border-primary bg-primary/5' : 'hover:border-primary/40 hover:bg-accent'
            )}
          >
            <Upload className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm">
              <span className="font-medium text-primary">Browse</span> or drag &amp; drop
            </span>
            <span className="text-xs text-muted-foreground">PDF, JPG, or PNG</span>
          </button>
        )}

        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          className="hidden"
          onChange={(e) => pick(e.target.files?.[0])}
        />
      </div>
    </div>
  )
}
