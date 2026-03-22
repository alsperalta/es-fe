import { Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { useLocation } from 'react-router-dom'
import Sidebar from './components/layout/Sidebar'
import { ErrorBoundary, Toast, LoadingPage } from './components/ui/index'
import { useToast } from './hooks/useToast'
import { useQuotations } from './hooks/useApi'

const Dashboard    = lazy(() => import('./components/pages/Dashboard'))
const PackagesPage = lazy(() => import('./components/pages/PackagesPage'))
const QuotesPage   = lazy(() => import('./components/pages/QuotesPage'))
const ClientsPage  = lazy(() => import('./components/pages/ClientsPage'))
const PricingPage  = lazy(() => import('./components/pages/PricingPage'))
const Calculator   = lazy(() => import('./components/pages/Calculator'))
const Analytics    = lazy(() => import('./components/pages/Analytics'))
const NotFound     = lazy(() => import('./components/pages/NotFound'))

const PAGE_META = {
  '/':           { title: 'Dashboard',        sub: 'Business Overview' },
  '/packages':   { title: 'Packages',          sub: 'Base Package Management' },
  '/quotes':     { title: 'Quotations',        sub: 'Quote Management' },
  '/clients':    { title: 'Clients',           sub: 'Client Directory' },
  '/pricing':    { title: 'Pricing Tool',      sub: 'Cost · Breakdown · Margins' },
  '/calculator': { title: 'Solar Calculator',  sub: 'System Sizer & ROI Projection' },
  '/analytics':  { title: 'Analytics',         sub: 'Reports & Insights' },
}

function Topbar() {
  const { pathname } = useLocation()
  const meta = PAGE_META[pathname] ?? { title: 'SolarPro', sub: '' }
  return (
    <div className="topbar">
      <div>
        <div className="page-title">{meta.title}</div>
        <div className="page-sub">{meta.sub}</div>
      </div>
      <div style={{
        fontSize: 12, color: 'var(--text2)',
        background: 'var(--input)', padding: '6px 14px',
        borderRadius: 20, border: '1px solid var(--border)',
      }}>
        ☀ SolarPro Solutions
      </div>
    </div>
  )
}

export default function App() {
  const { toast, showToast, clearToast } = useToast()

  const { data: quotes = [] } = useQuotations()
  const pendingCount = quotes.filter(q => q.status === 'SENT').length

  return (
    <div className="app">
      <Sidebar pendingQuotes={pendingCount}/>

      <main className="main">
        <Topbar/>
        <div className="content">
          <ErrorBoundary>
            <Suspense fallback={<LoadingPage/>}>
              <Routes>
                <Route path="/"           element={<Dashboard    toast={showToast}/>}/>
                <Route path="/packages"   element={<PackagesPage toast={showToast}/>}/>
                <Route path="/quotes"     element={<QuotesPage   toast={showToast}/>}/>
                <Route path="/clients"    element={<ClientsPage  toast={showToast}/>}/>
                <Route path="/pricing"    element={<PricingPage  toast={showToast}/>}/>
                <Route path="/calculator" element={<Calculator   toast={showToast}/>}/>
                <Route path="/analytics"  element={<Analytics/>}/>
                <Route path="/404"        element={<NotFound/>}/>
                <Route path="*"           element={<Navigate to="/404" replace/>}/>
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </div>
      </main>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={clearToast}/>}
    </div>
  )
}
