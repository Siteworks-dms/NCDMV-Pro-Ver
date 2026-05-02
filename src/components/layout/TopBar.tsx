import { Bell, Search, Settings, Terminal } from 'lucide-react'
import type { AppPage } from '@/App'

const PAGE_TITLES: Record<AppPage, { title: string; subtitle: string }> = {
  dashboard: { title: 'Quick-Close',    subtitle: 'deal.status · nc_forms · title_deadlines' },
  inventory: { title: 'Inventory',      subtitle: 'vin_decode · stock · frontline_ready' },
  deals:     { title: 'Deal Desk',      subtitle: 'bos · hut_calc · fi_products' },
  customers: { title: 'Customers',      subtitle: 'buyer_records · id_docs · mvr_data' },
  leads:     { title: 'CRM Pipeline',  subtitle: 'stages · follow_up · conversion' },
  ncforms:   { title: 'NC DMV Forms',   subtitle: 'mvr1 · mvr180 · mvr181 · mvr2 · ftc' },
  settings:  { title: 'Business Profile', subtitle: 'dealer_info · fee_defaults · compliance' },
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
        <Search size={13} className="icon" />
        <input placeholder="Search VIN, customer, deal..." />
      </div>

      <div className="topbar-actions">
        <button className="icon-btn" title="Terminal">
          <Terminal size={14} />
        </button>
        <button className="icon-btn" title="Notifications">
          <Bell size={14} />
        </button>
        <button className="icon-btn" title="Settings">
          <Settings size={14} />
        </button>
        <div className="avatar">JN</div>
      </div>
    </header>
  )
}
