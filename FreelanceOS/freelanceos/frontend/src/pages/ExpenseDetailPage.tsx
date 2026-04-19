import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Download, Trash2, Edit2, Loader2, Receipt, AlertCircle,
  DollarSign, Calendar, MapPin, FileText, Link as LinkIcon, CheckCircle2,
  Tag, Building2, Clock, Zap,
} from 'lucide-react'
import { expensesApi, projectsApi } from '../api'
import { PageLoader, ConfirmDialog, Modal } from '../components/UI'
import { formatCurrency, formatDate, capitalize } from '../utils'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

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

interface EditFormState {
  category: string
  description: string
  amount: string
  currency: string
  date: string
  vendor: string
  payment_method: string
  project_id: string
  is_billable: boolean
  is_reimbursed: boolean
  tax_included: boolean
  tax_amount: string
  receipt_url: string
  notes: string
}

export default function ExpenseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [expense, setExpense] = useState<any | null>(null)
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [form, setForm] = useState<EditFormState>({
    category: '',
    description: '',
    amount: '',
    currency: 'USD',
    date: '',
    vendor: '',
    payment_method: '',
    project_id: '',
    is_billable: false,
    is_reimbursed: false,
    tax_included: false,
    tax_amount: '0',
    receipt_url: '',
    notes: '',
  })

  const loadExpense = async () => {
    try {
      setLoading(true)
      const res = await expensesApi.get(Number(id))
      setExpense(res.data)
      setForm({
        category: res.data.category || '',
        description: res.data.description || '',
        amount: String(res.data.amount || ''),
        currency: res.data.currency || 'USD',
        date: res.data.date || '',
        vendor: res.data.vendor || '',
        payment_method: res.data.payment_method || '',
        project_id: res.data.project_id || '',
        is_billable: res.data.is_billable || false,
        is_reimbursed: res.data.is_reimbursed || false,
        tax_included: res.data.tax_included || false,
        tax_amount: String(res.data.tax_amount || '0'),
        receipt_url: res.data.receipt_url || '',
        notes: res.data.notes || '',
      })
    } catch (err: any) {
      toast.error('Failed to load expense')
      navigate('/app/expenses')
    } finally {
      setLoading(false)
    }
  }

  const loadProjects = async () => {
    try {
      const res = await projectsApi.list()
      setProjects(res.data)
    } catch {
      console.error('Failed to load projects')
    }
  }

  useEffect(() => {
    loadExpense()
    loadProjects()
  }, [id])

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
      await expensesApi.update(Number(id), payload)
      toast.success('Expense updated')
      setEditMode(false)
      await loadExpense()
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to save expense')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await expensesApi.delete(Number(id))
      toast.success('Expense deleted')
      navigate('/app/expenses')
    } catch {
      toast.error('Failed to delete expense')
    } finally {
      setDeleting(false)
      setDeleteConfirm(false)
    }
  }

  const handleDownloadReceipt = () => {
    if (!expense?.receipt_url) {
      toast.error('No receipt attached')
      return
    }
    window.open(expense.receipt_url, '_blank')
  }

  if (loading) return <PageLoader />
  if (!expense) return <div className="page-container text-center py-12 text-slate-500">Expense not found</div>

  const project = projects.find(p => p.id === expense.project_id)
  const categoryColor = CATEGORY_COLORS[expense.category] || '#94A3B8'
  const totalAmount = Number(expense.amount) + Number(expense.tax_amount || 0)
  const formattedAmount = formatCurrency(expense.amount, expense.currency)
  const formattedTax = formatCurrency(expense.tax_amount || 0, expense.currency)
  const formattedTotal = formatCurrency(totalAmount, expense.currency)

  return (
    <div className="page-container space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/app/expenses')}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600"
            title="Back to expenses"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{expense.description}</h1>
            <p className="text-sm text-slate-500">
              {formatDate(expense.date, 'long')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!editMode && (
            <>
              {expense.receipt_url && (
                <button
                  onClick={handleDownloadReceipt}
                  className="btn-secondary flex items-center gap-2 text-sm"
                  title="Download receipt"
                >
                  <Receipt size={14} />
                  View Receipt
                </button>
              )}
              <button
                onClick={() => setEditMode(true)}
                className="btn-secondary flex items-center gap-2 text-sm"
                title="Edit expense"
              >
                <Edit2 size={14} />
                Edit
              </button>
              <button
                onClick={() => setDeleteConfirm(true)}
                className="btn-danger flex items-center gap-2 text-sm"
                title="Delete expense"
              >
                <Trash2 size={14} />
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Content Grid */}
      {!editMode ? (
        <div className="grid grid-cols-3 gap-6">
          {/* Left: Details */}
          <div className="col-span-2 space-y-6">
            {/* Amount Card */}
            <div className="card p-6 border-l-4" style={{ borderLeftColor: categoryColor }}>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs uppercase tracking-wider font-bold text-slate-500 mb-1">Amount</p>
                  <p className="text-3xl font-bold text-slate-900">{formattedAmount}</p>
                  <p className="text-xs text-slate-400 mt-1">{expense.currency}</p>
                </div>
                {expense.tax_amount && Number(expense.tax_amount) > 0 && (
                  <div>
                    <p className="text-xs uppercase tracking-wider font-bold text-slate-500 mb-1">With Tax</p>
                    <p className="text-3xl font-bold text-slate-900">{formattedTotal}</p>
                    <p className="text-xs text-slate-400 mt-1">Tax: {formattedTax}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Category & Status */}
            <div className="card p-6">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Tag size={18} />
                Classification
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Category</span>
                  <span 
                    className="badge text-xs px-3 py-1.5 font-semibold"
                    style={{
                      backgroundColor: `color-mix(in srgb, ${categoryColor}, transparent 90%)`,
                      color: categoryColor,
                    }}
                  >
                    {capitalize(expense.category.replace(/_/g, ' '))}
                  </span>
                </div>
                <div className="h-px bg-slate-100" />
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Billable Status</span>
                  <span className={`badge text-xs px-3 py-1.5 font-semibold ${
                    expense.is_billable
                      ? 'bg-brand-50 text-brand-700'
                      : 'bg-slate-100 text-slate-500'
                  }`}>
                    {expense.is_billable ? 'Billable to Client' : 'Personal Expense'}
                  </span>
                </div>
                {expense.is_reimbursed && (
                  <>
                    <div className="h-px bg-slate-100" />
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Reimbursement</span>
                      <span className="badge bg-emerald-50 text-emerald-700 text-xs px-3 py-1.5 font-semibold flex items-center gap-1">
                        <CheckCircle2 size={12} />
                        Reimbursed
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Details */}
            <div className="card p-6">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <FileText size={18} />
                Details
              </h3>
              <div className="space-y-3">
                {expense.date && (
                  <>
                    <div className="flex items-center gap-2 text-slate-600">
                      <Calendar size={16} className="text-slate-400" />
                      <span>{formatDate(expense.date, 'long')}</span>
                    </div>
                  </>
                )}
                {expense.vendor && (
                  <>
                    <div className="h-px bg-slate-100" />
                    <div className="flex items-center gap-2 text-slate-600">
                      <Building2 size={16} className="text-slate-400" />
                      <span>{expense.vendor}</span>
                    </div>
                  </>
                )}
                {expense.payment_method && (
                  <>
                    <div className="h-px bg-slate-100" />
                    <div className="flex items-center gap-2 text-slate-600">
                      <Zap size={16} className="text-slate-400" />
                      <span>{capitalize(expense.payment_method)}</span>
                    </div>
                  </>
                )}
                {expense.notes && (
                  <>
                    <div className="h-px bg-slate-100" />
                    <div className="text-sm text-slate-600 p-3 bg-slate-50 rounded-lg">{expense.notes}</div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right: Project & Timeline */}
          <div className="space-y-6">
            {/* Project */}
            {project && (
              <div className="card p-6">
                <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Building2 size={18} />
                  Project
                </h3>
                <a
                  href={`/app/projects/${project.id}`}
                  className="block p-3 rounded-lg border border-slate-200 hover:border-brand-300 hover:bg-brand-50 transition-colors"
                >
                  <p className="font-semibold text-slate-900">{project.name}</p>
                  <p className="text-xs text-slate-500 mt-1">Click to view project</p>
                </a>
              </div>
            )}

            {/* Receipt */}
            {expense.receipt_url && (
              <div className="card p-6">
                <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Receipt size={18} />
                  Receipt
                </h3>
                <a
                  href={expense.receipt_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 hover:border-brand-300 hover:bg-brand-50 transition-colors"
                >
                  <LinkIcon size={14} className="text-brand-600" />
                  <span className="text-sm text-brand-600 font-medium">View Receipt</span>
                </a>
              </div>
            )}

            {/* Timeline */}
            <div className="card p-6">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Clock size={18} />
                Timeline
              </h3>
              <div className="space-y-2 text-sm">
                <div>
                  <p className="text-slate-500">Created</p>
                  <p className="font-medium text-slate-700">{formatDate(expense.created_at, 'long')}</p>
                </div>
                {expense.updated_at !== expense.created_at && (
                  <div>
                    <p className="text-slate-500 mt-3">Last Modified</p>
                    <p className="font-medium text-slate-700">{formatDate(expense.updated_at, 'long')}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Currency Info */}
            {expense.currency !== 'USD' && (
              <div className="card p-6 bg-blue-50 border border-blue-200">
                <div className="flex items-start gap-3">
                  <AlertCircle size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-900">Multi-Currency</p>
                    <p className="text-blue-700 mt-1">
                      {formatCurrency(expense.converted_amount || expense.amount)} in your default currency
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Edit Mode */
        <div className="card p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4">
            <h2 className="text-xl font-bold text-slate-900">Edit Expense</h2>
            <button
              onClick={() => setEditMode(false)}
              className="text-slate-500 hover:text-slate-700 text-2xl leading-none"
            >
              ×
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Category */}
            <div className="form-group">
              <label className="input-label">Category</label>
              <select
                className="select-field"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {capitalize(c.replace(/_/g, ' '))}
                  </option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div className="form-group">
              <label className="input-label">Date</label>
              <input
                type="date"
                className="input-field"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="input-label">Description</label>
            <input
              type="text"
              className="input-field"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="What was this expense for?"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            {/* Amount */}
            <div className="form-group">
              <label className="input-label">Amount</label>
              <input
                type="number"
                className="input-field"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                step="0.01"
                min="0"
              />
            </div>

            {/* Currency */}
            <div className="form-group">
              <label className="input-label">Currency</label>
              <input
                type="text"
                className="input-field"
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                placeholder="USD"
                maxLength={3}
              />
            </div>

            {/* Tax */}
            <div className="form-group">
              <label className="input-label">Tax Amount</label>
              <input
                type="number"
                className="input-field"
                value={form.tax_amount}
                onChange={(e) => setForm({ ...form, tax_amount: e.target.value })}
                step="0.01"
                min="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Vendor */}
            <div className="form-group">
              <label className="input-label">Vendor / Payee</label>
              <input
                type="text"
                className="input-field"
                value={form.vendor}
                onChange={(e) => setForm({ ...form, vendor: e.target.value })}
                placeholder="Where did you spend this?"
              />
            </div>

            {/* Payment Method */}
            <div className="form-group">
              <label className="input-label">Payment Method</label>
              <input
                type="text"
                className="input-field"
                value={form.payment_method}
                onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                placeholder="Credit card, cash, etc."
              />
            </div>
          </div>

          {/* Project */}
          <div className="form-group">
            <label className="input-label">Link to Project (Optional)</label>
            <select
              className="select-field"
              value={form.project_id}
              onChange={(e) => setForm({ ...form, project_id: e.target.value })}
            >
              <option value="">None</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Checkboxes */}
          <div className="grid grid-cols-3 gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-slate-300"
                checked={form.is_billable}
                onChange={(e) => setForm({ ...form, is_billable: e.target.checked })}
              />
              <span className="text-sm font-medium text-slate-700">Billable to Client</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-slate-300"
                checked={form.is_reimbursed}
                onChange={(e) => setForm({ ...form, is_reimbursed: e.target.checked })}
              />
              <span className="text-sm font-medium text-slate-700">Reimbursed</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-slate-300"
                checked={form.tax_included}
                onChange={(e) => setForm({ ...form, tax_included: e.target.checked })}
              />
              <span className="text-sm font-medium text-slate-700">Tax Included</span>
            </label>
          </div>

          {/* Notes */}
          <div className="form-group">
            <label className="input-label">Notes</label>
            <textarea
              className="input-field resize-none"
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Additional details about this expense..."
            />
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
            <button
              onClick={() => setEditMode(false)}
              className="btn-secondary"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="btn-primary flex items-center gap-2"
              disabled={saving}
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              Save Changes
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteConfirm}
        title="Delete Expense"
        description="This action cannot be undone. Are you sure you want to delete this expense?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(false)}
        confirmText="Delete"
        confirmVariant="danger"
        isLoading={deleting}
      />
    </div>
  )
}
