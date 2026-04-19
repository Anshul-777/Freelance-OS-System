import { useEffect, useState } from 'react'
import { invoicesApi } from '../api'
import { PageLoader, SectionHeader } from '../components/UI'
import { formatCurrency, formatDate } from '../utils'
import toast from 'react-hot-toast'
import { TrendingUp, DollarSign, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { format, subMonths } from 'date-fns'

export default function InvoicesAnalyticsPage() {
  const [analytics, setAnalytics] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState({
    start: format(subMonths(new Date(), 3), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd'),
  })

  const loadAnalytics = async () => {
    try {
      const res = await invoicesApi.getAnalytics({
        start_date: dateRange.start,
        end_date: dateRange.end,
      })
      setAnalytics(res.data)
    } catch (e) {
      toast.error('Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAnalytics()
  }, [dateRange])

  if (loading) return <PageLoader />
  if (!analytics) return <div className="text-center py-12">No data available</div>

  return (
    <div className="page-container space-y-6 max-w-[1600px]">
      <SectionHeader
        title="Invoice Analytics"
        description="Track revenue, payment trends, and customer performance"
      />

      {/* Date Range Filter */}
      <div className="card p-4 flex items-end gap-4">
        <div>
          <label className="label text-sm">From Date</label>
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
            className="input w-40"
          />
        </div>
        <div>
          <label className="label text-sm">To Date</label>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
            className="input w-40"
          />
        </div>
        <button onClick={loadAnalytics} className="btn btn-primary">
          Update
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-5 gap-4">
        <div className="card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase">Total Invoiced</span>
            <TrendingUp size={18} className="text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(analytics.total_invoiced)}</p>
          <p className="text-xs text-gray-500">{analytics.invoice_count} invoices</p>
        </div>

        <div className="card p-4 space-y-2 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase">Paid</span>
            <CheckCircle size={18} className="text-green-500" />
          </div>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(analytics.total_paid)}</p>
          <p className="text-xs text-gray-500">
            {analytics.total_invoiced > 0 
              ? `${Math.round((analytics.total_paid / analytics.total_invoiced) * 100)}% collected`
              : 'N/A'
            }
          </p>
        </div>

        <div className="card p-4 space-y-2 border-l-4 border-amber-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase">Outstanding</span>
            <DollarSign size={18} className="text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-600">{formatCurrency(analytics.total_outstanding)}</p>
          <p className="text-xs text-gray-500">Awaiting payment</p>
        </div>

        <div className="card p-4 space-y-2 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase">Overdue</span>
            <AlertCircle size={18} className="text-red-500" />
          </div>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(analytics.total_overdue)}</p>
          <p className="text-xs text-gray-500">Past due</p>
        </div>

        <div className="card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase">Avg Invoice</span>
            <DollarSign size={18} className="text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-purple-600">{formatCurrency(analytics.average_invoice_value)}</p>
          <p className="text-xs text-gray-500">Average value</p>
        </div>
      </div>

      {/* Status Breakdown */}
      <div className="grid grid-cols-2 gap-6">
        {/* By Status */}
        <div className="card p-6">
          <h3 className="font-semibold text-lg text-gray-900 mb-4">By Status</h3>
          <div className="space-y-3">
            {Object.entries(analytics.by_status || {}).map(([status, count]: any) => (
              <div key={status} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-medium text-gray-700 capitalize">{status}</span>
                <span className="text-lg font-bold text-gray-900">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Aging */}
        <div className="card p-6">
          <h3 className="font-semibold text-lg text-gray-900 mb-4">Payment Aging</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <span className="font-medium text-gray-700">0-30 days</span>
              <span className="text-lg font-bold text-green-600">{formatCurrency(analytics.payment_aging['0_30_days'])}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
              <span className="font-medium text-gray-700">30-60 days</span>
              <span className="text-lg font-bold text-amber-600">{formatCurrency(analytics.payment_aging['30_60_days'])}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <span className="font-medium text-gray-700">60+ days</span>
              <span className="text-lg font-bold text-red-600">{formatCurrency(analytics.payment_aging['60_plus_days'])}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Clients */}
      <div className="grid grid-cols-2 gap-6">
        {/* Top Clients */}
        {analytics.by_client && analytics.by_client.length > 0 && (
          <div className="card p-6">
            <h3 className="font-semibold text-lg text-gray-900 mb-4">Top Clients by Revenue</h3>
            <div className="space-y-3">
              {analytics.by_client
                .sort((a: any, b: any) => b.total_invoiced - a.total_invoiced)
                .slice(0, 5)
                .map((client: any, idx: number) => (
                  <div key={idx} className="space-y-1 pb-3 border-b last:border-b-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">{client.client_name}</span>
                      <span className="font-bold text-gray-900">{formatCurrency(client.total_invoiced)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span>Paid:</span>
                      <span className="text-green-600">{formatCurrency(client.total_paid)}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Top Projects */}
        {analytics.by_project && analytics.by_project.length > 0 && (
          <div className="card p-6">
            <h3 className="font-semibold text-lg text-gray-900 mb-4">Top Projects by Revenue</h3>
            <div className="space-y-3">
              {analytics.by_project
                .sort((a: any, b: any) => b.total_invoiced - a.total_invoiced)
                .slice(0, 5)
                .map((project: any, idx: number) => (
                  <div key={idx} className="space-y-1 pb-3 border-b last:border-b-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">{project.project_name}</span>
                      <span className="font-bold text-gray-900">{formatCurrency(project.total_invoiced)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span>Paid:</span>
                      <span className="text-green-600">{formatCurrency(project.total_paid)}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Summary Text */}
      <div className="card p-6 bg-gradient-to-br from-blue-50 to-indigo-50">
        <h3 className="font-semibold text-lg text-gray-900 mb-3">Summary</h3>
        <p className="text-gray-700 leading-relaxed">
          Between {formatDate(dateRange.start)} and {formatDate(dateRange.end)}, you've created{' '}
          <strong>{analytics.invoice_count}</strong> invoices totaling <strong>{formatCurrency(analytics.total_invoiced)}</strong>.
          You've collected <strong>{formatCurrency(analytics.total_paid)}</strong> ({analytics.total_invoiced > 0 ? Math.round((analytics.total_paid / analytics.total_invoiced) * 100) : 0}%),
          with <strong>{formatCurrency(analytics.total_outstanding)}</strong> still awaiting payment and{' '}
          <strong>{formatCurrency(analytics.total_overdue)}</strong> past due.
        </p>
      </div>
    </div>
  )
}
