import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Zap, Eye, EyeOff, Loader2, User, Mail, Lock, Building, DollarSign, Globe } from 'lucide-react'
import { authApi } from '../api'
import { useAuthStore } from '../store'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    company_name: '',
    currency: 'USD',
    hourly_rate: 50
  })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const { login }               = useAuthStore()
  const navigate                = useNavigate()

  const currencies = [
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
    { code: 'CAD', symbol: '$', name: 'Canadian Dollar' },
    { code: 'AUD', symbol: '$', name: 'Australian Dollar' },
  ]

  // Password validation rules
  const MIN_PASSWORD_LENGTH = 8
  const MAX_PASSWORD_LENGTH = 128

  const isPasswordValid = (pwd: string) => pwd.length >= MIN_PASSWORD_LENGTH

  const getPasswordStrength = (pwd: string) => {
    if (pwd.length < MIN_PASSWORD_LENGTH) return { strength: 'weak', color: 'bg-red-500' }
    if (pwd.length < 12) return { strength: 'good', color: 'bg-blue-500' }
    return { strength: 'strong', color: 'bg-emerald-500' }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ 
      ...prev, 
      [name]: name === 'hourly_rate' ? parseFloat(value) : value 
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation checks
    if (!formData.full_name.trim()) {
      toast.error('Please enter your full name')
      return
    }
    if (!formData.email.includes('@')) {
      toast.error('Please enter a valid email address')
      return
    }
    if (formData.password.length < MIN_PASSWORD_LENGTH) {
      toast.error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long`)
      return
    }
    if (formData.password.length > MAX_PASSWORD_LENGTH) {
      toast.error(`Password must be no more than ${MAX_PASSWORD_LENGTH} characters long`)
      return
    }

    setLoading(true)
    try {
      const res = await authApi.register(formData)
      login(res.data.access_token, res.data.user)
      toast.success(`Welcome to FreelanceOS, ${res.data.user.full_name.split(' ')[0]}!`)
      navigate('/app/dashboard')
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || 'Registration failed. Please try again.'
      toast.error(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Left: Branding Desk */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-slate-900 via-brand-900 to-slate-900 flex-col justify-center px-16 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-brand-400/5 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/4"></div>

        <div className="relative z-10 max-w-lg">
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-2xl">
                <Zap size={24} className="text-brand-400 fill-current" />
              </div>
              <span className="font-display text-3xl font-bold text-white tracking-tight">
                Freelance<span className="text-brand-400">OS</span>
              </span>
            </div>
            
            <h1 className="text-4xl lg:text-5xl font-bold font-display text-white leading-[1.15] mb-6">
              Start building your <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-brand-300">dream business today.</span>
            </h1>
            
            <p className="text-slate-400 text-lg leading-relaxed mb-10">
              Join a community of professionals who have ditched multiple tools for one powerful workspace. Manage everything from one place.
            </p>

            <div className="space-y-6">
              {[
                'Project tracking made simple',
                'Invoicing that gets you paid faster',
                'Detailed analytics on your performance',
                'Secure client management'
              ].map((text, i) => (
                <div key={i} className="flex items-center gap-3 text-slate-300">
                  <div className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-500/20 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-400"></div>
                  </div>
                  <span className="text-sm font-medium">{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Close button */}
      <button 
        onClick={() => navigate('/')}
        title="Back to home"
        className="absolute top-6 right-6 z-50 p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-all"
      >
        <span className="sr-only">Close</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
      </button>

      {/* Right: Registration Form */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-20 xl:px-28 bg-white border-l border-slate-200 py-12 overflow-y-auto animate-fade-in relative">
        <div className="max-w-md w-full mx-auto">
          <div className="lg:hidden mb-8">
             <div className="flex items-center gap-2">
              <Zap size={24} className="text-brand-600 fill-current" />
              <span className="font-display text-xl font-bold text-slate-900">FreelanceOS</span>
            </div>
          </div>

          <div className="mb-10">
            <h2 className="text-3xl font-bold text-slate-900 font-display tracking-tight mb-2">
              Create your account
            </h2>
            <p className="text-slate-500 text-sm">
              Enter your details to set up your professional workspace.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">Full Name</label>
              <div className="relative group">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500" />
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none"
                  placeholder="Enter your full name"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">Email Address</label>
              <div className="relative group">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none"
                  placeholder="Enter your email address"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">Password</label>
              <div className="relative group">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500" />
                <input
                  type={showPass ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  maxLength={MAX_PASSWORD_LENGTH}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-11 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  title={showPass ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              
              {/* Password Strength Indicator */}
              {formData.password && (
                <div className="space-y-2 mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  {/* Strength Bar */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all ${getPasswordStrength(formData.password).color} ${
                          ['weak', 'fair', 'good'].includes(getPasswordStrength(formData.password).strength) 
                            ? 'w-1/4' 
                            : ['fair', 'good'].includes(getPasswordStrength(formData.password).strength) 
                            ? 'w-1/2' 
                            : getPasswordStrength(formData.password).strength === 'strong' 
                            ? 'w-3/4' 
                            : 'w-full'
                        }`}
                      />
                    </div>
                    <span className="text-xs font-bold text-slate-600 capitalize">
                      {getPasswordStrength(formData.password).strength}
                    </span>
                  </div>
                  
                  {/* Requirements Checklist */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      { label: `${MIN_PASSWORD_LENGTH}+ characters`, check: formData.password.length >= MIN_PASSWORD_LENGTH },
                      { label: 'Any letters, numbers, or symbols', check: formData.password.length >= MIN_PASSWORD_LENGTH },
                    ].map((req, i) => (
                      <div key={i} className={`flex items-center gap-1.5 font-medium ${req.check ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {req.check ? (
                          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                        ) : (
                          <div className="w-3.5 h-3.5 border border-current rounded-full flex-shrink-0" />
                        )}
                        {req.label}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Company Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">Company</label>
                <div className="relative group">
                  <Building size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500" />
                  <input
                    type="text"
                    name="company_name"
                    value={formData.company_name}
                    onChange={handleChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none"
                    placeholder="Enter business name (optional)"
                  />
                </div>
              </div>

              {/* Currency */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">Currency</label>
                <div className="relative group">
                  <Globe size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500" />
                  <select
                    name="currency"
                    value={formData.currency}
                    onChange={handleChange}
                    title="Select currency"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none appearance-none"
                  >
                    {currencies.map(c => (
                      <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Hourly Rate */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">Default Hourly Rate</label>
              <div className="relative group">
                <DollarSign size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500" />
                <input
                  type="number"
                  name="hourly_rate"
                  value={formData.hourly_rate}
                  onChange={handleChange}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none"
                  placeholder="e.g. 50"
                  required
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || !isPasswordValid(formData.password)}
                title={!isPasswordValid(formData.password) ? 'Password must meet all requirements' : 'Create your workspace'}
                className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl shadow-lg shadow-brand-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98]">
                {loading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Zap size={18} className="fill-current" />
                )}
                {loading ? 'Creating Workspace...' : 'Create My Workspace'}
              </button>
            </div>
          </form>

          <p className="mt-8 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-600 font-bold hover:underline">
              Sign in instead
            </Link>
          </p>

          <p className="mt-12 text-xs text-slate-400 text-center uppercase tracking-widest font-medium">
            Join 2,500+ professionals
          </p>
        </div>
      </div>
    </div>
  )
}
