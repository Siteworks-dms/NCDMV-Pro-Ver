import {
  LayoutDashboard, Car, FileText, Users, TrendingUp,
  ClipboardList, Settings as SettingsIcon, ChevronRight, Shield
} from 'lucide-react'
import type { AppPage } from '@/App'

interface SidebarProps {
  currentPage: AppPage
  onNavigate: (page: AppPage) => void
}

const NAV_ITEMS: { id: AppPage; label: string; icon: React.ElementType; badge?: string }[] = [
  { id: 'dashboard', label: 'Quick-Close',  icon: LayoutDashboard },
  { id: 'inventory', label: 'Inventory',    icon: Car },
  { id: 'deals',     label: 'Deal Desk',    icon: FileText },
  { id: 'customers', label: 'Customers',    icon: Users },
  { id: 'leads',     label: 'CRM Leads',   icon: TrendingUp },
  { id: 'ncforms',   label: 'NC DMV Forms', icon: ClipboardList, badge: 'NC' },
]

export default function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-mark">
          <Shield size={16} color="#fff" strokeWidth={2.5} />
        </div>
        <h1>NC DMS Pro</h1>
        <p>Dealer Management System</p>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Main Menu</div>
        {NAV_ITEMS.map(item => {
          const Icon = item.icon
          const isActive = currentPage === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`nav-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={16} className="nav-icon" />
              {item.label}
              {item.badge && (
                <span className="nav-badge">{item.badge}</span>
              )}
              {isActive && !item.badge && (
                <ChevronRight size={13} style={{ marginLeft: 'auto', opacity: 0.5 }} />
              )}
            </button>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="sidebar-bottom">
        <button
          onClick={() => onNavigate('settings')}
          className={`nav-link w-full mb-2 ${currentPage === 'settings' ? 'active' : ''}`}
          style={{ width: '100%' }}
        >
          <SettingsIcon size={16} className="nav-icon" />
          Settings
          {currentPage === 'settings' && (
            <ChevronRight size={13} style={{ marginLeft: 'auto', opacity: 0.5 }} />
          )}
        </button>
        <div className="dealer-chip">
          <div className="name">Triangle Motors LLC</div>
          <div className="license">NC Dealer #12345</div>
        </div>
      </div>
    </aside>
  )
}
