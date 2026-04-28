import { useState, useEffect, useRef } from 'react'
import { PDFViewer } from '@react-pdf/renderer'
import { X, Printer, Loader2, AlertTriangle, FileText } from 'lucide-react'
import {
  BillOfSalePDF, MVR180PDF, MVR181PDF,
  FTCBuyersGuidePDF, MVR1PDF, MVR2PDF,
  type PDFFormType,
} from '@/lib/pdfForms'
import { fillDMVForm, toDMVFormId } from '@/lib/dmvFormFiller'
import type { DealSummary, NCFormType } from '@/types/database'
import { FORM_LABELS } from '@/types/database'

// Which forms use the official DMV PDF filler
const DMV_OFFICIAL_FORMS: NCFormType[] = ['mvr1', 'mvr180', 'mvr181', 'mvr2']

interface PDFViewerModalProps {
  open: boolean
  onClose: () => void
  formType: NCFormType
  deal: DealSummary
}

export default function PDFViewerModal({ open, onClose, formType, deal }: PDFViewerModalProps) {
  const [mode, setMode] = useState<'loading' | 'official' | 'generated' | 'error'>('loading')
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [usedFallback, setUsedFallback] = useState(false)
  const prevUrlRef = useRef<string | null>(null)

  useEffect(() => {
    if (!open) return

    // Revoke previous blob URL
    if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current)
    setBlobUrl(null)
    setMode('loading')
    setErrorMsg(null)

    const isOfficialForm = DMV_OFFICIAL_FORMS.includes(formType)
    const dmvId = toDMVFormId(formType)

    if (isOfficialForm && dmvId) {
      // Try to fill official NC DMV form
      fillDMVForm(dmvId, deal)
        .then(result => {
          prevUrlRef.current = result.url
          setBlobUrl(result.url)
          setUsedFallback(result.usedFallback)
          setMode('official')
          if (result.usedFallback) {
            console.warn(`${dmvId}: AcroForm fields not found, used coordinate overlay.`)
            console.info('Fields not found:', result.fieldsNotFound)
          } else {
            console.info(`${dmvId}: Filled ${result.fieldsFilled.length} AcroForm fields`)
          }
        })
        .catch(err => {
          setErrorMsg(err.message)
          setMode('error')
        })
    } else {
      // Use react-pdf generated form (BOS, FTC)
      setMode('generated')
    }
  }, [open, formType, deal])

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => { if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current) }
  }, [])

  if (!open) return null

  const handlePrint = () => {
    if (mode === 'official' && blobUrl) {
      // Print the iframe showing the official form
      const iframe = document.getElementById('dmv-form-iframe') as HTMLIFrameElement
      iframe?.contentWindow?.print()
    } else {
      // Print the PDFViewer iframe
      const iframes = document.querySelectorAll('iframe')
      iframes.forEach(iframe => {
        try { iframe.contentWindow?.print() } catch { /* ignore */ }
      })
    }
  }

  const renderDoc = () => {
    const type = formType as PDFFormType
    switch (type) {
      case 'bill_of_sale':     return <BillOfSalePDF deal={deal} />
      case 'mvr180':           return <MVR180PDF deal={deal} />
      case 'mvr181':           return <MVR181PDF deal={deal} />
      case 'ftc_buyers_guide': return <FTCBuyersGuidePDF deal={deal} />
      case 'mvr1':             return <MVR1PDF deal={deal} />
      case 'mvr2':             return <MVR2PDF deal={deal} />
      default:                 return <BillOfSalePDF deal={deal} />
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl flex flex-col w-full max-w-4xl h-[92vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 flex-shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-gray-900">{FORM_LABELS[formType]}</h2>
              {mode === 'official' && !usedFallback && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-green-50 text-green-700 border border-green-200">
                  Official NC DMV Form
                </span>
              )}
              {mode === 'official' && usedFallback && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                  Official Form · Overlay Mode
                </span>
              )}
              {mode === 'generated' && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                  Generated Form
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5 font-mono truncate">
              Deal {deal.deal_number} · {deal.vin}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-3">
            {mode !== 'loading' && mode !== 'error' && (
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 bg-brand-400 hover:bg-brand-600 text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors"
              >
                <Printer size={14} />
                Print Form
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 relative bg-gray-100 rounded-b-2xl overflow-hidden">

          {/* Loading */}
          {mode === 'loading' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 z-10">
              <Loader2 size={28} className="animate-spin text-brand-400 mb-3" />
              <p className="text-sm font-medium text-gray-700">Loading official NC DMV form...</p>
              <p className="text-xs text-gray-400 mt-1">Filling with deal data</p>
            </div>
          )}

          {/* Error — form PDF not found */}
          {mode === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 p-8">
              <div className="max-w-md text-center">
                <AlertTriangle size={36} className="mx-auto text-amber-400 mb-4" />
                <p className="text-sm font-semibold text-gray-800 mb-2">Official Form Not Found</p>
                <p className="text-xs text-gray-500 mb-4 leading-relaxed">{errorMsg}</p>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left text-xs text-amber-800 space-y-2">
                  <p className="font-semibold">Setup Steps:</p>
                  <p>1. Download <strong>{toDMVFormId(formType)}.pdf</strong> from NC DMV website</p>
                  <p>2. Place it in <code className="bg-amber-100 px-1 rounded">public/forms/</code> in your project</p>
                  <p>3. Redeploy to Vercel</p>
                  <a
                    href="https://www.ncdot.gov/dmv/title-registration/titles/Pages/forms.aspx"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-blue-600 hover:underline mt-2"
                  >
                    <FileText size={12} />
                    Open NC DMV Forms Page →
                  </a>
                </div>
                <p className="text-xs text-gray-400 mt-4">Using generated form as fallback:</p>
                <button
                  onClick={() => setMode('generated')}
                  className="mt-2 btn-secondary text-xs px-4 py-2"
                >
                  View Generated Form Instead
                </button>
              </div>
            </div>
          )}

          {/* Official form in iframe */}
          {mode === 'official' && blobUrl && (
            <iframe
              id="dmv-form-iframe"
              src={blobUrl}
              width="100%"
              height="100%"
              style={{ border: 'none', display: 'block' }}
              title={FORM_LABELS[formType]}
            />
          )}

          {/* Generated react-pdf form */}
          {mode === 'generated' && (
            <PDFViewer width="100%" height="100%" showToolbar={false}>
              {renderDoc()}
            </PDFViewer>
          )}

        </div>
      </div>
    </div>
  )
}
