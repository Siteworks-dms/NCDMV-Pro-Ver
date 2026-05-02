import {
  LayoutDashboard, Car, FileText, Users, TrendingUp,
  ClipboardList, Settings as SettingsIcon, ChevronRight, Shield
} from 'lucide-react'
import type { AppPage } from '@/App'

interface SidebarProps {
  currentPage: AppPage
  onNavigate: (page: AppPage) => void
}

const NAV: { id: AppPage; label: string; icon: React.ElementType; badge?: string }[] = [
  { id: 'dashboard', label: 'Quick-Close',   icon: LayoutDashboard },
  { id: 'inventory', label: 'Inventory',     icon: Car },
  { id: 'deals',     label: 'Deal Desk',     icon: FileText },
  { id: 'customers', label: 'Customers',     icon: Users },
  { id: 'leads',     label: 'CRM Pipeline',  icon: TrendingUp },
  { id: 'ncforms',   label: 'NC DMV Forms',  icon: ClipboardList, badge: 'NC' },
]

export default function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-mark">
          <Shield size={20} color="#4a90d9" strokeWidth={2} />
        </div>
        <h1>NC DMS Pro</h1>
        <p>Dealer Management System</p>
      </div>

      {/* Nav */}
      <div className="sidebar-section-label">Navigation</div>
      <nav className="sidebar-nav">
        {NAV.map(item => {
          const Icon = item.icon
          const active = currentPage === item.id
          return (
            <button key={item.id} onClick={() => onNavigate(item.id)}
              className={`nav-link ${active ? 'active' : ''}`}>
              <Icon size={16} style={{ flexShrink: 0, opacity: active ? 1 : 0.65 }} />
              {item.label}
              {item.badge
                ? <span className="nav-badge">{item.badge}</span>
                : active && <ChevronRight size={13} style={{ marginLeft: 'auto', opacity: 0.4 }} />
              }
            </button>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="sidebar-bottom">
        <button onClick={() => onNavigate('settings')}
          className={`nav-link ${currentPage === 'settings' ? 'active' : ''}`}
          style={{ width: '100%' }}>
          <SettingsIcon size={16} style={{ opacity: 0.65, flexShrink: 0 }} />
          Settings
          {currentPage === 'settings' && <ChevronRight size={13} style={{ marginLeft: 'auto', opacity: 0.4 }} />}
        </button>
        <div className="dealer-chip">
          <div className="name">Triangle Motors LLC</div>
          <div className="license">NC #12345</div>
        </div>
      </div>
    </aside>
  )
}
