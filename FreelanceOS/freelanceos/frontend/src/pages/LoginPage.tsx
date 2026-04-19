import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Zap, Eye, EyeOff, Loader2, Mail, Lock, CheckCircle, ArrowRight } from 'lucide-react'
import { authApi } from '../api'
import { useAuthStore } from '../store'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const { login }               = useAuthStore()
  const navigate                = useNavigate()

  const isFormValid = email.includes('@') && password.length >= 6

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email.includes('@')) {
      toast.error('Please enter a valid email address')
      return
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    try {
      const res = await authApi.login(email, password)
      login(res.data.access_token, res.data.user)
      
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email)
      } else {
        localStorage.removeItem('rememberedEmail')
      }

      toast.success(`Welcome back, ${res.data.user.full_name.split(' ')[0]}!`)
      navigate('/app/dashboard')
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || 'Invalid email or password. Please try again.'
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
              Your workspace is <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-brand-300">waiting for you.</span>
            </h1>
            
            <p className="text-slate-400 text-lg leading-relaxed mb-10">
              Sign in to continue managing your projects, invoices, and business growth.
            </p>

            <div className="space-y-6">
              {[
                { icon: '⏱️', title: 'Precision Tracking', desc: 'Capture every billable minute' },
                { icon: '🧾', title: 'Smart Invoicing', desc: 'Auto-generate professional PDFs' },
                { icon: '📊', title: 'Live Analytics', desc: 'Real-time business insights' },
                { icon: '👥', title: 'Client Management', desc: 'Unified CRM for all clients' }
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm hover:bg-white/10 transition-all">
                  <span className="text-2xl">{item.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-white">{item.title}</p>
                    <p className="text-xs text-slate-400">{item.desc}</p>
                  </div>
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

      {/* Right: Login Form */}
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
              Welcome back
            </h2>
            <p className="text-slate-500 text-sm">
              Sign in to your workspace and continue managing your business.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider ml-1">Email Address</label>
              <div className="relative group">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all outline-none"
                  placeholder="Enter your email address"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between ml-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Password</label>
                <Link to="#" className="text-xs text-brand-600 font-bold hover:underline">Forgot?</Link>
              </div>
              <div className="relative group">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-500" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
            </div>

            {/* Remember Me */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="remember"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
              />
              <label htmlFor="remember" className="text-xs font-medium text-slate-600 cursor-pointer">
                Remember me on this device
              </label>
            </div>

            {/* Sign In Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || !isFormValid}
                title={!isFormValid ? 'Please enter a valid email and password' : 'Sign in to your account'}
                className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl shadow-lg shadow-brand-500/25 flex items-center justify-center gap-2 transition-all active:scale-[0.98]">
                {loading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <ArrowRight size={18} />
                )}
                {loading ? 'Signing in...' : 'Sign In to FreelanceOS'}
              </button>
            </div>
          </form>

          <p className="mt-8 text-center text-sm text-slate-500">
            Don't have an account?{' '}
            <Link to="/register" className="text-brand-600 font-bold hover:underline">
              Create one for free
            </Link>
          </p>

          <div className="mt-8 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3">
            <CheckCircle size={18} className="text-emerald-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-emerald-800 leading-relaxed font-medium">
              Your account is protected with AES-256 encryption. We never store passwords in plain text.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
