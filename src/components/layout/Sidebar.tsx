import {
  LayoutDashboard, Car, FileText, Users, TrendingUp,
  ClipboardList, Settings as SettingsIcon, ChevronRight, Zap
} from 'lucide-react'
import type { AppPage } from '@/App'

interface SidebarProps {
  currentPage: AppPage
  onNavigate: (page: AppPage) => void
}

const NAV: { id: AppPage; label: string; icon: React.ElementType; badge?: string }[] = [
  { id: 'dashboard', label: 'Quick-Close',  icon: LayoutDashboard },
  { id: 'inventory', label: 'Inventory',    icon: Car },
  { id: 'deals',     label: 'Deal Desk',    icon: FileText },
  { id: 'customers', label: 'Customers',    icon: Users },
  { id: 'leads',     label: 'CRM Pipeline', icon: TrendingUp },
  { id: 'ncforms',   label: 'NC DMV Forms', icon: ClipboardList, badge: 'NC' },
]

export default function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-mark">
          <Zap size={16} color="#38bdf8" strokeWidth={2.5} />
        </div>
        <h1>NC DMS Pro</h1>
        <p>v1.0 · DEALER SYSTEM</p>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Navigation</div>
        {NAV.map(item => {
          const Icon = item.icon
          const active = currentPage === item.id
          return (
            <button key={item.id} onClick={() => onNavigate(item.id)}
              className={`nav-link ${active ? 'active' : ''}`}>
              <Icon size={15} style={{ flexShrink: 0, opacity: active ? 1 : 0.7 }} />
              {item.label}
              {item.badge
                ? <span className="nav-badge">{item.badge}</span>
                : active && <ChevronRight size={12} style={{ marginLeft: 'auto', opacity: 0.5 }} />
              }
            </button>
          )
        })}
      </nav>

      <div className="sidebar-bottom">
        <button onClick={() => onNavigate('settings')}
          className={`nav-link w-full mb-2 ${currentPage === 'settings' ? 'active' : ''}`}
          style={{ width: '100%' }}>
          <SettingsIcon size={15} style={{ opacity: 0.7, flexShrink: 0 }} />
          Settings
          {currentPage === 'settings' && <ChevronRight size={12} style={{ marginLeft: 'auto', opacity: 0.5 }} />}
        </button>
        <div className="dealer-chip">
          <div className="name">Triangle Motors LLC</div>
          <div className="license">NC #12345 · ELT</div>
        </div>
      </div>
    </aside>
  )
}
