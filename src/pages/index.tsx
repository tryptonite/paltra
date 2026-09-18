import React, { lazy, Suspense } from 'react'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

// Lazy load all pages for faster initial load and code splitting
const AdminDashboard = lazy(() => import('./AdminDashboard'))
const Auth = lazy(() => import('./Auth'))
const BTX = lazy(() => import('./BTX'))
const CallIns = lazy(() => import('./Call-Ins'))
const Changeovers = lazy(() => import('./Changeovers'))
const Dimensions = lazy(() => import('./Dimensions'))
const DockDoors = lazy(() => import('./DockDoors'))
const Help = lazy(() => import('./Help'))
const Layout = lazy(() => import('./Layout'))
const LineCounts = lazy(() => import('./Line-Counts'))
const LiveLoads = lazy(() => import('./LiveLoads'))
const OrderRequests = lazy(() => import('./OrderRequests'))
const Truckloads = lazy(() => import('./Truckloads'))
const UserApproval = lazy(() => import('./UserApproval'))
const Dashboard = lazy(() => import('./Dashboard'))

const PAGES = {
  Dashboard,
  Dimensions,
  LiveLoads,
  OrderRequests,
  BTX,
  'Call-Ins': CallIns,
  Truckloads,
  Changeovers,
  'Line-Counts': LineCounts,
  Help,
  DockDoors,
  AdminDashboard,
  UserApproval,
} as const

type PageKey = keyof typeof PAGES

// Cache page name lookups to avoid repeated string operations
const pageCache = new Map<string, PageKey>()

function getCurrentPage(url: string): PageKey {
  if (pageCache.has(url)) {
    return pageCache.get(url)!
  }
  
  const trimmed = url.endsWith('/') && url !== '/' ? url.slice(0, -1) : url
  const urlLastPart = trimmed.split('/').pop() ?? ''
  const sanitized = urlLastPart.split('?')[0]
  const pages = Object.keys(PAGES) as PageKey[]
  const match = pages.find((page) => page.toLowerCase() === sanitized.toLowerCase())
  const result = match ?? pages[0]
  
  // Cache the result for future use
  pageCache.set(url, result)
  return result
}

// Loading component for lazy-loaded pages
const PageLoading = () => (
  <div className="flex items-center justify-center h-64">
    <div className="text-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
      <p className="text-gray-600 text-sm">Loading page...</p>
    </div>
  </div>
)

function PagesContent(): React.JSX.Element {
  const location = useLocation()
  const { user, profile, loading } = useAuth()
  const currentPage = getCurrentPage(location.pathname)
  const [loadingTimeout, setLoadingTimeout] = React.useState(false)

  // Fallback timeout for loading state
  React.useEffect(() => {
    if (loading) {
      const timeout = setTimeout(() => {
        console.warn('PagesContent: Loading timeout reached, forcing app to load')
        setLoadingTimeout(true)
      }, 15000) // 15 second fallback
      
      return () => clearTimeout(timeout)
    }
  }, [loading])

  // Show loading spinner while checking authentication (with timeout fallback)
  if (loading && !loadingTimeout) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
      {/* <p className="text-xs text-gray-400 mt-2">If this takes too long, try refreshing the page</p> */}
        </div>
      </div>
    )
  }

  // Show auth page if user is not logged in
  if (!user) {
    console.log('PagesContent: No user, showing Auth page')
    return (
      <Suspense fallback={<PageLoading />}>
        <Routes>
          <Route path="*" element={<Auth />} />
        </Routes>
      </Suspense>
    )
  }

  // Show main app if user is logged in and approved
  return (
    <Suspense fallback={<PageLoading />}>
      <Layout currentPageName={currentPage}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/Dashboard" element={<Dashboard />} />
          <Route path="/Dimensions" element={<Dimensions />} />
          <Route path="/LiveLoads" element={<LiveLoads />} />
          <Route path="/OrderRequests" element={<OrderRequests />} />
          <Route path="/BTX" element={<BTX />} />
          <Route path="/Call-Ins" element={<CallIns />} />
          <Route path="/Truckloads" element={<Truckloads />} />
          <Route path="/Changeovers" element={<Changeovers />} />
          <Route path="/Line-Counts" element={<LineCounts />} />
          <Route path="/Help" element={<Help />} />
          <Route path="/DockDoors" element={<DockDoors />} />
          <Route path="/AdminDashboard" element={<AdminDashboard />} />
          <Route path="/UserApproval" element={<UserApproval />} />
        </Routes>
      </Layout>
    </Suspense>
  )
}

export default function Pages(): React.JSX.Element {
  return (
    <Router>
      <PagesContent />
    </Router>
  )
}
