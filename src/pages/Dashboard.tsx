import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRightLeft, ClipboardList, Download, Package, Plane, Truck, BarChart3 } from 'lucide-react'
import { CallIn, Changeover, Dimension, LiveLoad, Truckload, BTX } from '@/api/entities'
import { useEffect, useState } from 'react'
import { getLineCounts } from '@/api/vLineCounts'

const activityIcons: Record<string, any> = {
  Dimensions: Package,
  LiveLoads: Truck,
  CallIns: ClipboardList,
  Changeovers: ArrowRightLeft,
  Truckloads: Download,
  BTX: Plane,
  LineCounts: BarChart3,
}

const formatInEST = (dateString: string) => {
  return new Date(dateString).toLocaleString('en-US', {
    timeZone: 'America/New_York',
    month: 'numeric',
    day: 'numeric',
    year: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
  })
}

const fetchRecentActivity = async () => {
  const [dimensions, liveLoads, callIns, changeovers, truckloads, btx, lineCounts] = await Promise.all([
    Dimension.list('-created_date', 5),
    LiveLoad.list('-created_date', 5),
    CallIn.list('-created_date', 5),
    Changeover.list('-created_date', 5),
    Truckload.list('-created_date', 5),
    BTX.list('-created_date', 5),
    getLineCounts(5),
  ])

  const normalize = (items: any[], type: string) =>
    items.map((item) => ({
      id: item.id,
      type,
      created_by: item.created_by || item.submitted_by || 'unknown',
      created_date: item.created_date || item.updated_date || item.submitted_at,
    }))

  return [
    ...normalize(dimensions, 'Dimensions'),
    ...normalize(liveLoads, 'LiveLoads'),
    ...normalize(callIns, 'CallIns'),
    ...normalize(changeovers, 'Changeovers'),
    ...normalize(truckloads, 'Truckloads'),
    ...normalize(btx, 'BTX'),
    // Line Counts normalization (submitted_at + user_display)
    ...lineCounts.map((item: any) => ({
      id: item.id,
      type: 'LineCounts',
      created_by: item.user_display || 'Unknown User',
      created_date: item.submitted_at,
    })),
  ]
    .filter((item) => item.created_date)
    .sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime())
    .slice(0, 15)
}

export default function Dashboard() {
  const [recentActivity, setRecentActivity] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const load = async () => {
      setIsLoading(true)
      setErrorMessage(null)
      try {
        const activity = await fetchRecentActivity()
        if (isMounted) {
          setRecentActivity(activity)
        }
      } catch (error: any) {
        console.error('Dashboard: Failed to load recent activity', error)
        if (isMounted) {
          setErrorMessage(error?.message || 'Failed to load recent activity.')
          setRecentActivity([])
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    load()

    const interval = setInterval(load, 5 * 60 * 1000)

    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-600">Here is a snapshot of what has changed across the portal.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>The latest changes from every section you follow.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-slate-500 text-sm">Loading activity…</p>
          ) : errorMessage ? (
            <p className="text-red-500 text-sm">Unable to load activity right now. Please try again later.</p>
          ) : recentActivity.length === 0 ? (
            <p className="text-slate-500 text-sm">No recent activity yet.</p>
          ) : (
            <ul className="space-y-3">
              {recentActivity.map((item) => {
                const Icon = activityIcons[item.type] ?? Package
                return (
                  <li key={`${item.type}-${item.id}`} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-200 rounded-full">
                        <Icon className="h-4 w-4 text-slate-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          {item.type} updated by <span className="font-semibold">{item.created_by.split('@')[0] || 'user'}</span>
                        </p>
                        <p className="text-xs text-slate-500">{formatInEST(item.created_date)}</p>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
