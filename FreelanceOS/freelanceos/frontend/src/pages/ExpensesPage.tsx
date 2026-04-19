import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Receipt, Search, Pencil, Trash2, Loader2,
  TrendingDown, BarChart2, FileText,
} from 'lucide-react'
import { expensesApi, projectsApi } from '../api'
import {
  Modal, ConfirmDialog, PageLoader, SectionHeader, EmptyState,
} from '../components/UI'
import { formatCurrency, formatDate, capitalize } from '../utils'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useAuthStore } from '../store'
import { recurringExpensesApi } from '../api'
import { RefreshCw, Calendar, Clock } from 'lucide-react'

const CATEGORIES = [
  'software_subscription', 'hardware', 'travel', 'meals', 'office_rent',
  'utilities', 'marketing_advertising', 'contractor_payments', 'banking_fees',
  'taxes', 'education', 'miscellaneous', 'other',
]

const CATEGORY_COLORS: Record<string, string> = {
  software:   '#4F46E5',
  hardware:   '#0EA5E9',
  travel:     '#F59E0B',
  office:     '#10B981',
  marketing:  '#EC4899',
  education:  '#8B5CF6',
  utilities:  '#06B6D4',
  contractor: '#F97316',
  other:      '#94A3B8',
}

const EMPTY_FORM = {
  category: 'software_subscription', description: '', amount: '', currency: 'USD',
  date: format(new Date(), 'yyyy-MM-dd'), vendor: '', payment_method: '',
  project_id: '', is_billable: false, is_reimbursed: false, tax_included: false,
  tax_amount: '0', receipt_url: '', notes: '',
}

export default function ExpensesPage() {
  const navigate = useNavigate()
  const { user: current_user } = useAuthStore()
  const [expenses, setExpenses]   = useState<any[]>([])
  const [projects, setProjects]   = useState<any[]>([])
  const [summary, setSummary]     = useState<any>(null)
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editExpense, setEditExpense] = useState<any | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [form, setForm]           = useState<any>(EMPTY_FORM)
  const [projFilter, setProjFilter] = useState('')
  const [saving, setSaving]       = useState(false)
  const [deleting, setDeleting]   = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'recurring'>('all')
  const [recurringConfigs, setRecurringConfigs] = useState<any[]>([])

  const [recurringModalOpen, setRecurringModalOpen] = useState(false)
  const [recurringForm, setRecurringForm] = useState<any>({
    title: '', category: 'software_subscription', amount: '',
    currency: current_user?.currency || 'USD', interval: 'monthly',
    is_active: true,
  })

  const load = async () => {
    const params: any = {}
    if (catFilter) params.category = catFilter
    if (projFilter) params.project_id = Number(projFilter)
    const [expRes, sumRes, recRes] = await Promise.all([
      expensesApi.list(params),
      expensesApi.summary(),
      recurringExpensesApi.list(),
    ])
    setExpenses(expRes.data)
    setSummary(sumRes.data)
    setRecurringConfigs(recRes.data)
  }

  useEffect(() => {
    Promise.all([
      load(),
      projectsApi.list().then((r) => setProjects(r.data)),
    ]).finally(() => setLoading(false))
  }, [catFilter, projFilter])

  const filtered = expenses.filter((e) =>
    !search ||
    e.description.toLowerCase().includes(search.toLowerCase()) ||
    (e.vendor || '').toLowerCase().includes(search.toLowerCase())
  )

  const totalThisMonth = expenses.reduce((s, e) => {
    const d = new Date(e.date)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      ? s + e.amount : s
  }, 0)

  const openCreate = () => { setEditExpense(null); setForm({ ...EMPTY_FORM }); setModalOpen(true) }
  const openEdit = (e: any) => {
    setEditExpense(e)
    setForm({
      category: e.category, description: e.description, amount: e.amount,
      currency: e.currency, date: e.date, vendor: e.vendor || '',
      project_id: e.project_id || '', is_billable: e.is_billable,
      is_reimbursed: e.is_reimbursed, notes: e.notes || '',
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.description.trim()) return toast.error('Description is required')
    if (!form.amount || Number(form.amount) <= 0) return toast.error('Amount must be greater than 0')
    setSaving(true)
    try {
      const payload = {
        ...form,
        amount: Number(form.amount),
        tax_amount: Number(form.tax_amount || 0),
        project_id: form.project_id ? Number(form.project_id) : null,
      }
      if (editExpense) {
        await expensesApi.update(editExpense.id, payload)
        toast.success('Expense updated')
      } else {
        await expensesApi.create(payload)
        toast.success('Expense added!')
      }
      setModalOpen(false)
      await load()
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Failed to save expense')
    } finally { setSaving(false) }
  }

  const handleSaveRecurring = async () => {
    if (!recurringForm.title.trim()) return toast.error('Title is required')
    if (!recurringForm.amount || Number(recurringForm.amount) <= 0) return toast.error('Amount required')
    setSaving(true)
    try {
      await recurringExpensesApi.create({
        ...recurringForm,
        amount: Number(recurringForm.amount),
      })
      toast.success('Automation setup!')
      setRecurringModalOpen(false)
      setRecurringForm({ ...recurringForm, title: '', amount: '' })
      await load()
    } catch { toast.error('Failed to setup recurring expense') }
    finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await expensesApi.delete(deleteTarget.id)
      toast.success('Expense deleted')
      setDeleteTarget(null)
      await load()
    } catch { toast.error('Failed to delete') }
    finally { setDeleting(false) }
  }

  if (loading) return <PageLoader />

  const chartData = summary?.by_category?.map((c: any) => ({
    name: capitalize(c.category),
    value: c.amount,
    color: CATEGORY_COLORS[c.category] || '#94A3B8',
  })) || []

  return (
    <div className="page-container space-y-5 max-w-none">
      <SectionHeader
        title="Expenses"
        description={`${expenses.length} expense${expenses.length !== 1 ? 's' : ''}`}
        action={
          <div className="flex items-center gap-2">
            <button 
              onClick={async () => {
                try {
                  const res = await expensesApi.axios.get('/expenses/export/csv', { responseType: 'blob' });
                  const url = window.URL.createObjectURL(new Blob([res.data]));
                  const link = document.createElement('a');
                  link.href = url;
                  link.setAttribute('download', `expenses_${format(new Date(), 'yyyy-MM-dd')}.csv`);
                  document.body.appendChild(link);
                  link.click();
                } catch { toast.error('CSV Export failed'); }
              }}
              className="btn-secondary"
              title="Export as CSV"
            >
              Export CSV
            </button>
            <button 
              onClick={async () => {
                try {
                  const res = await expensesApi.axios.get('/expenses/export/pdf', { responseType: 'blob' });
                  const url = window.URL.createObjectURL(new Blob([res.data]));
                  const link = document.createElement('a');
                  link.href = url;
                  link.setAttribute('download', `expenses_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
                  document.body.appendChild(link);
                  link.click();
                } catch { toast.error('PDF Export failed'); }
              }}
              className="btn-secondary flex items-center gap-1"
              title="Export as PDF"
            >
              <FileText size={14} /> Export PDF
            </button>
            <button onClick={openCreate} className="btn-primary" title="Add new expense">
              <Plus size={16} /> Add Expense
            </button>
          </div>
        }
      />

      {/* Summary row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
            <TrendingDown size={18} className="text-red-500" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">This Month ({current_user?.currency})</p>
            <p className="text-xl font-bold text-red-700">{formatCurrency(summary?.total_converted || totalThisMonth)}</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
            <BarChart2 size={18} className="text-amber-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">YTD Total</p>
            <p className="text-xl font-bold text-amber-700">{formatCurrency(summary?.total || 0)}</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
            <Receipt size={18} className="text-slate-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Entries</p>
            <p className="text-xl font-bold text-slate-800">{summary?.count || 0}</p>
          </div>
        </div>
      </div>

      {/* Charts Row - Full Width Section */}
      {chartData.length > 0 && (
        <div className="card p-6">
          <h3 className="font-bold text-slate-900 mb-6 font-display text-lg">Spending Breakdown</h3>
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="w-full h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={chartData} 
                    cx="50%" 
                    cy="50%" 
                    innerRadius={70} 
                    outerRadius={100}
                    paddingAngle={5} 
                    dataKey="value"
                  >
                    {chartData.map((entry: any, i: number) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(v: any) => formatCurrency(v)} 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Legend verticalAlign="middle" align="right" layout="vertical" wrapperStyle={{ paddingLeft: '20px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
              {chartData.slice(0, 4).map((c: any) => (
                <div key={c.name} className="flex flex-col p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400" style={{ color: c.color }}>{c.name}</span>
                  <span className="text-sm font-bold text-slate-700">{formatCurrency(c.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
          {/* Tabs */}
          <div className="flex border-b border-slate-200 mb-4">
            <button 
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'all' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              All Expenses
            </button>
            <button 
              onClick={() => setActiveTab('recurring')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'recurring' ? 'border-brand-500 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              Recurring Automations
            </button>
          </div>

          {/* Filters Bar - Professional Single Row */}
          {activeTab === 'all' && (
            <div className="flex flex-wrap items-center gap-3 p-1">
              <div className="relative flex-[2] min-w-[200px]">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  value={search} 
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search descriptions, vendors..." 
                  className="input-field pl-9 py-2.5" 
                  title="Search expenses"
                />
              </div>
              <select 
                value={catFilter} 
                onChange={(e) => setCatFilter(e.target.value)}
                className="select-field flex-1 min-w-[140px] py-2.5"
                title="Filter by category"
              >
                <option value="">All Categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{capitalize(c.replace('_', ' '))}</option>
                ))}
              </select>
              <select 
                value={projFilter} 
                onChange={(e) => setProjFilter(e.target.value)}
                className="select-field flex-1 min-w-[140px] py-2.5"
                title="Filter by project"
              >
                <option value="">All Projects</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          {activeTab === 'all' ? (
            filtered.length === 0 ? (
              <div className="card">
                <EmptyState
                  icon={<Receipt size={24} />}
                  title="No expenses found"
                  description="Track your business expenses to monitor profitability."
                  action={<button onClick={openCreate} className="btn-primary text-sm">+ Add Expense</button>}
                />
              </div>
            ) : (
              <div className="table-container">
                <table className="w-full">
                  <thead>
                    <tr>
                      {['Date','Description','Category','Amount','Vendor','Billable',''].map((h) => (
                        <th key={h} className="table-th">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((e) => (
                      <tr key={e.id} className="table-row">
                        <td className="table-td text-slate-500 whitespace-nowrap">{formatDate(e.date)}</td>
                        <td className="table-td">
                          <p className="font-medium text-slate-900 cursor-pointer hover:text-brand-600 transition-colors" onClick={() => navigate(`/app/expenses/${e.id}`)}>{e.description}</p>
                          {e.project_name && <p className="text-xs text-slate-400">{e.project_name}</p>}
                        </td>
                        <td className="table-td">
                          <span className="badge text-xs"
                            style={{
                              '--bg-opacity': '0.1',
                              backgroundColor: `color-mix(in srgb, ${CATEGORY_COLORS[e.category] || '#94A3B8'}, transparent 90%)`,
                              color: CATEGORY_COLORS[e.category] || '#64748B',
                            } as React.CSSProperties}>
                            {capitalize(e.category.replace('_', ' '))}
                          </span>
                        </td>
                        <td className="table-td">
                          <span className="font-mono font-semibold text-red-600">
                            − {formatCurrency(e.amount, e.currency)}
                          </span>
                          {e.currency !== current_user?.currency && (
                            <p className="text-[10px] text-slate-400">≈ {formatCurrency(e.converted_amount)}</p>
                          )}
                          {e.receipt_url && (
                            <a href={e.receipt_url} target="_blank" className="text-[10px] text-brand-500 hover:underline flex items-center gap-0.5 mt-0.5">
                              <Receipt size={10} /> View Receipt
                            </a>
                          )}
                        </td>
                        <td className="table-td text-slate-500">{e.vendor || '—'}</td>
                        <td className="table-td">
                          {e.is_billable ? (
                            <span className="badge bg-brand-50 text-brand-700">Billable</span>
                          ) : (
                            <span className="badge bg-slate-100 text-slate-500">Personal</span>
                          )}
                        </td>
                        <td className="table-td">
                          <div className="flex items-center gap-1">
                            <button onClick={() => openEdit(e)} className="btn-ghost p-1.5" title="Edit expense"><Pencil size={14} /></button>
                            <button onClick={() => setDeleteTarget(e)}
                              className="btn-ghost p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600"
                              title="Delete expense">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            /* Recurring Tab View */
            recurringConfigs.length === 0 ? (
              <div className="card">
                <EmptyState
                  icon={<RefreshCw size={24} />}
                  title="No recurring expenses"
                  description="Automate your subscriptions, rent, and regular contractor payments."
                  action={<button onClick={() => setRecurringModalOpen(true)} className="btn-primary text-sm">+ Setup Automation</button>}
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recurringConfigs.map((config) => (
                  <div key={config.id} className="card p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="badge bg-brand-50 text-brand-700 text-[10px] flex items-center gap-1 uppercase tracking-wider font-bold">
                          <RefreshCw size={10} /> {config.interval}
                        </span>
                        <span className={`badge text-[10px] ${config.is_active ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                          {config.is_active ? 'Active' : 'Paused'}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900">{config.title}</h4>
                      <p className="text-xl font-bold text-slate-800 mt-1">{formatCurrency(config.amount, config.currency)}</p>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        <Calendar size={12} /> Next: {formatDate(config.next_generation_date)}
                      </div>
                      <div className="flex items-center gap-1">
                        <button className="text-brand-600 hover:underline">Edit</button>
                        <span className="text-slate-300">|</span>
                        <button className="text-red-500 hover:underline">Stop</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>

      {/* Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={editExpense ? 'Edit Expense' : 'Add Expense'}
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className="btn-secondary" disabled={saving}>Cancel</button>
            <button onClick={handleSave} className="btn-primary" disabled={saving}>
              {saving && <Loader2 size={14} className="animate-spin" />}
              {editExpense ? 'Save Changes' : 'Add Expense'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="form-group">
              <label className="input-label" htmlFor="expense-category">Category</label>
              <select id="expense-category" className="select-field" value={form.category}
                title="Select category"
                onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{capitalize(c)}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="input-label" htmlFor="expense-date">Date</label>
              <input id="expense-date" type="date" className="input-field" value={form.date} title="Expense date"
                onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </div>
          </div>

          <div className="form-group">
            <label className="input-label">Description *</label>
            <input className="input-field" value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="e.g. Adobe Creative Cloud subscription" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="form-group">
              <label className="input-label">Amount *</label>
              <div className="flex gap-2">
                <input type="number" className="input-field w-2/3" step="0.01" min="0"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0.00" />
                <select 
                  className="select-field w-1/3" 
                  value={form.currency} 
                  title="Currency"
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                >
                  {['USD', 'EUR', 'GBP', 'INR', 'JPY', 'CAD', 'AUD'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="input-label">Vendor</label>
              <input className="input-field" value={form.vendor}
                onChange={(e) => setForm({ ...form, vendor: e.target.value })}
                placeholder="Company name" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="form-group">
              <label className="input-label">Payment Method</label>
              <input className="input-field" value={form.payment_method}
                onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                placeholder="e.g. Visa ...44" />
            </div>
            <div className="form-group">
              <label className="input-label" htmlFor="expense-receipt">Receipt</label>
              <input id="expense-receipt" type="file" className="input-field py-1" title="Upload receipt"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const formData = new FormData();
                  formData.append('file', file);
                  toast.promise(
                    expensesApi.axios.post('/expenses/upload', formData),
                    {
                      loading: 'Uploading receipt...',
                      success: (res: any) => {
                        setForm({ ...form, receipt_url: res.data.receipt_url });
                        return 'Receipt uploaded!';
                      },
                      error: 'Upload failed',
                    }
                  );
                }}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="input-label" htmlFor="expense-project">Project (Optional)</label>
            <select id="expense-project" className="select-field" value={form.project_id} title="Select project"
              onChange={(e) => setForm({ ...form, project_id: e.target.value })}>
              <option value="">No project</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3 p-3 bg-brand-50/30 rounded-xl border border-brand-100/50">
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={form.tax_included}
                  onChange={(e) => setForm({ ...form, tax_included: e.target.checked })}
                  className="checkbox-field" />
                <span className="text-sm font-semibold text-brand-900">Tax Included</span>
              </label>
              <p className="text-[10px] text-brand-600 pl-6">Mark if amount includes sales tax/VAT</p>
            </div>
            <div className="form-group">
              <label className="input-label text-[10px] text-brand-700 uppercase">Tax Amount</label>
              <input type="number" className="input-field py-1 text-sm" step="0.01" value={form.tax_amount}
                onChange={(e) => setForm({ ...form, tax_amount: e.target.value })}
                placeholder="0.00" title="Tax amount component" />
            </div>
          </div>

          <div className="form-group">
            <label className="input-label">Notes</label>
            <textarea className="input-field resize-none" rows={2} value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Additional details…" />
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={form.is_billable}
                onChange={(e) => setForm({ ...form, is_billable: e.target.checked })}
                className="w-4 h-4 rounded border-slate-300 text-brand-600" />
              <span className="text-sm font-medium text-slate-700">Billable to client</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={form.is_reimbursed}
                onChange={(e) => setForm({ ...form, is_reimbursed: e.target.checked })}
                className="w-4 h-4 rounded border-slate-300 text-brand-600" />
              <span className="text-sm font-medium text-slate-700">Reimbursed</span>
            </label>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Expense"
        message={`Delete "${deleteTarget?.description}"?`}
        confirmLabel="Delete"
        danger loading={deleting}
      />

      {/* Recurring Automation Modal */}
      <Modal open={recurringModalOpen} onClose={() => setRecurringModalOpen(false)}
        title="Setup Recurring Expense"
        footer={
          <>
            <button onClick={() => setRecurringModalOpen(false)} className="btn-secondary" disabled={saving}>Cancel</button>
            <button onClick={handleSaveRecurring} className="btn-primary" disabled={saving}>
              {saving && <Loader2 size={14} className="animate-spin" />}
              Create Automation
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="form-group">
            <label className="input-label">Title *</label>
            <input className="input-field" value={recurringForm.title}
              onChange={(e) => setRecurringForm({ ...recurringForm, title: e.target.value })}
              placeholder="e.g. Monthly Rent, Adobe Subscription" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="form-group">
              <label className="input-label" htmlFor="rec-category">Category</label>
              <select id="rec-category" className="select-field" value={recurringForm.category} title="Automation category"
                onChange={(e) => setRecurringForm({ ...recurringForm, category: e.target.value })}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{capitalize(c)}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="input-label" htmlFor="rec-interval">Interval</label>
              <select id="rec-interval" className="select-field" value={recurringForm.interval} title="Frequency"
                onChange={(e) => setRecurringForm({ ...recurringForm, interval: e.target.value })}>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="input-label">Amount *</label>
            <div className="flex gap-2">
              <input type="number" className="input-field w-2/3" step="0.01" value={recurringForm.amount}
                onChange={(e) => setRecurringForm({ ...recurringForm, amount: e.target.value })}
                placeholder="0.00" />
              <select 
                className="select-field w-1/3" 
                value={recurringForm.currency} 
                title="Automation currency"
                onChange={(e) => setRecurringForm({ ...recurringForm, currency: e.target.value })}
              >
                {['USD', 'EUR', 'GBP', 'INR', 'JPY'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
