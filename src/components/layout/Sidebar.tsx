import {
  LayoutDashboard, Car, FileText, Users, TrendingUp,
  ClipboardList, Settings, ChevronRight
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
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-400 flex items-center justify-center">
            <span className="text-white text-xs font-bold font-mono">DMS</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 leading-none">NC DMS Pro</p>
            <p className="text-xs text-gray-400 mt-0.5 font-mono">v1.0.0</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon
          const isActive = currentPage === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`nav-item w-full text-left ${isActive ? 'active' : ''}`}
            >
              <Icon size={16} className="flex-shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span className="badge-nc-red text-[9px] px-1.5 py-0">{item.badge}</span>
              )}
              {isActive && <ChevronRight size={14} className="opacity-40" />}
            </button>
          )
        })}
      </nav>

      {/* Dealer info */}
      <div className="px-4 py-4 border-t border-gray-100">
        <div className="text-xs text-gray-400 font-mono mb-1">DEALER</div>
        <div className="text-sm font-medium text-gray-800 truncate">Triangle Motors</div>
        <div className="text-xs text-gray-400 font-mono">NC #12345</div>
        <button className="mt-3 w-full nav-item text-xs">
          <Settings size={13} />
          Settings
        </button>
      </div>
    </aside>
  )
}
