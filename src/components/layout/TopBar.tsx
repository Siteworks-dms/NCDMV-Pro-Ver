import { Bell, Search } from 'lucide-react'
import type { AppPage } from '@/App'

const PAGE_TITLES: Record<AppPage, { title: string; subtitle: string }> = {
  dashboard:  { title: 'Quick-Close',   subtitle: 'Active deals & NC form status' },
  inventory:  { title: 'Inventory',     subtitle: 'Vehicle stock management' },
  deals:      { title: 'Deal Desk',     subtitle: 'Sales transactions & F&I' },
  customers:  { title: 'Customers',     subtitle: 'Buyer & seller records' },
  leads:      { title: 'CRM Leads',     subtitle: 'Pipeline & follow-ups' },
  ncforms:    { title: 'NC DMV Forms',  subtitle: 'MVR-1, MVR-180, MVR-181, MVR-2, FTC' },
  settings:   { title: 'Business Profile', subtitle: 'Dealership info · Fee defaults · NC compliance' },
}

interface TopBarProps {
  currentPage: AppPage
}

export default function TopBar({ currentPage }: TopBarProps) {
  const { title, subtitle } = PAGE_TITLES[currentPage]

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
        <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
      </div>
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden sm:block">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search VIN, customer, deal..."
            className="input-base pl-8 pr-4 py-1.5 w-56 text-xs"
          />
        </div>
        {/* Notifications */}
        <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <Bell size={16} className="text-gray-500" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-nc-red-600 rounded-full" />
        </button>
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center">
          <span className="text-brand-800 text-xs font-semibold">JN</span>
        </div>
      </div>
    </header>
  )
}
