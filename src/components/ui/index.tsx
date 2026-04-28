import { X } from 'lucide-react'
import { type ReactNode, useEffect } from 'react'

// ── Modal ─────────────────────────────────────────────────────────────────

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
  width?: string
}

export function Modal({ open, onClose, title, subtitle, children, width = 'max-w-2xl' }: ModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${width} max-h-[90vh] flex flex-col`}>
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{title}</h2>
            {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <X size={16} />
          </button>
        </div>
        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

// ── Form field wrapper ────────────────────────────────────────────────────

interface FieldProps {
  label: string
  required?: boolean
  hint?: string
  error?: string
  children: ReactNode
}

export function Field({ label, required, hint, error, children }: FieldProps) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

// ── Section header ────────────────────────────────────────────────────────

export function SectionHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">{title}</h3>
      {children}
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────

export function EmptyState({ icon: Icon, title, description, action }: {
  icon: React.ElementType
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-3">
        <Icon size={22} className="text-gray-400" />
      </div>
      <p className="text-sm font-medium text-gray-700">{title}</p>
      <p className="text-xs text-gray-400 mt-1 max-w-xs">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// ── Stats card ────────────────────────────────────────────────────────────

export function StatCard({ label, value, sub, color = 'gray' }: {
  label: string
  value: string | number
  sub?: string
  color?: 'gray' | 'green' | 'amber' | 'red' | 'blue'
}) {
  const colors = {
    gray:  'bg-gray-50 text-gray-800',
    green: 'bg-green-50 text-green-800',
    amber: 'bg-amber-50 text-amber-800',
    red:   'bg-red-50 text-red-700',
    blue:  'bg-blue-50 text-blue-800',
  }
  return (
    <div className={`rounded-xl p-4 ${colors[color]}`}>
      <p className="text-xs font-medium uppercase tracking-wider opacity-60">{label}</p>
      <p className="text-2xl font-semibold font-mono mt-1">{value}</p>
      {sub && <p className="text-xs opacity-60 mt-0.5">{sub}</p>}
    </div>
  )
}

// ── NC Compliance badge ───────────────────────────────────────────────────

export function NCBadge({ text = 'NC DMV' }: { text?: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-red-50 text-red-700 border border-red-200">
      {text}
    </span>
  )
}

// ── Currency display ──────────────────────────────────────────────────────

export function Currency({ value, className = '' }: { value: number | null | undefined; className?: string }) {
  if (value == null) return <span className="text-gray-400">—</span>
  return (
    <span className={`font-mono ${className}`}>
      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)}
    </span>
  )
}
