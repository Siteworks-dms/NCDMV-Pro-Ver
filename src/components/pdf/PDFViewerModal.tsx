import { useState } from 'react'
import { PDFViewer } from '@react-pdf/renderer'
import { X, Printer, Loader2 } from 'lucide-react'
import {
  BillOfSalePDF, MVR180PDF, MVR181PDF,
  FTCBuyersGuidePDF, MVR1PDF, MVR2PDF,
  type PDFFormType,
} from '@/lib/pdfForms'
import type { DealSummary, NCFormType } from '@/types/database'
import { FORM_LABELS } from '@/types/database'

interface PDFViewerModalProps {
  open: boolean
  onClose: () => void
  formType: NCFormType
  deal: DealSummary
}

export default function PDFViewerModal({ open, onClose, formType, deal }: PDFViewerModalProps) {
  const [ready, setReady] = useState(false)

  if (!open) return null

  const handlePrint = () => {
    // Trigger print on the PDFViewer iframe
    const iframes = document.querySelectorAll('iframe')
    let printed = false
    iframes.forEach(iframe => {
      if (!printed) {
        try {
          iframe.contentWindow?.print()
          printed = true
        } catch { /* ignore cross-origin */ }
      }
    })
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
          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              {FORM_LABELS[formType]}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5 font-mono">
              Deal {deal.deal_number} · {deal.vin}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-brand-400 hover:bg-brand-600 text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <Printer size={14} />
              Print Form
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* PDF Viewer */}
        <div className="flex-1 relative bg-gray-100 rounded-b-2xl overflow-hidden">
          {!ready && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 z-10 pointer-events-none">
              <Loader2 size={24} className="animate-spin text-brand-400 mb-3" />
              <p className="text-sm text-gray-500">Rendering PDF...</p>
            </div>
          )}

          <PDFViewer
            width="100%"
            height="100%"
            showToolbar={false}
          >
            {renderDoc()}
          </PDFViewer>

          {/* Ready trigger — PDFViewer doesn't expose onLoad so we use a timeout */}
          {!ready && (
            <div
              style={{ display: 'none' }}
              ref={() => { setTimeout(() => setReady(true), 1500) }}
            />
          )}
        </div>

      </div>
    </div>
  )
}
