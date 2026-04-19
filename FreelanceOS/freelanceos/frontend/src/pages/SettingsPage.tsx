import { useState, useEffect } from "react"
import { authApi } from "../api"
import { useAuthStore } from "../store"
import { useNavigate } from "react-router-dom"
import { SectionHeader } from "../components/UI"
import { Save, Loader2, Building2, CreditCard, Bell, Eye, Shield, Key, Settings, Download, Trash2, Lock, AlertCircle, ChevronDown, Palette, Upload, X, Image as ImageIcon, LogOut } from "lucide-react"
import toast from "react-hot-toast"

const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "SGD", "INR", "JPY", "CHF", "NZD"]

const SETTINGS_SECTIONS = [
  { id: "business", label: "Business Details", icon: Building2, color: "from-blue-500 to-blue-600" },
  { id: "billing", label: "Invoice Settings", icon: CreditCard, color: "from-emerald-500 to-emerald-600" },
  { id: "notifications", label: "Notifications", icon: Bell, color: "from-amber-500 to-amber-600" },
  { id: "privacy", label: "Privacy & Visibility", icon: Eye, color: "from-purple-500 to-purple-600" },
  { id: "security", label: "Security", icon: Shield, color: "from-red-500 to-red-600" },
]

const TEMPLATES = [
  { id: "professional", name: "Professional", color: "from-slate-600 to-slate-700" },
  { id: "creative", name: "Creative", color: "from-purple-500 to-pink-500" },
  { id: "minimal", name: "Minimal", color: "from-blue-400 to-blue-600" },
  { id: "vibrant", name: "Vibrant", color: "from-amber-400 to-orange-500" },
  { id: "nature", name: "Nature", color: "from-green-500 to-teal-600" },
  { id: "tech", name: "Tech", color: "from-cyan-500 to-blue-600" },
]

export default function SettingsPage() {
  const { user, updateUser, logout } = useAuthStore()
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState("business")
  const [form, setForm] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" })
  const [savingPw, setSavingPw] = useState(false)
  const [notify, setNotify] = useState<any>({})
  const [privacy, setPrivacy] = useState<any>({})
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState(user?.settings_template || "professional")
  const [banner, setBanner] = useState<File | null>(null)
  const [bannerPreview, setBannerPreview] = useState(user?.banner_url || "")
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState("")
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (user) {
      setForm({
        company_name: user.company_name || "",
        currency: user.currency || "USD",
        hourly_rate: user.hourly_rate || 75,
        tax_number: user.tax_number || "",
        invoice_prefix: user.invoice_prefix || "INV",
        invoice_notes: user.invoice_notes || "",
        payment_terms: user.payment_terms || 30,
      })
      setNotify({
        email_invoices: user.email_invoices !== false,
        email_expenses: user.email_expenses !== false,
        email_weekly: user.email_weekly !== false,
        in_app_alerts: user.in_app_alerts !== false,
        daily_digest: user.daily_digest !== false,
      })
      setPrivacy({
        profile_public: user.profile_public !== false,
        show_email: user.show_email !== false,
        show_location: user.show_location !== false,
        show_activity: user.show_activity !== false,
      })
      setSelectedTemplate(user.settings_template || "professional")
      setBannerPreview(user.banner_url || "")
    }
  }, [user])

  const handleSave = async (section: string) => {
    setSaving(true)
    try {
      let updateData = form
      if (section === "notifications") updateData = notify
      else if (section === "privacy") updateData = privacy
      
      const res = await authApi.updateMe(updateData)
      updateUser(res.data)
      toast.success("Settings saved!")
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  const handleChangePw = async () => {
    if (pwForm.next !== pwForm.confirm) return toast.error("Passwords do not match")
    if (pwForm.next.length < 6) return toast.error("Password must be at least 6 characters")
    setSavingPw(true)
    try {
      await authApi.changePassword(pwForm.current, pwForm.next)
      toast.success("Password changed successfully!")
      setPwForm({ current: "", next: "", confirm: "" })
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "Failed to change password")
    } finally {
      setSavingPw(false)
    }
  }

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setBanner(file)
      const reader = new FileReader()
      reader.onload = (event) => setBannerPreview(event.target?.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleSaveTemplate = async () => {
    setSavingTemplate(true)
    try {
      let formData = new FormData()
      formData.append("settings_template", selectedTemplate)
      if (banner) formData.append("banner", banner)

      const res = await authApi.updateMe(Object.fromEntries(formData.entries() as any))
      updateUser(res.data)
      toast.success("Template and banner updated!")
      setShowTemplateModal(false)
      setBanner(null)
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "Failed to update")
    } finally {
      setSavingTemplate(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") {
      toast.error('Type "DELETE" to confirm')
      return
    }
    setDeleting(true)
    try {
      await authApi.deleteAccount()
      toast.success("Account deleted successfully")
      logout()
      navigate("/")
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "Failed to delete account")
    } finally {
      setDeleting(false)
      setShowDeleteConfirm(false)
      setDeleteConfirmText("")
    }
  }

  const handleLogout = () => {
    logout()
    navigate("/")
    toast.success("Logged out successfully")
  }

  const ToggleSwitch = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
    <button onClick={() => onChange(!checked)} className={`relative w-12 h-6 rounded-full transition-colors ${checked ? "bg-brand-500" : "bg-slate-300"}`}>
      <div className={`absolute top-0.5 ${checked ? "right-0.5" : "left-0.5"} w-5 h-5 bg-white rounded-full transition-all shadow-sm`} />
    </button>
  )

  const SectionBtn = ({ section }: any) => {
    const Icon = section.icon
    const isOpen = expanded === section.id
    return (
      <button onClick={() => setExpanded(isOpen ? "" : section.id)} className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${isOpen ? `border-brand-500 bg-gradient-to-r ${section.color} text-white shadow-lg` : "border-slate-200 hover:border-slate-300 bg-white text-slate-900"}`}>
        <div className="flex items-center gap-3">
          <Icon size={20} />
          <span className="font-semibold">{section.label}</span>
        </div>
        <ChevronDown size={20} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
    )
  }

  return (
    <div className="px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <SectionHeader title="Settings" description="Manage your account and preferences" />
        </div>
        <button onClick={() => setShowTemplateModal(true)} className="btn-secondary flex items-center gap-2 flex-shrink-0">
          <Palette size={16} />
          Change Template
        </button>
      </div>

      {/* Template Modal */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-2xl font-bold text-slate-900">Settings Template & Banner</h2>
              <button onClick={() => setShowTemplateModal(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <X size={20} className="text-slate-600" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Banner Upload */}
              <div>
                <h3 className="font-bold text-slate-900 mb-3">Upload Banner</h3>
                <label className="border-2 border-dashed border-slate-300 rounded-xl p-8 cursor-pointer hover:border-brand-500 hover:bg-brand-50 transition-all flex flex-col items-center gap-3">
                  {bannerPreview ? (
                    <>
                      <img src={bannerPreview} alt="Banner preview" className="w-full h-32 object-cover rounded-lg" />
                      <p className="text-sm text-slate-600">Click to change banner</p>
                    </>
                  ) : (
                    <>
                      <ImageIcon size={32} className="text-slate-400" />
                      <p className="text-sm font-semibold text-slate-900">Click to upload banner</p>
                      <p className="text-xs text-slate-500">or drag and drop (JPG, PNG, WebP)</p>
                    </>
                  )}
                  <input type="file" className="hidden" accept="image/*" onChange={handleBannerChange} />
                </label>
              </div>

              {/* Templates */}
              <div>
                <h3 className="font-bold text-slate-900 mb-3">Select Template</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {TEMPLATES.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => setSelectedTemplate(template.id)}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        selectedTemplate === template.id
                          ? "border-brand-500 ring-2 ring-brand-200 scale-105"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className={`h-20 rounded-lg bg-gradient-to-r ${template.color} mb-2`} />
                      <p className="font-semibold text-sm text-slate-900">{template.name}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <button onClick={() => setShowTemplateModal(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button onClick={handleSaveTemplate} className="btn-primary flex-1" disabled={savingTemplate}>
                  {savingTemplate ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Save Template
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {SETTINGS_SECTIONS.map((section) => (
          <div key={section.id}>
            <SectionBtn section={section} />
            {expanded === section.id && (
              <div className="card p-6 mt-2 space-y-4">
                {section.id === "business" && (
                  <>
                    <div className="form-group">
                      <label className="input-label font-semibold">Company Name</label>
                      <input className="input-field" value={form.company_name || ""} onChange={(e) => setForm({ ...form, company_name: e.target.value })} placeholder="Your Company" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="form-group">
                        <label className="input-label font-semibold">Hourly Rate</label>
                        <input type="number" className="input-field" value={form.hourly_rate || ""} onChange={(e) => setForm({ ...form, hourly_rate: Number(e.target.value) })} />
                      </div>
                      <div className="form-group">
                        <label className="input-label font-semibold">Currency</label>
                        <select className="input-field" value={form.currency || "USD"} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                          {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="input-label font-semibold">Tax Number</label>
                        <input className="input-field" value={form.tax_number || ""} onChange={(e) => setForm({ ...form, tax_number: e.target.value })} />
                      </div>
                    </div>
                    <div className="flex justify-end pt-2 border-t border-slate-200">
                      <button onClick={() => handleSave("business")} className="btn-primary" disabled={saving}>
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
                      </button>
                    </div>
                  </>
                )}

                {section.id === "billing" && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="form-group">
                        <label className="input-label font-semibold">Invoice Prefix</label>
                        <input className="input-field" value={form.invoice_prefix || "INV"} onChange={(e) => setForm({ ...form, invoice_prefix: e.target.value })} />
                      </div>
                      <div className="form-group">
                        <label className="input-label font-semibold">Payment Terms (days)</label>
                        <input type="number" className="input-field" value={form.payment_terms || 30} onChange={(e) => setForm({ ...form, payment_terms: Number(e.target.value) })} />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="input-label font-semibold">Invoice Notes</label>
                      <textarea className="input-field resize-none" rows={3} value={form.invoice_notes || ""} onChange={(e) => setForm({ ...form, invoice_notes: e.target.value })} />
                    </div>
                    <div className="flex justify-end pt-2 border-t border-slate-200">
                      <button onClick={() => handleSave("billing")} className="btn-primary" disabled={saving}>
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
                      </button>
                    </div>
                  </>
                )}

                {section.id === "notifications" && (
                  <>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <div>
                          <p className="font-medium text-sm">Invoice Updates</p>
                          <p className="text-xs text-slate-500">When invoices change</p>
                        </div>
                        <ToggleSwitch checked={notify.email_invoices} onChange={(v) => setNotify({...notify, email_invoices: v})} />
                      </div>
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <div>
                          <p className="font-medium text-sm">Expense Alerts</p>
                          <p className="text-xs text-slate-500">New expenses</p>
                        </div>
                        <ToggleSwitch checked={notify.email_expenses} onChange={(v) => setNotify({...notify, email_expenses: v})} />
                      </div>
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <div>
                          <p className="font-medium text-sm">Weekly Summary</p>
                          <p className="text-xs text-slate-500">Weekly digest</p>
                        </div>
                        <ToggleSwitch checked={notify.email_weekly} onChange={(v) => setNotify({...notify, email_weekly: v})} />
                      </div>
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <div>
                          <p className="font-medium text-sm">In-App Alerts</p>
                          <p className="text-xs text-slate-500">Push notifications</p>
                        </div>
                        <ToggleSwitch checked={notify.in_app_alerts} onChange={(v) => setNotify({...notify, in_app_alerts: v})} />
                      </div>
                    </div>
                    <div className="flex justify-end pt-2 border-t border-slate-200">
                      <button onClick={() => handleSave("notifications")} className="btn-primary" disabled={saving}>
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
                      </button>
                    </div>
                  </>
                )}

                {section.id === "privacy" && (
                  <>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <div>
                          <p className="font-medium text-sm">Public Profile</p>
                          <p className="text-xs text-slate-500">Others can see</p>
                        </div>
                        <ToggleSwitch checked={privacy.profile_public} onChange={(v) => setPrivacy({...privacy, profile_public: v})} />
                      </div>
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <div>
                          <p className="font-medium text-sm">Show Email</p>
                          <p className="text-xs text-slate-500">On profile</p>
                        </div>
                        <ToggleSwitch checked={privacy.show_email} onChange={(v) => setPrivacy({...privacy, show_email: v})} />
                      </div>
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <div>
                          <p className="font-medium text-sm">Show Location</p>
                          <p className="text-xs text-slate-500">Publicly</p>
                        </div>
                        <ToggleSwitch checked={privacy.show_location} onChange={(v) => setPrivacy({...privacy, show_location: v})} />
                      </div>
                    </div>
                    <div className="flex justify-end pt-2 border-t border-slate-200">
                      <button onClick={() => handleSave("privacy")} className="btn-primary" disabled={saving}>
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
                      </button>
                    </div>
                  </>
                )}

                {section.id === "security" && (
                  <>
                    <div className="space-y-6">
                      {/* Password Change */}
                      <div>
                        <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                          <Key size={16} />
                          Change Password
                        </h4>
                        <div className="space-y-4">
                          <div className="form-group">
                            <label className="input-label font-semibold">Current Password</label>
                            <input type="password" className="input-field" value={pwForm.current} onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })} />
                          </div>
                          <div className="form-group">
                            <label className="input-label font-semibold">New Password</label>
                            <input type="password" className="input-field" value={pwForm.next} onChange={(e) => setPwForm({ ...pwForm, next: e.target.value })} />
                          </div>
                          <div className="form-group">
                            <label className="input-label font-semibold">Confirm Password</label>
                            <input type="password" className="input-field" value={pwForm.confirm} onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })} />
                          </div>
                          <button onClick={handleChangePw} className="btn-primary w-full" disabled={savingPw}>
                            {savingPw ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />} Change Password
                          </button>
                        </div>
                      </div>

                      <div className="border-t border-slate-200 pt-6" />

                      {/* Logout */}
                      <div>
                        <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                          <LogOut size={16} />
                          Session Management
                        </h4>
                        <button
                          onClick={handleLogout}
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors flex items-center gap-2 w-full justify-center"
                        >
                          <LogOut size={16} />
                          Sign Out
                        </button>
                        <p className="text-xs text-slate-500 mt-2">Sign out from your current session</p>
                      </div>

                      <div className="border-t border-slate-200 pt-6" />

                      {/* Delete Account */}
                      <div>
                        <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2 text-red-600">
                          <AlertCircle size={16} />
                          Delete Account Permanently
                        </h4>
                        <button
                          onClick={() => setShowDeleteConfirm(true)}
                          className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg font-medium transition-colors flex items-center gap-2 border border-red-200 w-full justify-center"
                        >
                          <Trash2 size={16} />
                          Delete My Account
                        </button>
                        <p className="text-xs text-slate-500 mt-2">This action cannot be undone. All your data will be permanently deleted.</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Delete Account Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <AlertCircle size={24} />
              <h2 className="text-xl font-bold">Delete Account?</h2>
            </div>
            <p className="text-slate-600 text-sm">
              This action is <strong>permanent and cannot be reversed</strong>. All your data, including projects, invoices, expenses, and time entries will be permanently deleted.
            </p>
            <div>
              <label className="input-label font-semibold text-sm mb-2">
                Type "DELETE" to confirm
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE"
                className="input-field text-center font-mono tracking-widest"
              />
            </div>
            <div className="flex gap-3 pt-4 border-t border-slate-200">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false)
                  setDeleteConfirmText("")
                }}
                className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting || deleteConfirmText !== "DELETE"}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                {deleting ? "Deleting..." : "Delete Account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
