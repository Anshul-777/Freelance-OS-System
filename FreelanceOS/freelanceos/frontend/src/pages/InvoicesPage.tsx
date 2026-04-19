import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Plus, Search, Download, Send, CheckCircle, Pencil, Trash2, Loader2, Eye, DollarSign, Filter, TrendingUp, Clock, AlertCircle } from 'lucide-react'
import { invoicesApi, clientsApi, projectsApi } from '../api'
import { Modal, ConfirmDialog, PageLoader, SectionHeader, EmptyState } from '../components/UI'
import { formatCurrency, formatDate, getInvoiceStatusClass, capitalize } from '../utils'
import toast from 'react-hot-toast'
import { format, differenceInDays } from 'date-fns'

type InvoiceItem = {
  description: string
  quantity: number
  unit_price: number
}

type InvoiceForm = {
  client_id: string
  project_id: string
  status: string
  issue_date: string
  due_date: string
  tax_rate: number
  discount_amount: number
  currency: string
  notes: string
  payment_terms: number
  invoice_number: string
  items: InvoiceItem[]
}

const createInitialForm = (): InvoiceForm => {
  const due = new Date()
  due.setDate(due.getDate() + 30)
  return {
    client_id: '',
    project_id: '',
    status: 'draft',
    issue_date: format(new Date(), 'yyyy-MM-dd'),
    due_date: format(due, 'yyyy-MM-dd'),
    tax_rate: 0,
    discount_amount: 0,
    currency: 'USD',
    notes: '',
    payment_terms: 30,
    invoice_number: '',
    items: [{ description: '', quantity: 1, unit_price: 0 }],
  }
}

export default function InvoicesPage() {
  const navigate = useNavigate()
  const params = useParams()
  const editingId = params.id ? Number(params.id) : null

  const [invoices, setInvoices] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [clientFilter, setClientFilter] = useState('')
  const [projectFilter, setProjectFilter] = useState('')
  const [paidStatusFilter, setPaidStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest')
  const [modalOpen, setModalOpen] = useState(!!editingId)
  const [editInvoice, setEditInvoice] = useState<any | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [downloading, setDownloading] = useState<number | null>(null)
  const [markingSent, setMarkingSent] = useState<number | null>(null)
  const [markingPaid, setMarkingPaid] = useState<number | null>(null)
  const [form, setForm] = useState<InvoiceForm>(createInitialForm())

  const load = async () => {
    try {
      const qparams: any = {}
      if (statusFilter) qparams.status_filter = statusFilter
      if (clientFilter) qparams.client_id = Number(clientFilter)
      if (projectFilter) qparams.project_id = Number(projectFilter)
      if (paidStatusFilter !== 'all') qparams.paid_status = paidStatusFilter
      if (sortBy) qparams.sort_by = sortBy

      const [invoiceRes, clientRes, projectRes] = await Promise.all([
        invoicesApi.list(qparams),
        clientsApi.list(),
        projectsApi.list(),
      ])

      setInvoices(invoiceRes.data || [])
      setClients(clientRes.data || [])
      setProjects(projectRes.data || [])
    } catch (error) {
      toast.error('Failed to load invoice data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [statusFilter, clientFilter, projectFilter, paidStatusFilter, sortBy])

  useEffect(() => {
    if (editingId && invoices.length > 0) {
      const found = invoices.find((invoice) => invoice.id === editingId)
      if (found) {
        openEdit(found)
      }
    }
  }, [editingId, invoices])

  const filtered = invoices.filter((invoice) =>
    !search ||
    invoice.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
    (invoice.client_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (invoice.project_name || '').toLowerCase().includes(search.toLowerCase())
  )

  const totalInvoiced = invoices.reduce((sum, invoice) => sum + Number(invoice.total || 0), 0)
  const totalPaid = invoices.filter((invoice) => invoice.status === 'paid').reduce((sum, invoice) => sum + Number(invoice.total || 0), 0)
  const totalOutstanding = invoices.filter((invoice) => ['sent', 'viewed'].includes(invoice.status)).reduce((sum, invoice) => sum + Number(invoice.total || 0), 0)
  const totalOverdue = invoices.filter((invoice) => invoice.status === 'overdue').reduce((sum, invoice) => sum + Number(invoice.total || 0), 0)

  const openCreate = () => {
    setEditInvoice(null)
    setForm(createInitialForm())
    setModalOpen(true)
  }

  const openEdit = (invoice: any) => {
    setEditInvoice(invoice)
    setForm({
      client_id: invoice.client_id?.toString() || '',
      project_id: invoice.project_id?.toString() || '',
      status: invoice.status || 'draft',
      issue_date: invoice.issue_date || format(new Date(), 'yyyy-MM-dd'),
      due_date: invoice.due_date || format(new Date(), 'yyyy-MM-dd'),
      tax_rate: invoice.tax_rate || 0,
      discount_amount: invoice.discount_amount || 0,
      currency: invoice.currency || 'USD',
      notes: invoice.notes || '',
      payment_terms: invoice.payment_terms || 30,
      invoice_number: invoice.invoice_number || '',
      items: invoice.items?.length > 0
        ? invoice.items.map((item: any) => ({ description: item.description, quantity: item.quantity, unit_price: item.unit_price }))
        : [{ description: '', quantity: 1, unit_price: 0 }],
    })
    setModalOpen(true)
  }

  const addItem = () => {
    setForm((current) => ({
      ...current,
      items: [...current.items, { description: '', quantity: 1, unit_price: 0 }],
    }))
  }

  const removeItem = (index: number) => {
    setForm((current) => ({
      ...current,
      items: current.items.filter((_, itemIndex) => itemIndex !== index),
    }))
  }

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      ),
    }))
  }

  const subtotal = form.items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unit_price || 0), 0)
  const taxAmount = subtotal * ((Number(form.tax_rate) || 0) / 100)
  const totalCalc = subtotal + taxAmount - Number(form.discount_amount || 0)

  const handleSave = async () => {
    if (!form.issue_date || !form.due_date) {
      toast.error('Issue date and due date are required')
      return
    }

    if (form.items.length === 0) {
      toast.error('Add at least one line item')
      return
    }

    setSaving(true)
    try {
      const payload = {
        ...form,
        client_id: form.client_id ? Number(form.client_id) : null,
        project_id: form.project_id ? Number(form.project_id) : null,
        items: form.items.map((item) => ({
          description: item.description,
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
          amount: Number(item.quantity) * Number(item.unit_price),
        })),
      }

      if (editInvoice) {
        await invoicesApi.update(editInvoice.id, payload)
        toast.success('Invoice updated')
      } else {
        await invoicesApi.create(payload)
        toast.success('Invoice created')
      }

      setModalOpen(false)
      setEditInvoice(null)
      await load()
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to save invoice')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await invoicesApi.delete(deleteTarget.id)
      toast.success('Invoice deleted')
      setDeleteTarget(null)
      await load()
    } catch {
      toast.error('Failed to delete invoice')
    } finally {
      setDeleting(false)
    }
  }

  const handleMarkSent = async (id: number) => {
    setMarkingSent(id)
    try {
      await invoicesApi.markSent(id)
      toast.success('Invoice sent')
      await load()
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to send invoice')
    } finally {
      setMarkingSent(null)
    }
  }

  const handleMarkPaid = async (id: number) => {
    setMarkingPaid(id)
    try {
      await invoicesApi.markPaid(id)
      toast.success('Invoice marked paid')
      await load()
    } catch {
      toast.error('Failed to update invoice')
    } finally {
      setMarkingPaid(null)
    }
  }

  const handleDownloadPdf = async (invoice: any) => {
    setDownloading(invoice.id)
    try {
      const response = await invoicesApi.downloadPdf(invoice.id)
      const blob = new Blob([response.data])
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `Invoice-${invoice.invoice_number}.pdf`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success('PDF downloaded')
    } catch {
      toast.error('Failed to download PDF')
    } finally {
      setDownloading(null)
    }
  }

  if (loading) {
    return <PageLoader />
  }

  return (
    <div className="page-container space-y-6">
      <SectionHeader
        title="Invoices"
        description={`${invoices.length} invoice${invoices.length !== 1 ? 's' : ''}`}
        action={
          <button onClick={openCreate} className="btn-primary flex items-center gap-2">
            <Plus size={18} /> New Invoice
          </button>
        }
      />

      <div className="grid grid-cols-4 gap-4">
        <div className="card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase">Total Invoiced</span>
            <TrendingUp size={18} className="text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalInvoiced)}</p>
        </div>
        <div className="card p-4 space-y-2 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase">Paid</span>
            <CheckCircle size={18} className="text-green-500" />
          </div>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
        </div>
        <div className="card p-4 space-y-2 border-l-4 border-amber-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase">Outstanding</span>
            <Clock size={18} className="text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-600">{formatCurrency(totalOutstanding)}</p>
        </div>
        <div className="card p-4 space-y-2 border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase">Overdue</span>
            <AlertCircle size={18} className="text-red-500" />
          </div>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(totalOverdue)}</p>
        </div>
      </div>

      <div className="card p-4 space-y-3">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={18} className="text-gray-600" />
          <h3 className="font-semibold text-gray-900">Filters</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div className="col-span-2 md:col-span-2">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search invoices..."
                className="input w-full pl-9"
              />
            </div>
          </div>

          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="select">
            <option value="">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="viewed">Viewed</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </select>

          <select value={clientFilter} onChange={(event) => setClientFilter(event.target.value)} className="select">
            <option value="">All Clients</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>{client.name}</option>
            ))}
          </select>

          <select value={projectFilter} onChange={(event) => setProjectFilter(event.target.value)} className="select">
            <option value="">All Projects</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>

          <select value={paidStatusFilter} onChange={(event) => setPaidStatusFilter(event.target.value)} className="select">
            <option value="all">All Payments</option>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid</option>
            <option value="overdue">Overdue</option>
          </select>

          <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="select">
            <option value="newest">Newest First</option>
            <option value="due_soon">Due Soon</option>
            <option value="highest_value">Highest Value</option>
            <option value="unpaid_first">Unpaid First</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<DollarSign size={40} />}
            title="No invoices found"
            description="Create your first invoice to get started."
            action={<button onClick={openCreate} className="btn-primary">+ New Invoice</button>}
          />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Invoice</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Client</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Project</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Due Date</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((invoice) => {
                const daysUntilDue = invoice.due_date ? differenceInDays(new Date(invoice.due_date), new Date()) : 0
                const isOverdue = daysUntilDue < 0
                return (
                  <tr key={invoice.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <button
                        onClick={() => navigate(`/app/invoices/${invoice.id}`)}
                        className="font-mono font-semibold text-brand-600 hover:text-brand-700 hover:underline"
                      >
                        {invoice.invoice_number}
                      </button>
                    </td>
                    <td className="px-6 py-4"><p className="font-medium text-gray-900">{invoice.client_name || '—'}</p></td>
                    <td className="px-6 py-4"><p className="text-sm text-gray-600">{invoice.project_name || '—'}</p></td>
                    <td className="px-6 py-4 text-right"><p className="font-mono font-bold text-gray-900">{formatCurrency(invoice.total)}</p></td>
                    <td className="px-6 py-4"><span className={getInvoiceStatusClass(invoice.status)}>{capitalize(invoice.status)}</span></td>
                    <td className="px-6 py-4">
                      <span className={isOverdue ? 'text-red-600 font-semibold' : 'text-gray-600'}>
                        {formatDate(invoice.due_date)}
                        {isOverdue && <span className="text-xs ml-1 text-red-500">({Math.abs(daysUntilDue)}d overdue)</span>}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => navigate(`/app/invoices/${invoice.id}`)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="View"
                        >
                          <Eye size={16} />
                        </button>
                        {invoice.status === 'draft' && (
                          <button
                            onClick={() => handleMarkSent(invoice.id)}
                            disabled={markingSent === invoice.id}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition disabled:opacity-50"
                            title="Send"
                          >
                            {markingSent === invoice.id ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                          </button>
                        )}
                        {['sent', 'viewed', 'overdue'].includes(invoice.status) && (
                          <button
                            onClick={() => handleMarkPaid(invoice.id)}
                            disabled={markingPaid === invoice.id}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition disabled:opacity-50"
                            title="Mark Paid"
                          >
                            {markingPaid === invoice.id ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                          </button>
                        )}
                        <button
                          onClick={() => handleDownloadPdf(invoice)}
                          disabled={downloading === invoice.id}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
                          title="Download"
                        >
                          {downloading === invoice.id ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                        </button>
                        <button
                          onClick={() => openEdit(invoice)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                          title="Edit"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(invoice)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          if (editingId) {
            navigate('/app/invoices')
          }
        }}
        title={editInvoice ? `Edit ${editInvoice.invoice_number}` : 'New Invoice'}
        maxWidth="max-w-4xl"
        footer={
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => {
                setModalOpen(false)
                if (editingId) {
                  navigate('/app/invoices')
                }
              }}
              className="btn btn-outline"
              disabled={saving}
            >
              Cancel
            </button>
            <button onClick={handleSave} className="btn btn-primary" disabled={saving}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : editInvoice ? 'Save Changes' : 'Create Invoice'}
            </button>
          </div>
        }
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Client</label>
              <select value={form.client_id} onChange={(event) => setForm({ ...form, client_id: event.target.value })} className="input">
                <option value="">No client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Project</label>
              <select value={form.project_id} onChange={(event) => setForm({ ...form, project_id: event.target.value })} className="input">
                <option value="">No project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Issue Date</label>
              <input type="date" value={form.issue_date} onChange={(event) => setForm({ ...form, issue_date: event.target.value })} className="input" />
            </div>
            <div>
              <label className="label">Due Date</label>
              <input type="date" value={form.due_date} onChange={(event) => setForm({ ...form, due_date: event.target.value })} className="input" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="label mb-0">Line Items</label>
              <button type="button" onClick={addItem} className="btn btn-outline text-sm py-1 px-2 flex items-center gap-1">
                <Plus size={14} /> Add Item
              </button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-12 gap-3 px-3 mb-2">
                <span className="col-span-6 text-xs font-semibold text-gray-600">Description</span>
                <span className="col-span-2 text-xs font-semibold text-gray-600 text-right">Quantity</span>
                <span className="col-span-3 text-xs font-semibold text-gray-600 text-right">Unit Price</span>
                <span className="col-span-1" />
              </div>
              {form.items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-3 items-center">
                  <input
                    type="text"
                    value={item.description}
                    onChange={(event) => updateItem(index, 'description', event.target.value)}
                    placeholder="Service description"
                    className="input col-span-6 py-2"
                  />
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(event) => updateItem(index, 'quantity', Number(event.target.value))}
                    placeholder="0"
                    step="0.1"
                    className="input col-span-2 py-2 text-right"
                  />
                  <input
                    type="number"
                    value={item.unit_price}
                    onChange={(event) => updateItem(index, 'unit_price', Number(event.target.value))}
                    placeholder="0.00"
                    step="0.01"
                    className="input col-span-3 py-2 text-right font-mono"
                  />
                  <button type="button" onClick={() => removeItem(index)} className="col-span-1 p-2 text-red-600 hover:bg-red-50 rounded-lg transition">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div className="space-y-4">
              <div>
                <label className="label">Tax Rate (%)</label>
                <input
                  type="number"
                  value={form.tax_rate}
                  onChange={(event) => setForm({ ...form, tax_rate: Number(event.target.value) || 0 })}
                  step="0.1"
                  min="0"
                  max="100"
                  className="input"
                />
              </div>
              <div>
                <label className="label">Discount</label>
                <input
                  type="number"
                  value={form.discount_amount}
                  onChange={(event) => setForm({ ...form, discount_amount: Number(event.target.value) || 0 })}
                  step="0.01"
                  min="0"
                  className="input"
                />
              </div>
            </div>
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-semibold text-gray-900">{formatCurrency(subtotal)}</span>
              </div>
              {Number(form.tax_rate) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax ({form.tax_rate}%)</span>
                  <span className="font-semibold text-gray-900">{formatCurrency(taxAmount)}</span>
                </div>
              )}
              {Number(form.discount_amount) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Discount</span>
                  <span className="font-semibold text-red-600">−{formatCurrency(Number(form.discount_amount))}</span>
                </div>
              )}
              <div className="border-t pt-2 flex justify-between">
                <span className="font-bold text-gray-900">Total</span>
                <span className="text-xl font-bold text-brand-600">{formatCurrency(totalCalc)}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="label">Invoice Number (Optional - auto-generated if empty)</label>
              <input
                type="text"
                value={form.invoice_number}
                onChange={(event) => setForm({ ...form, invoice_number: event.target.value })}
                placeholder="e.g. INV-001"
                className="input font-mono"
              />
            </div>
          </div>

          <div>
            <label className="label">Notes</label>
            <textarea
              value={form.notes}
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
              placeholder="Payment instructions, thank you note..."
              className="input min-h-[100px] resize-none"
            />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Invoice?"
        message="This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
        danger
        loading={deleting}
      />
    </div>
  )
}
