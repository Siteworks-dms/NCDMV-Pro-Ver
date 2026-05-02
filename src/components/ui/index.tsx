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
    <div className="modal-overlay">
      <div className={`modal-box w-full ${width}`}>
        <div className="modal-header">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button className="modal-close" onClick={onClose}><X size={15} /></button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}

// ── Field ─────────────────────────────────────────────────────────────────
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
      <label className="field-label">
        {label}{required && <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>}
      </label>
      {children}
      {hint && !error && <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{hint}</p>}
      {error && <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{error}</p>}
    </div>
  )
}

// ── Section header ────────────────────────────────────────────────────────
export function SectionHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <h3 style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.7px', color: '#94a3b8' }}>{title}</h3>
      {children}
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────
export function EmptyState({ icon: Icon, title, description, action }: {
  icon: React.ElementType; title: string; description: string; action?: ReactNode
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon"><Icon size={22} /></div>
      <p style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>{title}</p>
      <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 6, maxWidth: 280 }}>{description}</p>
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────
export function StatCard({ label, value, sub, color = 'gray', icon: Icon }: {
  label: string; value: string | number; sub?: string; color?: 'gray' | 'green' | 'amber' | 'red' | 'blue'; icon?: React.ElementType
}) {
  return (
    <div className={`stat-card ${color}`}>
      {Icon && <div className="stat-icon"><Icon size={16} /></div>}
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  )
}

// ── NC Badge ──────────────────────────────────────────────────────────────
export function NCBadge({ text = 'NC DMV' }: { text?: string }) {
  return <span className="badge badge-red">{text}</span>
}

// ── Currency ──────────────────────────────────────────────────────────────
export function Currency({ value, className = '' }: { value: number | null | undefined; className?: string }) {
  if (value == null) return <span style={{ color: '#94a3b8' }}>—</span>
  return (
    <span style={{ fontFamily: "'JetBrains Mono', monospace" }} className={className}>
      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)}
    </span>
  )
}
