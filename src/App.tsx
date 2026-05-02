import { useState } from 'react'
import { Toaster } from 'sonner'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import Dashboard from '@/pages/Dashboard'
import Inventory from '@/pages/Inventory'
import Deals from '@/pages/Deals'
import Customers from '@/pages/Customers'
import Leads from '@/pages/Leads'
import NCForms from '@/pages/NCForms'
import Settings from '@/pages/Settings'

import Sidebar from '@/components/layout/Sidebar'
import TopBar from '@/components/layout/TopBar'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 * 5, retry: 1 } },
})

export type AppPage = 'dashboard' | 'inventory' | 'deals' | 'customers' | 'leads' | 'ncforms' | 'settings'

export default function App() {
  const [currentPage, setCurrentPage] = useState<AppPage>('dashboard')

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':  return <Dashboard />
      case 'inventory':  return <Inventory />
      case 'deals':      return <Deals />
      case 'customers':  return <Customers />
      case 'leads':      return <Leads />
      case 'ncforms':    return <NCForms />
      case 'settings':   return <Settings />
      default:           return <Dashboard />
    }
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="app-shell">
        <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
        <div className="main-area">
          <TopBar currentPage={currentPage} />
          <main className="page-content">
            {renderPage()}
          </main>
        </div>
      </div>
      <Toaster
        position="top-right"
        richColors
        toastOptions={{
          style: {
            borderRadius: '12px',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: '13px',
          },
        }}
      />
    </QueryClientProvider>
  )
}
