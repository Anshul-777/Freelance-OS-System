import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  DollarSign, Clock, FolderOpen, FileText,
  TrendingUp, AlertCircle, Calendar, Users,
  Zap, ArrowUpRight, ArrowDownRight, MoreHorizontal,
  CheckCircle2, Plus, Search, Filter, MessageSquare,
  Star, Target, Sparkles, Coffee, ShieldCheck,
  Briefcase, MousePointer2, ExternalLink, Lightbulb,
  Activity, TrendingDown, Award
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie
} from 'recharts'
import { dashboardApi } from '../api'
import {
  PageLoader, ProgressBar,
} from '../components/UI'
import {
  formatCurrency, formatCurrencyCompact, formatDate,
  getInvoiceStatusClass, getDaysUntil, classNames, getInitials, getAvatarColor
} from '../utils'
import { useAuthStore } from '../store'
import toast from 'react-hot-toast'

// ─── Constants & Mock Assets ───────────────────────────────────────────────

const TIPS = [
  "Don't forget to track your expenses for tax season!",
  "Take a 5-minute break every hour to stay productive.",
  "Follow up on invoices that are more than 3 days overdue.",
  "Your best client is a happy client. Send a quick update!",
  "Review your project roadmap every Monday morning."
]

// ─── Sub-Components ─────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white/90 backdrop-blur-md border border-slate-200 rounded-xl shadow-card-lg p-3 text-xs animate-scale-in">
      <p className="font-bold text-slate-900 mb-2 border-b border-slate-100 pb-1">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center justify-between gap-4 mb-1.5 last:mb-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full dynamic-bg" style={{ '--dynamic-bg-color': p.color } as React.CSSProperties} />
            <span className="text-slate-600 font-medium capitalize">{p.name}:</span>
          </div>
          <span className="font-bold text-slate-900">{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

const SimpleStat = ({ title, value, trend, icon: Icon, colorClass }: any) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:border-slate-200 transition-all duration-300 group cursor-pointer hover:-translate-y-1">
    <div className="flex items-center justify-between mb-3">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-125 group-hover:shadow-lg ${colorClass}`}>
        <Icon size={24} />
      </div>
      {trend !== undefined && (
        <div className={`flex items-center gap-0.5 text-xs font-bold px-2.5 py-1 rounded-full transition-all ${trend >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
          {trend >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          {Math.abs(trend).toFixed(1)}%
        </div>
      )}
    </div>
    <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">{title}</p>
    <p className="text-2xl font-bold text-slate-900 font-display mt-1 group-hover:text-brand-600 transition-colors">{value}</p>
  </div>
)

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [activeTip, setActiveTip] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    dashboardApi.get()
      .then((r) => setData(r.data))
      .catch((err) => {
        console.error('Dashboard fetch error:', err)
        const msg = err?.response?.data?.detail || err?.message || 'Failed to load dashboard data.'
        setError(msg)
      })
      .finally(() => setLoading(false))

    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    const tipTimer = setInterval(() => {
      setActiveTip(prev => (prev + 1) % TIPS.length)
    }, 10000)

    return () => {
      clearInterval(timer)
      clearInterval(tipTimer)
    }
  }, [])

  const greeting = useMemo(() => {
    const hour = currentTime.getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 18) return 'Good Afternoon'
    return 'Good Evening'
  }, [currentTime])

  if (loading) return <PageLoader />

  if (error || !data) {
    return (
      <div className="flex-1 flex items-center justify-center h-full min-h-64 p-8">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={32} className="text-red-400" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-2">Dashboard Unavailable</h2>
          <p className="text-sm text-slate-500 mb-6">
            {error || 'Could not load dashboard data. Please check that the backend is running.'}
          </p>
          <button
            onClick={() => { setLoading(true); setError(null); dashboardApi.get().then(r => setData(r.data)).catch(e => setError(e?.response?.data?.detail || e?.message || 'Failed to load')).finally(() => setLoading(false)) }}
            className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold text-sm transition-all"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const {
    stats: rawStats = {},
    revenue_chart = [],
    recent_activity = [],
    top_clients = [],
    upcoming_deadlines = [],
  } = data || {}

  const stats = {
    total_revenue_this_month: Number(rawStats.total_revenue_this_month ?? 0),
    total_revenue_last_month: Number(rawStats.total_revenue_last_month ?? 0),
    revenue_change_pct: Number(rawStats.revenue_change_pct ?? 0),
    total_hours_this_month: Number(rawStats.total_hours_this_month ?? 0),
    total_hours_last_month: Number(rawStats.total_hours_last_month ?? 0),
    hours_change_pct: Number(rawStats.hours_change_pct ?? 0),
    active_projects: Number(rawStats.active_projects ?? 0),
    total_clients: Number(rawStats.total_clients ?? 0),
    outstanding_invoices: Number(rawStats.outstanding_invoices ?? 0),
    outstanding_count: Number(rawStats.outstanding_count ?? 0),
    total_expenses_this_month: Number(rawStats.total_expenses_this_month ?? 0),
    net_income_this_month: Number(rawStats.net_income_this_month ?? 0),
  }

  const topClientTotal = (top_clients as any[]).reduce((s: number, c: any) => s + Number(c.total_paid || 0), 0) || 1

  return (
    <div className="page-container max-w-[1700px] animate-fade-in p-0 pt-6 px-6">
      
      {/* ─── Hero Section ──────────────────────────────────────────────────── */}
      <div className="relative mb-8 rounded-3xl overflow-hidden h-72 lg:h-80 shadow-card-lg animate-slide-up">
        {/* Background Image */}
        <img 
          src="/images/dashboard-hero.png" 
          alt="Hero background"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Overlay Gradients */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent pointer-events-none" />

        {/* Content */}
        <div className="absolute inset-0 flex flex-col justify-center px-8 lg:px-12 z-10">
          <div className="flex items-center gap-4 mb-4">
             {user?.avatar_url ? (
                <div className="w-14 h-14 rounded-xl border-4 border-white/20 shadow-xl overflow-hidden flex-shrink-0">
                  <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
                </div>
             ) : (
                <div className="avatar w-14 h-14 border-4 border-white/20 shadow-xl text-xl dynamic-bg" style={{ '--dynamic-bg-color': getAvatarColor(user?.full_name || '') } as React.CSSProperties}>
                  {getInitials(user?.full_name || '?')}
                </div>
             )}
             <div>
                <span className="inline-flex items-center gap-2 px-3 py-1 bg-brand-500/20 backdrop-blur-md border border-brand-400/30 text-brand-100 text-[10px] font-bold uppercase tracking-widest rounded-full mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Premium Workspace
                </span>
                <h1 className="text-3xl lg:text-4xl font-bold font-display text-white">
                  {greeting}, <span className="text-brand-300">{user?.full_name?.split(' ')[0] || 'User'}!</span>
                </h1>
             </div>
          </div>
          
          <p className="text-slate-300 max-w-lg text-sm lg:text-base leading-relaxed mb-8">
            You have <span className="text-white font-bold">{stats.active_projects} active projects</span> and <span className="text-white font-bold">{stats.outstanding_count} pending invoices</span>. 
            Your revenue is up <span className="text-emerald-400 font-bold">{stats.revenue_change_pct}%</span> this month. Keep it up!
          </p>

          <div className="flex flex-wrap gap-3">
             <button 
               onClick={() => navigate('/app/projects')}
               className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-brand-500/30 transition-all active:scale-95 hover:shadow-brand-500/50 flex items-center gap-2 group">
               <Plus size={18} className="group-hover:rotate-90 transition-transform" /> New Project
             </button>
             <button 
               onClick={() => toast.success('Take a 5-minute break! You deserve it 🌟')}
               className="px-5 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/20 rounded-xl font-bold text-sm transition-all hover:border-white/40 flex items-center gap-2 group">
               <Coffee size={18} className="group-hover:scale-110 transition-transform" /> Take Break
             </button>
          </div>
        </div>

        {/* Time Widget */}
        <div className="absolute top-8 right-8 hidden xl:flex flex-col items-end text-white z-10">
           <p className="text-4xl font-bold font-display">{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
           <p className="text-slate-300 font-medium">{currentTime.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>

      {/* ─── Main 3-Column Layout ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Analytics & Invoices (Col 1-8) */}
        <div className="xl:col-span-8 space-y-6">
          
          {/* Detailed Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SimpleStat 
              title="Revenue" 
              value={formatCurrencyCompact(stats.total_revenue_this_month)} 
              trend={stats.revenue_change_pct} 
              icon={TrendingUp} 
              colorClass="bg-emerald-100 text-emerald-600" 
            />
            <SimpleStat 
              title="Expenses" 
              value={formatCurrencyCompact(stats.total_expenses_this_month)} 
              icon={ArrowDownRight} 
              colorClass="bg-red-100 text-red-600" 
            />
            <SimpleStat 
              title="Billable Hours" 
              value={`${stats.total_hours_this_month}h`} 
              trend={stats.hours_change_pct} 
              icon={Clock} 
              colorClass="bg-blue-100 text-blue-600" 
            />
            <SimpleStat 
              title="Net Profile" 
              value={formatCurrencyCompact(stats.net_income_this_month)} 
              icon={Star} 
              colorClass="bg-purple-100 text-purple-600" 
            />
          </div>

          {/* Growth Chart Container */}
          <div className="card p-6 min-h-[400px]">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-xl font-bold text-slate-900 font-display">Financial Pulse</h2>
                <p className="text-xs text-slate-500">Revenue and expenses trend over the last 6 months</p>
              </div>
              <div className="flex gap-2">
                <span className="flex items-center gap-1.5 px-3 py-1 bg-brand-50 text-brand-700 text-[10px] font-bold rounded-lg border border-brand-100">
                  REVENUE
                </span>
                <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 text-[10px] font-bold rounded-lg border border-amber-100">
                  EXPENSES
                </span>
              </div>
            </div>
            
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenue_chart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 11 }} 
                    dy={10} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    tickFormatter={(v) => `$${v}`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#4F46E5" 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#colorRev)" 
                    animationDuration={1500}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="expenses" 
                    stroke="#F59E0B" 
                    strokeWidth={2} 
                    strokeDasharray="5 5"
                    fillOpacity={1} 
                    fill="url(#colorExp)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Top Clients - Visual Distribution */}
            <div className="card p-6 hover:shadow-lg transition-all duration-300 h-full flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-slate-900 font-display">Client Impact</h3>
                <Sparkles size={20} className="text-brand-500 animate-pulse" />
              </div>
              <div className="space-y-3 flex-1">
                {top_clients.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-6">No clients yet. Add your first client to get started!</p>
                ) : (
                  <>
                    {top_clients.map((client: any, i: number) => (
                      <div 
                        key={client.id} 
                        onClick={() => navigate('/app/clients')}
                        className="group p-4 rounded-xl hover:bg-brand-50 transition-all duration-200 cursor-pointer border border-transparent hover:border-brand-200">
                        <div className="flex justify-between items-center mb-3">
                           <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="w-3 h-3 rounded-full dynamic-bg group-hover:scale-125 transition-transform flex-shrink-0" style={{ '--dynamic-bg-color': client.color } as React.CSSProperties} />
                              <p className="text-sm font-semibold text-slate-800 group-hover:text-brand-600 transition-colors truncate">{client.name}</p>
                           </div>
                           <p className="text-xs font-bold text-slate-900 group-hover:text-brand-600 transition-colors whitespace-nowrap ml-2">{formatCurrencyCompact(client.total_paid)}</p>
                        </div>
                        <ProgressBar 
                          value={client.total_paid} 
                          max={topClientTotal} 
                          height="h-2"
                          color={['bg-brand-500', 'bg-emerald-500', 'bg-blue-500', 'bg-amber-500', 'bg-purple-500'][i % 5]} 
                        />
                        <p className="text-xs text-slate-400 mt-2">{client.total_projects || 0} project{(client.total_projects || 0) !== 1 ? 's' : ''}</p>
                      </div>
                    ))}
                  </>
                )}
              </div>
              <button 
                onClick={() => navigate('/app/clients')}
                className="mt-4 w-full py-2.5 text-xs font-bold text-slate-600 hover:text-brand-600 hover:bg-brand-50 transition-all rounded-lg border border-transparent hover:border-brand-200">
                View all clients →
              </button>
            </div>

            {/* Quick Invoicing Status */}
            <div className="card p-6 h-full flex flex-col hover:shadow-lg transition-all duration-300">
              <h3 className="font-bold text-slate-900 font-display mb-6">Cashflow Status</h3>
              <div className="flex-1 grid grid-cols-2 gap-6">
                 <div className="py-8 px-6 rounded-2xl bg-emerald-50 border border-emerald-100 flex flex-col items-center justify-center text-center hover:shadow-xl hover:scale-105 transition-all duration-200 cursor-pointer group hover:border-emerald-200">
                    <CheckCircle2 size={36} className="text-emerald-500 mb-4 group-hover:scale-120 transition-transform" />
                    <p className="text-xs font-black text-emerald-800 uppercase tracking-widest mb-2">Paid Total</p>
                    <p className="text-3xl font-bold text-emerald-900">{formatCurrencyCompact(stats.total_revenue_this_month)}</p>
                 </div>
                 <div className="py-8 px-6 rounded-2xl bg-amber-50 border border-amber-100 flex flex-col items-center justify-center text-center hover:shadow-xl hover:scale-105 transition-all duration-200 cursor-pointer group hover:border-amber-200">
                    <AlertCircle size={36} className="text-amber-500 mb-4 group-hover:scale-120 transition-transform" />
                    <p className="text-xs font-black text-amber-800 uppercase tracking-widest mb-2">Outstanding</p>
                    <p className="text-3xl font-bold text-amber-900">{formatCurrencyCompact(stats.outstanding_invoices)}</p>
                 </div>
              </div>
              <button 
                onClick={() => navigate('/app/invoices')}
                className="mt-6 w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:shadow-lg transition-all active:scale-95 group">
                <FileText size={16} className="group-hover:rotate-12 transition-transform" /> View All Invoices
              </button>
            </div>
          </div>
        </div>

        {/* CENTER COLUMN: Project Pulse & Activities (Col 9-12) */}
        {/* We will split the remaining 4 cols into sub-columns if wide enough, or just a rich feed */}
        <div className="xl:col-span-4 space-y-6">
          
          {/* Productivity Assistant (The 3rd Scroll - Right Sidebar Component) */}
          <div className="card bg-slate-900 text-white overflow-hidden p-6 relative">
             <div className="absolute top-0 right-0 p-6 opacity-10">
               <Sparkles size={120} />
             </div>
             
             <div className="relative z-10">
                <div className="flex items-center gap-2 mb-6">
                   <Target size={20} className="text-brand-400" />
                   <h3 className="font-bold font-display text-lg">Freelance Compass</h3>
                </div>

                <div className="mb-8">
                   <div className="flex justify-between items-center mb-2">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Today's Focus Goal</p>
                      <p className="text-[10px] font-bold text-brand-300">80% Reached</p>
                   </div>
                   <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-500 rounded-full w-[80%] transition-all duration-1000" />
                   </div>
                   <p className="text-xs text-slate-400 mt-2">6.4h tracked of your 8h daily goal</p>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-4 transition-transform hover:translate-x-1 cursor-pointer">
                     <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center shadow-lg">
                        <Sparkles size={20} />
                     </div>
                     <div>
                        <p className="text-sm font-bold">New Prospect Alert</p>
                        <p className="text-xs text-slate-400">Review lead from ACME Corp</p>
                     </div>
                     <ArrowUpRight size={16} className="ml-auto text-slate-500" />
                  </div>
                  
                  <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-4 transition-transform hover:translate-x-1 cursor-pointer">
                     <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shadow-lg">
                        <Coffee size={20} />
                     </div>
                     <div>
                        <p className="text-sm font-bold">Break Time Recommended</p>
                        <p className="text-xs text-slate-400">Rest for optimal creativity</p>
                     </div>
                     <ArrowUpRight size={16} className="ml-auto text-slate-500" />
                  </div>
                </div>

                {/* Rotating Tip */}
                <div className="mt-8 pt-6 border-t border-white/10">
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3">Daily Professional Tip</p>
                   <p className="text-sm text-slate-300 italic leading-relaxed animate-fade-in" key={activeTip}>
                     "{TIPS[activeTip]}"
                   </p>
                </div>
             </div>
          </div>

          {/* Recent Activity List - Nested Scrolling Column */}
          <div className="card overflow-hidden h-[500px] flex flex-col">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <div>
                <h3 className="font-bold text-slate-900 font-display">Live Tracking</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Real-time workspace events</p>
              </div>
              <button 
                onClick={() => toast.success('Filtering activity...')}
                title="Filter activity" 
                className="p-2.5 hover:bg-brand-50 hover:text-brand-600 text-slate-400 transition-all rounded-lg hover:shadow-sm">
                <Filter size={18} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto scrollbar-hide p-2 space-y-1">
              {recent_activity.length === 0 ? (
                <div className="py-20 text-center">
                  <MousePointer2 size={32} className="mx-auto text-slate-200 mb-3" />
                  <p className="text-sm text-slate-400">Waiting for activity...</p>
                </div>
              ) : (
                recent_activity.map((item: any) => (
                  <div 
                    key={`${item.type}-${item.id}`} 
                    onClick={() => {
                      if (item.type === 'time_entry') navigate('/app/time')
                      else if (item.type === 'invoice') navigate('/app/invoices')
                      else if (item.type === 'project') navigate('/app/projects')
                    }}
                    className="group relative flex gap-4 p-4 rounded-2xl hover:bg-brand-50 transition-all duration-200 border border-transparent hover:border-brand-200 cursor-pointer hover:shadow-md active:scale-95">
                    <div className="relative flex flex-col items-center">
                       <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 z-10 shadow-sm transition-all duration-200 group-hover:scale-110"
                          style={{ backgroundColor: item.color + '20', color: item.color }}>
                          {item.type === 'time_entry' && <Clock size={18} />}
                          {item.type === 'invoice' && <FileText size={18} />}
                          {item.type === 'project' && <Briefcase size={18} />}
                       </div>
                       <div className="flex-1 w-px bg-slate-100 my-1 group-last:hidden" />
                    </div>
                    
                    <div className="flex-1 pt-1">
                       <div className="flex justify-between items-start mb-1">
                          <p className="text-sm font-bold text-slate-900 leading-tight pr-4 group-hover:text-brand-700 transition-colors">
                            {item.description}
                          </p>
                          <span className="text-xs font-semibold text-slate-400 whitespace-nowrap">{item.date}</span>
                       </div>
                       <p className="text-xs text-slate-400 mb-2 truncate max-w-[220px]">System update processed</p>
                       
                       {item.amount > 0 && (
                          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-100 rounded-lg shadow-sm hover:shadow-md transition-all group-hover:border-brand-200">
                             <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                             <span className="text-xs font-bold text-slate-900">{formatCurrencyCompact(item.amount)}</span>
                          </div>
                       )}
                    </div>
                    
                    <button 
                      onClick={(e) => { e.stopPropagation(); toast.success('Action menu opened') }}
                      title="More options" 
                      className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1.5 text-slate-300 hover:text-slate-700 hover:bg-white/60 rounded-lg">
                       <MoreHorizontal size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
            
            <div className="p-4 border-t border-slate-50 bg-slate-50/50">
               <button 
                 onClick={() => navigate('/app/dashboard#activity')}
                 className="w-full py-2.5 text-xs font-bold text-slate-500 hover:text-brand-600 hover:bg-brand-50 transition-all rounded-lg">
                  View Full History
               </button>
            </div>
          </div>

        </div>
      </div>

      {/* ─── Full-Width Deadlines & Project Overview Section ──────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        {/* Upcoming Deadlines - 2 columns */}
        <div className="lg:col-span-2">
          <div className="card p-6 hover:shadow-lg transition-all duration-300 h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
               <h3 className="font-bold text-slate-900 font-display flex items-center gap-2">
                 <Calendar size={22} className="text-rose-500" />
                 Upcoming Deadlines
               </h3>
               <button 
                 onClick={() => navigate('/app/projects')}
                 className="text-xs font-bold text-brand-600 hover:text-brand-700 px-2 py-1 hover:bg-brand-50 rounded-lg transition-all">
                 View All →
               </button>
            </div>
            
            <div className="space-y-3 flex-1">
               {upcoming_deadlines.length === 0 ? (
                 <div className="py-12 text-center flex flex-col items-center justify-center">
                   <CheckCircle2 size={40} className="text-emerald-500 mb-3 animate-pulse" />
                   <p className="text-slate-400 font-semibold">No upcoming deadlines!</p>
                   <p className="text-xs text-slate-400 mt-1">You're all caught up 🎉</p>
                 </div>
               ) : (
                 upcoming_deadlines.map((d: any, idx: number) => {
                   const daysLeft = getDaysUntil(d.due_date)
                   const urgent = daysLeft !== null && daysLeft <= 3
                   return (
                     <div 
                       key={d.id} 
                       onClick={() => navigate(`/app/projects/${d.id}`)}
                       className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-slate-100 hover:border-slate-200 hover:shadow-md hover:bg-brand-50 transition-all duration-200 cursor-pointer group active:scale-95">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl font-bold transition-all group-hover:scale-110"
                          style={{ backgroundColor: d.color + '20', color: d.color }}>
                          {String(idx + 1)}
                        </div>
                        <div className="flex-1 min-w-0">
                           <p className="text-sm font-bold text-slate-900 truncate group-hover:text-brand-700">{d.name}</p>
                           <p className="text-xs text-slate-500 truncate">{d.client_name}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                           <p className={classNames(
                             'text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all font-display',
                             urgent ? 'bg-rose-100 text-rose-700 animate-pulse shadow-sm' : daysLeft === 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                           )}>
                             {daysLeft === null ? '—' : daysLeft === 0 ? 'TODAY!' : daysLeft === 1 ? 'TOMORROW' : `${daysLeft}D`}
                           </p>
                        </div>
                     </div>
                   )
                 })
               )}
            </div>
            <button 
              onClick={() => navigate('/app/projects')}
              className="mt-6 w-full py-3 border border-slate-200 hover:border-brand-400 bg-white hover:bg-brand-50 rounded-xl text-xs font-bold text-slate-600 hover:text-brand-600 transition-all flex items-center justify-center gap-2 active:scale-95 group">
               <FolderOpen size={14} className="group-hover:rotate-12 transition-transform" /> View Project Roadmap
            </button>
          </div>
        </div>

        {/* Project Overview & Quick Stats */}
        <div className="flex flex-col gap-6">
          {/* Project Stats */}
          <div className="card p-5 hover:shadow-lg transition-all duration-300">
            <h3 className="font-bold text-slate-900 font-display mb-4 text-sm">Project Overview</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 border border-blue-100 hover:border-blue-200 transition-all group cursor-pointer">
                <span className="text-xs font-semibold text-blue-700">{stats.active_projects}</span>
                <span className="text-xs text-blue-600 font-bold">Active</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 border border-emerald-100 hover:border-emerald-200 transition-all group cursor-pointer">
                <span className="text-xs font-semibold text-emerald-700">{stats.total_clients}</span>
                <span className="text-xs text-emerald-600 font-bold">Clients</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50 border border-purple-100 hover:border-purple-200 transition-all group cursor-pointer">
                <span className="text-xs font-semibold text-purple-700">{stats.outstanding_count}</span>
                <span className="text-xs text-purple-600 font-bold">Overdue</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card p-5 hover:shadow-lg transition-all duration-300">
            <h3 className="font-bold text-slate-900 font-display mb-4 text-sm">Quick Actions</h3>
            <div className="space-y-2">
              <button
                onClick={() => navigate('/app/projects')}
                className="w-full py-2 text-xs font-bold text-slate-700 hover:text-brand-600 bg-slate-50 hover:bg-brand-50 rounded-lg transition-all border border-transparent hover:border-brand-200">
                📋 New Project
              </button>
              <button
                onClick={() => navigate('/app/time')}
                className="w-full py-2 text-xs font-bold text-slate-700 hover:text-brand-600 bg-slate-50 hover:bg-brand-50 rounded-lg transition-all border border-transparent hover:border-brand-200">
                ⏱️ Log Time
              </button>
              <button
                onClick={() => navigate('/app/invoices')}
                className="w-full py-2 text-xs font-bold text-slate-700 hover:text-brand-600 bg-slate-50 hover:bg-brand-50 rounded-lg transition-all border border-transparent hover:border-brand-200">
                📄 New Invoice
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Activity History Section ────────────────────────────────────────── */}
      <div className="mt-12 pt-8 border-t border-slate-100">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-slate-900 font-display text-lg flex items-center gap-2">
            <Activity size={24} className="text-indigo-500" />
            Activity History
          </h3>
          <button 
            onClick={() => navigate('/app/dashboard#history')}
            className="text-xs font-bold text-brand-600 hover:text-brand-700 px-3 py-1.5 hover:bg-brand-50 rounded-lg transition-all">
            See Full History →
          </button>
        </div>
      <div className="mt-16 mb-12 grid grid-cols-1 md:grid-cols-3 gap-6 border-t border-slate-100 pt-12">
         <div className="flex gap-4 p-5 rounded-2xl hover:bg-brand-50 transition-all duration-200 group">
            <div className="w-14 h-14 rounded-2xl bg-brand-100 flex items-center justify-center text-brand-600 flex-shrink-0 group-hover:scale-110 transition-transform">
               <Sparkles size={28} />
            </div>
            <div>
               <h4 className="font-bold text-slate-900 mb-1 group-hover:text-brand-700">Encrypted Workspace</h4>
               <p className="text-xs text-slate-500 max-w-xs leading-relaxed">Your financial and client data is protected with industry-standard security protocols.</p>
            </div>
         </div>
         <div className="flex gap-4 p-5 rounded-2xl hover:bg-amber-50 transition-all duration-200 group">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600 flex-shrink-0 group-hover:scale-110 transition-transform">
               <Zap size={28} />
            </div>
            <div>
               <h4 className="font-bold text-slate-900 mb-1 group-hover:text-amber-700">Optimized Performance</h4>
               <p className="text-xs text-slate-500 max-w-xs leading-relaxed">Running on the latest version of FreelanceOS for maximum speed and productivity.</p>
            </div>
         </div>
         <div className="flex gap-4 p-5 rounded-2xl hover:bg-purple-50 transition-all duration-200 group">
            <div className="w-14 h-14 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-600 flex-shrink-0 group-hover:scale-110 transition-transform">
               <MessageSquare size={28} />
            </div>
            <div>
               <h4 className="font-bold text-slate-900 mb-1 group-hover:text-purple-700">Priority Support</h4>
               <p className="text-xs text-slate-500 max-w-xs leading-relaxed">Reach out anytime for help with your workspace or business operations.</p>
            </div>
         </div>
      </div>
    </div>
    </div>
  )
}
