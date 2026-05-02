import { X } from 'lucide-react'
import { type ReactNode, useEffect } from 'react'

// ── Modal ─────────────────────────────────────────────────────────────────
interface ModalProps {
  open: boolean; onClose: () => void; title: string; subtitle?: string; children: ReactNode; width?: string
}

export function Modal({ open, onClose, title, subtitle, children, width = 'max-w-2xl' }: ModalProps) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
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
          <button className="modal-close" onClick={onClose}><X size={13} /></button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}

// ── Field ─────────────────────────────────────────────────────────────────
export function Field({ label, required, hint, error, children }: {
  label: string; required?: boolean; hint?: string; error?: string; children: ReactNode
}) {
  return (
    <div>
      <label className="field-label">
        {label}{required && <span style={{ color: '#f87171', marginLeft: 2 }}>*</span>}
      </label>
      {children}
      {hint && !error && <p style={{ fontSize: 10, color: '#475569', marginTop: 4, fontFamily: "'Space Mono', monospace" }}>{hint}</p>}
      {error && <p style={{ fontSize: 10, color: '#f87171', marginTop: 4 }}>{error}</p>}
    </div>
  )
}

// ── Section header ────────────────────────────────────────────────────────
export function SectionHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <h3 style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.2px', color: '#475569', fontFamily: "'Space Mono', monospace" }}>{title}</h3>
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
      <div className="empty-icon"><Icon size={20} /></div>
      <p style={{ fontSize: 13, fontWeight: 500, color: '#94a3b8', fontFamily: "'Space Grotesk', sans-serif" }}>{title}</p>
      <p style={{ fontSize: 11, color: '#374151', marginTop: 5, maxWidth: 260 }}>{description}</p>
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────
export function StatCard({ label, value, sub, color = 'gray', icon: Icon }: {
  label: string; value: string | number; sub?: string; color?: string; icon?: React.ElementType
}) {
  return (
    <div className={`stat-card ${color}`}>
      {Icon && <div className="stat-icon"><Icon size={14} /></div>}
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  )
}

// ── Currency ──────────────────────────────────────────────────────────────
export function Currency({ value, className = '' }: { value: number | null | undefined; className?: string }) {
  if (value == null) return <span style={{ color: '#374151' }}>—</span>
  return (
    <span className={`font-mono ${className}`}>
      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)}
    </span>
  )
}

export function NCBadge({ text = 'NC DMV' }: { text?: string }) {
  return <span className="badge badge-red">{text}</span>
}
