import { useState, useEffect } from "react"
import { authApi } from "../api"
import { useAuthStore } from "../store"
import { SectionHeader } from "../components/UI"
import { Upload, Save, Loader2, Edit3, X, Mail, MapPin, Globe, Briefcase, Award, Calendar, Image as ImageIcon, Check } from "lucide-react"
import toast from "react-hot-toast"

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore()
  const [editMode, setEditMode] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<any>({})
  const [avatar, setAvatar] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar_url)

  useEffect(() => {
    if (user) {
      setForm({
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        email: user.email || "",
        phone: user.phone || "",
        location: user.location || "",
        bio: user.bio || "",
        website: user.website || "",
        company_name: user.company_name || "",
        job_title: user.job_title || "",
        skills: user.skills ? (typeof user.skills === 'string' ? user.skills.split(',').map((s: string) => s.trim()) : user.skills) : [],
      })
      setAvatarPreview(user.avatar_url)
    }
  }, [user])

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatar(file)
      const reader = new FileReader()
      reader.onload = (e) => setAvatarPreview(e.target?.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      let formData = new FormData()
      formData.append("first_name", form.first_name)
      formData.append("last_name", form.last_name)
      formData.append("phone", form.phone)
      formData.append("location", form.location)
      formData.append("bio", form.bio)
      formData.append("website", form.website)
      formData.append("job_title", form.job_title)
      formData.append("company_name", form.company_name)
      formData.append("skills", Array.isArray(form.skills) ? form.skills.join(',') : form.skills)
      if (avatar) formData.append("avatar", avatar)

      const res = await authApi.updateMe(Object.fromEntries(formData.entries() as any))
      updateUser(res.data)
      toast.success("Profile updated!")
      setEditMode(false)
      setAvatar(null)
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "Failed to update profile")
    } finally {
      setLoading(false)
    }
  }

  const TEMPLATES = [
    { id: "professional", name: "Professional", color: "from-slate-600 to-slate-700", bg: "bg-slate-50" },
  ]

  // Use professional template as default for profile display
  const currentTemplate = TEMPLATES[0]

  const completionPercent = Math.round(
    ((form.first_name ? 1 : 0) +
      (form.last_name ? 1 : 0) +
      (form.email ? 1 : 0) +
      (form.phone ? 1 : 0) +
      (form.job_title ? 1 : 0) +
      (avatarPreview ? 1 : 0) +
      (Array.isArray(form.skills) && form.skills.length > 0 ? 1 : 0)) / 7 * 100
  )

  return (
    <div className="px-6 py-8 space-y-6">
      <SectionHeader title="My Profile" description="Create a professional profile that represents you" />

      {/* Profile Header Card - NOT Just A Gradient! */}
      <div className={`card overflow-hidden border-2 border-slate-200 ${currentTemplate.bg}`}>
        <div className={`h-32 bg-gradient-to-r ${currentTemplate.color}`} />
        
        <div className="px-6 py-0 relative">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-end -mt-16 mb-6">
            {/* Avatar */}
            <div className="relative">
              <div className="w-32 h-32 rounded-xl border-4 border-white shadow-lg bg-gradient-to-br from-slate-200 to-slate-300 overflow-hidden flex items-center justify-center">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon size={48} className="text-slate-400" />
                )}
              </div>
              {editMode && (
                <label className="absolute bottom-0 right-0 p-2 bg-brand-500 text-white rounded-lg cursor-pointer hover:bg-brand-600 transition-colors shadow-lg">
                  <Upload size={16} />
                  <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
                </label>
              )}
            </div>

            {/* Name & Title */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-slate-900">{form.first_name} {form.last_name}</h1>
              <p className="text-lg font-semibold text-brand-600 mt-1">{form.job_title || "No job title yet"}</p>
              <p className="text-sm text-slate-500 mt-2">{form.company_name || "Add your company"}</p>
            </div>

            {editMode ? (
              <button onClick={handleSave} className="btn-primary flex-shrink-0" disabled={loading}>
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save Profile
              </button>
            ) : (
              <button onClick={() => setEditMode(true)} className="btn-secondary flex-shrink-0">
                <Edit3 size={14} />
                Edit Profile
              </button>
            )}
          </div>

          {/* Completion Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-6 border-t border-slate-200 pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-brand-600">{completionPercent}%</div>
              <p className="text-xs text-slate-500 mt-1">Complete</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-400 font-medium mb-1">Email</p>
              <p className="text-sm font-bold text-slate-900 truncate px-1">{form.email || "—"}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-400 font-medium mb-1">Phone</p>
              <p className="text-sm font-bold text-slate-900 truncate px-1">{form.phone || "—"}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-400 font-medium mb-1">Avatar</p>
              <p className="text-sm font-bold text-slate-900">{avatarPreview ? "✓ Set" : "—"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Mode Form */}
      {editMode && (
        <div className="card p-6 space-y-6 border-2 border-blue-200 bg-blue-50">
          <div>
            <h3 className="font-bold text-slate-900 mb-4">Edit Your Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-group">
                <label className="input-label font-semibold">First Name</label>
                <input className="input-field" value={form.first_name} onChange={(e) => setForm({...form, first_name: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="input-label font-semibold">Last Name</label>
                <input className="input-field" value={form.last_name} onChange={(e) => setForm({...form, last_name: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="input-label font-semibold">Job Title</label>
                <input className="input-field" value={form.job_title} onChange={(e) => setForm({...form, job_title: e.target.value})} placeholder="Software Engineer" />
              </div>
              <div className="form-group">
                <label className="input-label font-semibold">Company</label>
                <input className="input-field" value={form.company_name} onChange={(e) => setForm({...form, company_name: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="input-label font-semibold">Email</label>
                <input type="email" className="input-field" value={form.email} disabled />
              </div>
              <div className="form-group">
                <label className="input-label font-semibold">Phone</label>
                <input type="tel" className="input-field" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="input-label font-semibold">Location</label>
                <input className="input-field" value={form.location} onChange={(e) => setForm({...form, location: e.target.value})} placeholder="New York, USA" />
              </div>
              <div className="form-group">
                <label className="input-label font-semibold">Website/Portfolio</label>
                <input className="input-field" value={form.website} onChange={(e) => setForm({...form, website: e.target.value})} placeholder="https://yoursite.com" />
              </div>
            </div>
            <div className="form-group">
              <label className="input-label font-semibold">Bio / About You</label>
              <textarea className="input-field resize-none" rows={4} value={form.bio} onChange={(e) => setForm({...form, bio: e.target.value})} placeholder="Tell clients about yourself..." />
            </div>

            {/* Skills Input */}
            <div className="form-group">
              <label className="input-label font-semibold">Skills & Expertise</label>
              <div className="space-y-2">
                <textarea 
                  className="input-field resize-none" 
                  rows={3} 
                  value={Array.isArray(form.skills) ? form.skills.join(', ') : form.skills || ''}
                  onChange={(e) => setForm({...form, skills: e.target.value.split(',').map(s => s.trim()).filter(s => s)})}
                  placeholder="Enter skills separated by commas. E.g. React, TypeScript, UI Design" 
                />
                <p className="text-xs text-slate-500">Separate multiple skills with commas</p>
                {Array.isArray(form.skills) && form.skills.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {form.skills.map((skill: string, i: number) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-1 bg-brand-50 border border-brand-200 rounded-full text-sm font-medium text-brand-700">
                        {skill}
                        <button
                          type="button"
                          onClick={() => setForm({...form, skills: form.skills.filter((_: string, idx: number) => idx !== i)})}
                          className="hover:text-brand-900 font-bold"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2 pt-2 border-t border-slate-200">
              <button onClick={handleSave} className="btn-primary flex-1" disabled={loading}>
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save Changes
              </button>
              <button onClick={() => setEditMode(false)} className="btn-secondary flex-1">
                <X size={14} /> Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contact & Info Cards */}
      {!editMode && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {form.location && (
              <div className="card p-4 flex items-center gap-3 border-l-4 border-slate-400">
                <MapPin size={24} className="text-slate-500 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-500">Location</p>
                  <p className="font-semibold text-slate-900">{form.location}</p>
                </div>
              </div>
            )}
            {form.phone && (
              <div className="card p-4 flex items-center gap-3 border-l-4 border-brand-400">
                <Calendar size={24} className="text-brand-500 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-500">Phone</p>
                  <p className="font-semibold text-slate-900">{form.phone}</p>
                </div>
              </div>
            )}
            {form.website && (
              <div className="card p-4 flex items-center gap-3 border-l-4 border-blue-400">
                <Globe size={24} className="text-blue-500 flex-shrink-0" />
                <div>
                  <p className="text-xs text-slate-500">Website</p>
                  <a href={form.website} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-600 hover:underline truncate">
                    {form.website}
                  </a>
                </div>
              </div>
            )}
            <div className="card p-4 flex items-center gap-3 border-l-4 border-green-400">
              <Mail size={24} className="text-green-500 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Email</p>
                <p className="font-semibold text-slate-900 truncate">{form.email}</p>
              </div>
            </div>
          </div>

          {/* Bio Section */}
          {form.bio && (
            <div className="card p-6">
              <h3 className="font-bold text-slate-900 mb-3">About</h3>
              <p className="text-slate-600 leading-relaxed">{form.bio}</p>
            </div>
          )}

          {/* Skills Section */}
          {Array.isArray(form.skills) && form.skills.length > 0 && (
            <div className="card p-6">
              <h3 className="font-bold text-slate-900 mb-4">Skills & Expertise</h3>
              <div className="flex flex-wrap gap-2">
                {form.skills.map((skill: string, i: number) => (
                  <span key={i} className="px-4 py-2 bg-brand-50 border border-brand-200 rounded-full text-sm font-semibold text-brand-700">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
