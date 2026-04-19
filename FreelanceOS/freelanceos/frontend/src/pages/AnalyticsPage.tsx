import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from 'recharts'
import { analyticsApi } from '../api'
import { PageLoader, SectionHeader, StatCard } from '../components/UI'
import { formatCurrency, formatCurrencyCompact } from '../utils'
import { TrendingUp, Clock, DollarSign, Target, Percent, Award, AlertCircle } from 'lucide-react'

const PIE_COLORS = ['#4F46E5','#0EA5E9','#10B981','#F59E0B','#EC4899','#8B5CF6','#06B6D4','#F97316']

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-card-md p-3 text-xs">
      <p className="font-semibold text-slate-900 mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full dynamic-bg" style={{ '--dynamic-bg-color': p.color } as React.CSSProperties} />
          <span className="text-slate-600 capitalize">{p.name}:</span>
          <span className="font-semibold text-slate-900">
            {typeof p.value === 'number' && p.value > 100
              ? formatCurrency(p.value)
              : `${p.value}`}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)

  const fetchData = (y: number) => {
    setLoading(true)
    setError(null)
    analyticsApi.get(y)
      .then((r) => setData(r.data))
      .catch((err) => {
        console.error('Analytics fetch error:', err)
        const msg = err?.response?.data?.detail || err?.message || 'Failed to load analytics data.'
        setError(msg)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchData(year) }, [year])

  if (loading) return <PageLoader />

  if (error || !data) {
    return (
      <div className="flex-1 flex items-center justify-center h-full min-h-64 p-8">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} className="text-red-400" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">Analytics Unavailable</h2>
          <p className="text-sm text-slate-500 mb-6">
            {error || 'Could not load analytics data. Please check that the backend is running.'}
          </p>
          <button
            onClick={() => fetchData(year)}
            className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold text-sm transition-all"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const safeData = {
    revenue_by_month: data?.revenue_by_month || [],
    revenue_by_client: data?.revenue_by_client || [],
    time_by_project: data?.time_by_project || [],
    expenses_by_category: data?.expenses_by_category || [],
    invoice_status_breakdown: data?.invoice_status_breakdown || [],
    utilization_rate: Number(data?.utilization_rate ?? 0),
    avg_project_value: Number(data?.avg_project_value ?? 0),
    avg_hourly_rate: Number(data?.avg_hourly_rate ?? 0),
    total_revenue_ytd: Number(data?.total_revenue_ytd ?? 0),
    total_expenses_ytd: Number(data?.total_expenses_ytd ?? 0),
    net_profit_ytd: Number(data?.net_profit_ytd ?? 0),
  }

  const expensePieData = safeData.expenses_by_category.map((c: any, i: number) => ({
    name: c.label,
    value: Number(c.amount || 0),
    color: PIE_COLORS[i % PIE_COLORS.length],
  }))

  const invoicePieData = safeData.invoice_status_breakdown.map((s: any) => ({
    name: s.label,
    value: Number(s.total || 0),
    color: s.color,
  }))

  return (
    <div className="page-container space-y-6 max-w-[1600px]">
      <SectionHeader
        title="Analytics"
        description="Financial performance and business insights"
        action={
          <select
            value={year}
            title="Filter by year"
            onChange={(e) => setYear(Number(e.target.value))}
            className="select-field w-auto py-2">
            {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        }
      />

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Revenue YTD"
          value={formatCurrencyCompact(safeData.total_revenue_ytd)}
          icon={<DollarSign size={20} />}
          iconBg="bg-emerald-100"
          accent="text-emerald-700"
        />
        <StatCard
          title="Expenses YTD"
          value={formatCurrencyCompact(safeData.total_expenses_ytd)}
          icon={<TrendingUp size={20} />}
          iconBg="bg-red-100"
          accent="text-red-700"
        />
        <StatCard
          title="Net Profit"
          value={formatCurrencyCompact(safeData.net_profit_ytd)}
          icon={<Award size={20} />}
          iconBg={safeData.net_profit_ytd >= 0 ? 'bg-brand-100' : 'bg-red-100'}
          accent={safeData.net_profit_ytd >= 0 ? 'text-brand-700' : 'text-red-700'}
        />
        <StatCard
          title="Avg Hourly Rate"
          value={`$${safeData.avg_hourly_rate}/hr`}
          icon={<Clock size={20} />}
          iconBg="bg-blue-100"
          accent="text-blue-700"
        />
        <StatCard
          title="Utilization Rate"
          value={`${safeData.utilization_rate}%`}
          icon={<Percent size={18} />}
          iconBg="bg-purple-50"
          accent="text-purple-700"
        />
        <StatCard
          title="Avg Project Value"
          value={formatCurrencyCompact(safeData.avg_project_value)}
          icon={<Target size={18} />}
          iconBg="bg-amber-50"
          accent="text-amber-700"
        />
      </div>

      {/* Revenue vs Expenses Chart */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-bold text-slate-900 font-display">Revenue vs Expenses vs Profit</h3>
            <p className="text-sm text-slate-500">Monthly breakdown for {year}</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={safeData.revenue_by_month} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false}
              tickFormatter={(v) => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
            <Bar dataKey="revenue"  fill="#4F46E5" radius={[4, 4, 0, 0]} name="Revenue" />
            <Bar dataKey="expenses" fill="#F59E0B" radius={[4, 4, 0, 0]} name="Expenses" />
            <Bar dataKey="profit"   fill="#10B981" radius={[4, 4, 0, 0]} name="Profit" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Time Tracked + Revenue by Client Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Hours by Month */}
        <div className="card p-5">
          <h3 className="font-bold text-slate-900 mb-4 font-display">Hours Tracked by Month</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={safeData.revenue_by_month}>
              <defs>
                <linearGradient id="hoursGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4F46E5" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#4F46E5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `${v}h`} />
              <Tooltip formatter={(v: any) => `${v}h`} />
              <Area type="monotone" dataKey="hours" stroke="#4F46E5" strokeWidth={2.5}
                fill="url(#hoursGrad)" dot={false} activeDot={{ r: 4 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue by Client */}
        {safeData.revenue_by_client.length > 0 && (
          <div className="card p-5">
            <h3 className="font-bold text-slate-900 mb-4 font-display">Revenue by Client ({year})</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={safeData.revenue_by_client.slice(0, 6)}
                layout="vertical"
                margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => `$${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                <YAxis type="category" dataKey="client_name" tick={{ fontSize: 11, fill: '#475569' }}
                  axisLine={false} tickLine={false} width={100} />
                <Tooltip formatter={(v: any) => formatCurrency(v)} />
                <Bar dataKey="revenue" fill="#4F46E5" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Time by Project + Expense Breakdown Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Expenses by Category Pie */}
        {expensePieData.length > 0 && (
          <div className="card p-5">
            <h3 className="font-bold text-slate-900 mb-4 font-display">Expenses by Category</h3>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={expensePieData} cx="50%" cy="50%"
                  innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                  {expensePieData.map((e: any, i: number) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip formatter={(v: any) => formatCurrency(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Invoice Status Pie */}
        {invoicePieData.length > 0 && (
          <div className="card p-5">
            <h3 className="font-bold text-slate-900 mb-4 font-display">Invoice Status</h3>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={invoicePieData} cx="50%" cy="50%"
                  innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                  {invoicePieData.map((e: any, i: number) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip formatter={(v: any) => formatCurrency(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Time by Project */}
        {safeData.time_by_project.length > 0 && (
          <div className="card p-5">
            <h3 className="font-bold text-slate-900 mb-4 font-display">Time by Project</h3>
            <div className="space-y-3">
              {safeData.time_by_project.slice(0, 7).map((p: any) => {
                const totalHours = safeData.time_by_project.reduce((s: number, x: any) => s + Number(x.hours || 0), 0)
                const pct = totalHours > 0 ? Math.round((Number(p.hours || 0) / totalHours) * 100) : 0
                return (
                  <div key={p.project_id}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-700 font-medium truncate">{p.project_name}</span>
                      <span className="text-slate-500 ml-2 flex-shrink-0">{Number(p.hours || 0).toFixed(1)}h ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, backgroundColor: p.color || '#4F46E5' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
