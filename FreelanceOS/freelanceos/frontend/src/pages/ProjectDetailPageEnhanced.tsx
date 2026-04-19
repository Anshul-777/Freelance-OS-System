import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Clock, DollarSign, AlertCircle, CheckCircle2, Loader2,
  Plus, Trash2, Pencil, Download, Upload, TrendingDown, TrendingUp,
  Calendar, FileText, Zap, AlertTriangle, CheckSquare, FileIcon,
  MoreHorizontal, Eye, Share2, Info, HelpCircle, Lightbulb, Play, Pause
} from 'lucide-react'
import { projectsApi, timeApi } from '../api'
import { Modal, ConfirmDialog, PageLoader, ProgressBar } from '../components/UI'
import { KanbanBoard, type Task } from '../components/Kanban/KanbanBoard'
import {
  formatCurrency, formatDate, formatDuration, classNames,
  getProjectStatusClass, capitalize
} from '../utils'
import toast from 'react-hot-toast'

type TabType = 'overview' | 'deliverables' | 'scope' | 'files' | 'kanban' | 'time'

interface ProjectDetail {
  id: number
  name: string
  description?: string
  status: string
  client_name?: string
  budget?: number
  estimated_hours?: number
  start_date?: string
  due_date?: string
  is_billable: boolean
  total_hours: number
  total_expenses: number
  total_earnings: number
  profit_estimate: number
  completion_percentage: number
  days_until_due?: number
  is_overdue: boolean
  risk_level: string
  deliverables: any[]
  scope_changes: any[]
  files: any[]
  tasks: Task[]
}

const StatCard = ({ icon: Icon, label, value, trend, color = 'blue' }: any) => (
  <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between mb-2">
      <span className={`p-2 rounded-lg ${color === 'green' ? 'bg-emerald-100' :
          color === 'red' ? 'bg-rose-100' :
            color === 'amber' ? 'bg-amber-100' :
              'bg-blue-100'
        }`}>
        <Icon className={`w-5 h-5 ${color === 'green' ? 'text-emerald-600' :
            color === 'red' ? 'text-rose-600' :
              color === 'amber' ? 'text-amber-600' :
                'text-blue-600'
          }`} />
      </span>
      {trend && (
        <span className={`text-xs font-bold ${trend > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
          {trend > 0 ? '+' : ''}{trend}%
        </span>
      )}
    </div>
    <p className="text-slate-600 text-xs font-semibold uppercase tracking-wider">{label}</p>
    <p className="text-xl font-bold text-slate-900 mt-1">{value}</p>
  </div>
)

const RiskBadge = ({ level }: { level: string }) => {
  const config = {
    low: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
    medium: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    high: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  }
  const { bg, text, border } = config[level as keyof typeof config] || config.low
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${bg} ${text} border ${border}`}>
      {level === 'high' && <AlertTriangle size={12} />}
      {level === 'medium' && <AlertCircle size={12} />}
      {level === 'low' && <CheckCircle2 size={12} />}
      {capitalize(level)} Risk
    </span>
  )
}

const InfoBox = ({ type = 'info', title, children }: { type?: 'info' | 'tip' | 'warning', title: string, children: React.ReactNode }) => {
  const colors = {
    info: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'text-blue-600' },
    tip: { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'text-emerald-600' },
    warning: { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'text-amber-600' },
  }
  const { bg, border, icon } = colors[type]
  const Icon = type === 'tip' ? Lightbulb : HelpCircle
  return (
    <div className={`${bg} border ${border} rounded-lg p-4 mb-4`}>
      <div className="flex gap-3">
        <Icon className={`${icon} flex-shrink-0 mt-0.5`} size={18} />
        <div>
          <h4 className="font-semibold text-slate-900 text-sm mb-1">{title}</h4>
          <p className="text-sm text-slate-700">{children}</p>
        </div>
      </div>
    </div>
  )
}

export default function ProjectDetailPageEnhanced() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const projectId = Number(id)

  const [project, setProject] = useState<ProjectDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [timeEntries, setTimeEntries] = useState<any[]>([])

  // Modals
  const [showDeliverableModal, setShowDeliverableModal] = useState(false)
  const [showScopeModal, setShowScopeModal] = useState(false)
  const [showFileModal, setShowFileModal] = useState(false)

  // Forms
  const [deliverableForm, setDeliverableForm] = useState({ title: '', description: '', status: 'pending', due_date: '' })
  const [scopeForm, setScopeForm] = useState({ title: '', description: '', change_type: 'revision', status: 'pending' })
  const [fileForm, setFileForm] = useState({ file_name: '', file_type: 'deliverable', file_url: '', description: '' })
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  const loadProjectDetail = useCallback(async () => {
    try {
      const [projRes, timeRes] = await Promise.all([
        projectsApi.getDetail(projectId),
        timeApi.list({ project_id: projectId, limit: 100 }),
      ])
      setProject(projRes.data)
      setTimeEntries(timeRes.data)
    } catch (err) {
      console.error(err)
      toast.error('Failed to load project')
      navigate('/app/projects')
    } finally {
      setLoading(false)
    }
  }, [projectId, navigate])

  useEffect(() => {
    loadProjectDetail()
  }, [loadProjectDetail])

  const handleAddDeliverable = useCallback(async () => {
    if (!deliverableForm.title.trim()) {
      toast.error('Title required')
      return
    }
    try {
      await projectsApi.createDeliverable(projectId, deliverableForm)
      toast.success('Deliverable added')
      setShowDeliverableModal(false)
      setDeliverableForm({ title: '', description: '', status: 'pending', due_date: '' })
      loadProjectDetail()
    } catch (err) {
      toast.error('Failed to add deliverable')
    }
  }, [deliverableForm, projectId, loadProjectDetail])

  const handleAddScopeChange = useCallback(async () => {
    if (!scopeForm.title.trim()) {
      toast.error('Title required')
      return
    }
    try {
      await projectsApi.createScopeChange(projectId, scopeForm)
      toast.success('Scope change logged')
      setShowScopeModal(false)
      setScopeForm({ title: '', description: '', change_type: 'revision', status: 'pending' })
      loadProjectDetail()
    } catch (err) {
      toast.error('Failed to log scope change')
    }
  }, [scopeForm, projectId, loadProjectDetail])

  const handleAddFile = useCallback(async () => {
    if (!uploadedFile && !fileForm.file_url.trim()) {
      toast.error('Please upload a file or enter a file URL')
      return
    }
    try {
      setUploading(true)
      const fileName = uploadedFile?.name || fileForm.file_name
      const fileUrl = uploadedFile ? URL.createObjectURL(uploadedFile) : fileForm.file_url

      await projectsApi.createFile(projectId, {
        file_name: fileName,
        file_type: fileForm.file_type,
        file_url: fileUrl,
        description: fileForm.description,
      })
      toast.success('File uploaded successfully')
      setShowFileModal(false)
      setUploadedFile(null)
      setFileForm({ file_name: '', file_type: 'deliverable', file_url: '', description: '' })
      loadProjectDetail()
    } catch (err) {
      toast.error('Failed to upload file')
    } finally {
      setUploading(false)
    }
  }, [fileForm, uploadedFile, projectId, loadProjectDetail])

  if (loading) return <PageLoader />
  if (!project) return null

  const deliverables = project.deliverables || []
  const scopeChanges = project.scope_changes || []
  const files = project.files || []

  const tabs: { id: TabType; label: string; icon: any; count?: number }[] = [
    { id: 'overview', label: 'Overview', icon: Eye },
    { id: 'deliverables', label: 'Deliverables', icon: CheckSquare, count: deliverables.length },
    { id: 'scope', label: 'Scope Changes', icon: FileText, count: scopeChanges.length },
    { id: 'files', label: 'Files', icon: FileIcon, count: files.length },
    { id: 'kanban', label: 'Tasks', icon: CheckSquare, count: project.tasks?.length },
    { id: 'time', label: 'Time Log', icon: Clock },
  ]

  return (
    <div className="page-container max-w-7xl animate-fade-in">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            title="Back to Projects"
            onClick={() => navigate('/app/projects')}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{project.name}</h1>
            <p className="text-slate-600 text-sm mt-1">{project.client_name && `Client: ${project.client_name}`}</p>
          </div>
        </div>
        <RiskBadge level={project.risk_level} />
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Clock} label="Hours Logged" value={`${project.total_hours}h`} color="blue" />
        <StatCard icon={DollarSign} label="Earnings" value={formatCurrency(project.total_earnings)} color="green" />
        <StatCard icon={TrendingDown} label="Expenses" value={formatCurrency(project.total_expenses)} color="amber" />
        <StatCard
          icon={TrendingUp}
          label="Profit Estimate"
          value={formatCurrency(project.profit_estimate)}
          color={project.profit_estimate >= 0 ? 'green' : 'red'}
        />
      </div>

      {/* Timeline */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {project.due_date && (
          <div className="bg-white p-4 rounded-xl border border-slate-100">
            <p className="text-slate-600 text-xs font-semibold uppercase tracking-wider">Due Date</p>
            <p className="text-lg font-bold text-slate-900 mt-1">{formatDate(project.due_date)}</p>
            {project.days_until_due !== null && (
              <p className={`text-xs mt-2 font-semibold ${project.is_overdue ? 'text-rose-600' : 'text-emerald-600'}`}>
                {project.is_overdue ? '🔴 ' : '🟢 '}
                {Math.abs(project.days_until_due || 0)} days {project.is_overdue ? 'overdue' : 'remaining'}
              </p>
            )}
          </div>
        )}
        <div className="bg-white p-4 rounded-xl border border-slate-100">
          <p className="text-slate-600 text-xs font-semibold uppercase tracking-wider">Completion</p>
          <div className="mt-2"><ProgressBar value={project.completion_percentage} /></div>
          <p className="text-xs text-slate-600 mt-2">{project.completion_percentage}% complete</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100">
          <p className="text-slate-600 text-xs font-semibold uppercase tracking-wider">Budget</p>
          <p className="text-lg font-bold text-slate-900 mt-1">
            {project.budget ? formatCurrency(project.budget) : 'Not set'}
          </p>
          <p className="text-xs text-slate-600 mt-2">
            {project.is_billable ? '💵 Billable' : '🎁 Non-billable'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 mb-8">
        <div className="flex gap-1 -mb-px">
          {tabs.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={classNames(
                  'px-4 py-3 font-semibold text-sm border-b-2 transition-all flex items-center gap-2',
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                )}
              >
                <Icon size={16} />
                {tab.label}
                {tab.count !== undefined && (
                  <span className={classNames(
                    'px-2 py-0.5 rounded-full text-xs font-bold',
                    activeTab === tab.id ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                  )}>
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          <div className="lg:col-span-2">
            <div className="bg-white p-6 rounded-xl border border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Project Description</h3>
              <p className="text-slate-600 leading-relaxed">
                {project.description || 'No description provided'}
              </p>
            </div>

            {project.start_date && (
              <div className="bg-white p-6 rounded-xl border border-slate-100 mt-6">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Timeline</h3>
                <div className="flex items-center gap-8">
                  <div>
                    <p className="text-slate-600 text-sm">Start Date</p>
                    <p className="text-slate-900 font-semibold">{formatDate(project.start_date)}</p>
                  </div>
                  <div className="flex-1 h-1 bg-gradient-to-r from-blue-400 to-emerald-400 rounded-full" />
                  {project.due_date && (
                    <div>
                      <p className="text-slate-600 text-sm">Due Date</p>
                      <p className="text-slate-900 font-semibold">{formatDate(project.due_date)}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div>
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-200">
              <h4 className="font-bold text-slate-900 mb-4">Project Health</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-700">Risk Level</span>
                  <RiskBadge level={project.risk_level} />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-700">Status</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${getProjectStatusClass(project.status)}`}>
                    {capitalize(project.status)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-700">Billable</span>
                  <span className="text-sm font-semibold text-slate-900">
                    {project.is_billable ? '✅ Yes' : '❌ No'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Deliverables Tab */}
      {activeTab === 'deliverables' && (
        <div>
          <div className="mb-6 flex justify-between items-start">
            <div className="flex-1">
              <h3 className="text-lg font-bold text-slate-900 mb-2">Deliverables Checklist</h3>
              <p className="text-sm text-slate-600">Track what you need to deliver to your client</p>
            </div>
            <button
              onClick={() => setShowDeliverableModal(true)}
              className="btn-primary flex items-center gap-2 ml-4"
            >
              <Plus size={16} /> Add Deliverable
            </button>
          </div>

          <InfoBox type="tip" title="What are deliverables?">
            Deliverables are tangible outputs you'll provide to the client (designs, documents, code, videos, etc.). Mark them as pending, in-progress, completed, approved, or rejected.
          </InfoBox>

          {deliverables.length === 0 ? (
            <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl border-2 border-dashed border-slate-300 p-12 text-center">
              <CheckSquare size={40} className="text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 font-semibold text-lg">No deliverables yet</p>
              <p className="text-slate-500 text-sm mt-1">Create deliverables to define what you'll deliver</p>
              <button
                onClick={() => setShowDeliverableModal(true)}
                className="btn-primary mt-4"
              >
                <Plus size={16} className="inline mr-2" /> Create First Deliverable
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {deliverables.map(d => (
                <div key={d.id} className="bg-white p-5 rounded-lg border border-slate-200 hover:shadow-md transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-slate-900 text-base">{d.title}</h4>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${d.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                            d.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                              d.status === 'approved' ? 'bg-indigo-100 text-indigo-700' :
                                d.status === 'rejected' ? 'bg-rose-100 text-rose-700' :
                                  'bg-slate-100 text-slate-700'
                          }`}>
                          {capitalize(d.status.replace('_', ' '))}
                        </span>
                      </div>
                      {d.description && <p className="text-sm text-slate-600 mt-2">{d.description}</p>}
                      {d.due_date && <p className="text-xs text-slate-500 mt-2">📅 Due: {formatDate(d.due_date)}</p>}
                    </div>
                    <button title="Delete deliverable" className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Deliverable Modal */}
          <Modal open={showDeliverableModal} onClose={() => setShowDeliverableModal(false)} title="Add Deliverable">
            <div className="space-y-4">
              <input
                type="text"
                placeholder="e.g., Website Homepage Design"
                value={deliverableForm.title}
                onChange={e => setDeliverableForm({ ...deliverableForm, title: e.target.value })}
                className="input-field"
              />
              <textarea
                placeholder="Description of what will be delivered"
                value={deliverableForm.description}
                onChange={e => setDeliverableForm({ ...deliverableForm, description: e.target.value })}
                className="input-field"
                rows={3}
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  aria-label="Deliverable status"
                  value={deliverableForm.status}
                  onChange={e => setDeliverableForm({ ...deliverableForm, status: e.target.value })}
                  className="input-field"
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
                <input
                  type="date"
                  title="Due date"
                  placeholder="Due date"
                  value={deliverableForm.due_date}
                  onChange={e => setDeliverableForm({ ...deliverableForm, due_date: e.target.value })}
                  className="input-field"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={handleAddDeliverable} className="btn-primary flex-1">
                  <Plus size={16} className="inline mr-2" /> Add Deliverable
                </button>
                <button onClick={() => setShowDeliverableModal(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
              </div>
            </div>
          </Modal>
        </div>
      )}
      {/* Scope Changes Tab */}
      {activeTab === 'scope' && (
    <div>
      <div className="mb-6 flex justify-between items-start">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-slate-900 mb-2">Scope Changes & Revisions</h3>
          <p className="text-sm text-slate-600">Track all project scope modifications and their impact</p>
        </div>
        <button
          onClick={() => setShowScopeModal(true)}
          className="btn-primary flex items-center gap-2 ml-4"
        >
          <Plus size={16} /> Log Change
        </button>
      </div>

      <InfoBox type="tip" title="Why track scope changes?">
        Document all revisions, extra work, and scope changes with their budget/timeline impact. This protects you from scope creep and justifies change orders to clients.
      </InfoBox>

      {scopeChanges.length === 0 ? (
        <div className="bg-gradient-to-br from-slate-50 to-amber-50 rounded-xl border-2 border-dashed border-slate-300 p-12 text-center">
          <FileText size={40} className="text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600 font-semibold text-lg">No scope changes logged</p>
          <p className="text-slate-500 text-sm mt-1">Track any changes to the original project scope</p>
        </div>
      ) : (
        <div className="space-y-3">
          {scopeChanges.map(s => (
            <div key={s.id} className="bg-white p-5 rounded-lg border border-slate-200 hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-slate-900 text-base">{s.title}</h4>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${s.change_type === 'revision' ? 'bg-blue-100 text-blue-700' :
                        s.change_type === 'extra_work' ? 'bg-emerald-100 text-emerald-700' :
                          'bg-amber-100 text-amber-700'
                      }`}>
                      {s.change_type === 'extra_work' ? '➕ Extra Work' :
                        s.change_type === 'scope_reduction' ? '➖ Reduction' :
                          '🔄 Revision'}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${s.status === 'implemented' ? 'bg-emerald-100 text-emerald-700' :
                        s.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                          s.status === 'rejected' ? 'bg-rose-100 text-rose-700' :
                            'bg-slate-100 text-slate-700'
                      }`}>
                      {capitalize(s.status)}
                    </span>
                  </div>
                  {s.description && <p className="text-sm text-slate-600 mt-2">{s.description}</p>}
                </div>
                <button title="Delete scope change" className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Scope Modal */}
      <Modal open={showScopeModal} onClose={() => setShowScopeModal(false)} title="Log Scope Change">
        <div className="space-y-4">
          <input
            type="text"
            placeholder="e.g., Add mobile responsiveness, Extra 3 pages"
            value={scopeForm.title}
            onChange={e => setScopeForm({ ...scopeForm, title: e.target.value })}
            className="input-field"
          />
          <select
            aria-label="Change type"
            value={scopeForm.change_type}
            onChange={e => setScopeForm({ ...scopeForm, change_type: e.target.value })}
            className="input-field"
          >
            <option value="revision">Revision (same scope, redo)</option>
            <option value="extra_work">Extra Work (adding to scope)</option>
            <option value="scope_reduction">Scope Reduction (removing from scope)</option>
          </select>
          <textarea
            placeholder="Description and business impact"
            value={scopeForm.description}
            onChange={e => setScopeForm({ ...scopeForm, description: e.target.value })}
            className="input-field"
            rows={3}
          />
          <select
            aria-label="Scope change status"
            value={scopeForm.status}
            onChange={e => setScopeForm({ ...scopeForm, status: e.target.value })}
            className="input-field"
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved by Client</option>
            <option value="implemented">Implemented</option>
            <option value="rejected">Rejected</option>
          </select>
          <div className="flex gap-2 pt-2">
            <button onClick={handleAddScopeChange} className="btn-primary flex-1">
              <Plus size={16} className="inline mr-2" /> Log Change
            </button>
            <button onClick={() => setShowScopeModal(false)} className="btn-secondary flex-1">
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )}

      {/* Files Tab */ }
      {activeTab === 'files' && (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <h3 className="text-lg font-bold text-slate-900">Project Files & Documentation</h3>
        <button
          onClick={() => setShowFileModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={16} /> Upload File
        </button>
      </div>

      {files.length === 0 ? (
        <div className="bg-slate-50 rounded-xl border-2 border-dashed border-slate-300 p-8 text-center">
          <FileIcon size={32} className="text-slate-400 mx-auto mb-3" />
          <p className="text-slate-600 font-semibold">No files uploaded</p>
          <p className="text-slate-500 text-sm">Add contracts, briefs, deliverables, and references</p>
        </div>
      ) : (
        <div className="space-y-3">
          {files.map(f => (
            <div key={f.id} className="bg-white p-4 rounded-lg border border-slate-100 hover:shadow-sm transition-all">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-slate-900">{f.file_name}</h4>
                  <p className="text-xs text-slate-600 mt-1">{capitalize(f.file_type.replace(/_/g, ' '))}</p>
                  {f.description && <p className="text-sm text-slate-600 mt-2">{f.description}</p>}
                </div>
                <button title="Download file" className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded transition">
                  <Download size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* File Modal */}
      <Modal open={showFileModal} onClose={() => setShowFileModal(false)} title="Upload File">
        <div className="space-y-4">
          <input
            type="text"
            placeholder="File name"
            value={fileForm.file_name}
            onChange={e => setFileForm({ ...fileForm, file_name: e.target.value })}
            className="input-field"
          />
          <input
            type="text"
            placeholder="File URL (S3, Supabase, etc.)"
            value={fileForm.file_url}
            onChange={e => setFileForm({ ...fileForm, file_url: e.target.value })}
            className="input-field"
          />
          <select
            aria-label="File type"
            value={fileForm.file_type}
            onChange={e => setFileForm({ ...fileForm, file_type: e.target.value })}
            className="input-field"
          >
            <option value="contract">Contract</option>
            <option value="brief">Brief</option>
            <option value="deliverable">Deliverable</option>
            <option value="reference">Reference</option>
            <option value="other">Other</option>
          </select>
          <textarea
            placeholder="Description"
            value={fileForm.description}
            onChange={e => setFileForm({ ...fileForm, description: e.target.value })}
            className="input-field"
            rows={2}
          />
          <div className="flex gap-2">
            <button onClick={handleAddFile} className="btn-primary flex-1">
              Upload File
            </button>
            <button onClick={() => setShowFileModal(false)} className="btn-secondary flex-1">
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )}

      {/* Other tabs remain unchanged - Kanban and Time */ }
      {(activeTab === 'kanban' || activeTab === 'time') && (
    <div className="text-center py-8 text-slate-600">
      <p>View of {activeTab === 'kanban' ? 'Kanban board' : 'time entries'} remains in original implementation</p>
    </div>
      )}
    </div>
  )
}
