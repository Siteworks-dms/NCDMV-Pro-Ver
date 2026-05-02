import { X } from 'lucide-react'
import { type ReactNode, useEffect } from 'react'

export function Modal({ open, onClose, title, subtitle, children, width = 'max-w-2xl' }: {
  open: boolean; onClose: () => void; title: string; subtitle?: string; children: ReactNode; width?: string
}) {
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
          <button className="modal-close" onClick={onClose}><X size={14} /></button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}

export function Field({ label, required, hint, error, children }: {
  label: string; required?: boolean; hint?: string; error?: string; children: ReactNode
}) {
  return (
    <div>
      <label className="field-label">
        {label}{required && <span style={{ color: '#e05c5c', marginLeft: 2 }}>*</span>}
      </label>
      {children}
      {hint && !error && <p style={{ fontSize: 10.5, color: '#adb5c2', marginTop: 4 }}>{hint}</p>}
      {error && <p style={{ fontSize: 10.5, color: '#e05c5c', marginTop: 4 }}>{error}</p>}
    </div>
  )
}

export function SectionHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
      <h3 style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#7a8292' }}>{title}</h3>
      {children}
    </div>
  )
}

export function EmptyState({ icon: Icon, title, description, action }: {
  icon: React.ElementType; title: string; description: string; action?: ReactNode
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon"><Icon size={22} /></div>
      <p style={{ fontSize: 14, fontWeight: 700, color: '#7a8292' }}>{title}</p>
      <p style={{ fontSize: 12, color: '#adb5c2', marginTop: 5, maxWidth: 280 }}>{description}</p>
      {action && <div style={{ marginTop: 18 }}>{action}</div>}
    </div>
  )
}

export function StatCard({ label, value, sub, color = 'gray', icon: Icon }: {
  label: string; value: string | number; sub?: string; color?: string; icon?: React.ElementType
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

export function Currency({ value, className = '' }: { value: number | null | undefined; className?: string }) {
  if (value == null) return <span style={{ color: '#adb5c2' }}>—</span>
  return (
    <span className={`font-mono ${className}`}>
      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)}
    </span>
  )
}

export function NCBadge({ text = 'NC DMV' }: { text?: string }) {
  return <span className="badge badge-red">{text}</span>
}
