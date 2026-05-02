import { Bell, Search, Settings } from 'lucide-react'
import type { AppPage } from '@/App'

const PAGE_TITLES: Record<AppPage, { title: string; subtitle: string }> = {
  dashboard:  { title: 'Quick-Close',     subtitle: 'Active deals & NC form status' },
  inventory:  { title: 'Inventory',       subtitle: 'Vehicle stock management' },
  deals:      { title: 'Deal Desk',       subtitle: 'Sales transactions & F&I' },
  customers:  { title: 'Customers',       subtitle: 'Buyer & seller records' },
  leads:      { title: 'CRM Pipeline',   subtitle: 'Lead tracking & follow-ups' },
  ncforms:    { title: 'NC DMV Forms',   subtitle: 'MVR-1 · MVR-180 · MVR-181 · MVR-2 · FTC' },
  settings:   { title: 'Business Profile', subtitle: 'Dealership info · Fee defaults · NC compliance' },
}

interface TopBarProps { currentPage: AppPage }

export default function TopBar({ currentPage }: TopBarProps) {
  const { title, subtitle } = PAGE_TITLES[currentPage] ?? PAGE_TITLES.dashboard

  return (
    <header className="topbar">
      <div>
        <div className="topbar-title">{title}</div>
        <div className="topbar-sub">{subtitle}</div>
      </div>

      <div className="search-bar">
        <Search size={14} className="icon" />
        <input placeholder="Search VIN, customer, deal number..." />
      </div>

      <div className="topbar-actions">
        <button className="icon-btn" title="Notifications">
          <Bell size={16} />
        </button>
        <button className="icon-btn" title="Settings">
          <Settings size={16} />
        </button>
        <div className="avatar" title="Account">JN</div>
      </div>
    </header>
  )
}
