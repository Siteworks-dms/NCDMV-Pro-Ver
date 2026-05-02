import { Bell, Search, Settings, User } from 'lucide-react'
import type { AppPage } from '@/App'

const PAGE_TITLES: Record<AppPage, { title: string; subtitle: string }> = {
  dashboard: { title: 'Quick-Close',     subtitle: 'Active deals · NC form status · Title deadlines' },
  inventory: { title: 'Inventory',       subtitle: 'Vehicle stock · VIN decode · Frontline ready' },
  deals:     { title: 'Deal Desk',       subtitle: 'Bill of Sale · HUT calculation · F&I' },
  customers: { title: 'Customers',       subtitle: 'Buyer & seller records · ID documents' },
  leads:     { title: 'CRM Pipeline',   subtitle: 'Lead tracking · Follow-ups · Conversion' },
  ncforms:   { title: 'NC DMV Forms',   subtitle: 'MVR-1 · MVR-180 · MVR-181 · MVR-2 · FTC' },
  settings:  { title: 'Business Profile', subtitle: 'Dealership info · Fee defaults · Compliance' },
}

export default function TopBar({ currentPage }: { currentPage: AppPage }) {
  const { title, subtitle } = PAGE_TITLES[currentPage] ?? PAGE_TITLES.dashboard
  return (
    <header className="topbar">
      <div style={{ flexShrink: 0 }}>
        <div className="topbar-title">{title}</div>
        <div className="topbar-sub">{subtitle}</div>
      </div>

      <div className="search-bar">
        <Search size={14} className="icon" />
        <input placeholder="Search VIN, customer, deal number..." />
      </div>

      <div className="topbar-actions">
        <button className="icon-btn" title="Notifications"><Bell size={15} /></button>
        <button className="icon-btn" title="Settings"><Settings size={15} /></button>
        <div className="avatar"><User size={15} /></div>
      </div>
    </header>
  )
}
