import React from 'react'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

import AdminDashboard from './AdminDashboard'
import ApprovalWaiting from './ApprovalWaiting'
import Auth from './Auth'
import BTX from './BTX'
import CallIns from './Call-Ins'
import Changeovers from './Changeovers'
import Dimensions from './Dimensions'
import DockDoors from './DockDoors'
import Help from './Help'
import Layout from './Layout'
import LineCounts from './Line-Counts'
import LiveLoads from './LiveLoads'
import Truckloads from './Truckloads'
import UserApproval from './UserApproval'

const PAGES = {
  Dimensions,
  LiveLoads,
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

function getCurrentPage(url: string): PageKey {
  const trimmed = url.endsWith('/') && url !== '/' ? url.slice(0, -1) : url
  const urlLastPart = trimmed.split('/').pop() ?? ''
  const sanitized = urlLastPart.split('?')[0]
  const pages = Object.keys(PAGES) as PageKey[]
  const match = pages.find((page) => page.toLowerCase() === sanitized.toLowerCase())
  return match ?? pages[0]
}

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
          <p className="text-xs text-gray-400 mt-2">If this takes too long, try refreshing the page</p>
        </div>
      </div>
    )
  }

  // Show auth page if user is not logged in
  if (!user) {
    console.log('PagesContent: No user, showing Auth page')
    return (
      <Routes>
        <Route path="*" element={<Auth />} />
      </Routes>
    )
  }

  // Show approval waiting screen if user is not approved
  if (profile && profile.is_approved === false) {
    return <ApprovalWaiting />
  }

  // Show main app if user is logged in and approved
  return (
    <Layout currentPageName={currentPage}>
      <Routes>
        <Route path="/" element={<Dimensions />} />
        <Route path="/Dimensions" element={<Dimensions />} />
        <Route path="/LiveLoads" element={<LiveLoads />} />
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
  )
}

export default function Pages(): React.JSX.Element {
  return (
    <Router>
      <PagesContent />
    </Router>
  )
}
