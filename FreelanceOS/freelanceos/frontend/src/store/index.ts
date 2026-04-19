import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: number
  email: string
  full_name: string
  first_name?: string
  last_name?: string
  company_name?: string
  currency: string
  hourly_rate: number
  avatar_url?: string
  phone?: string
  address?: string
  city?: string
  location?: string
  country?: string
  bio?: string
  job_title?: string
  website?: string
  tax_number?: string
  invoice_prefix?: string
  invoice_notes?: string
  payment_terms?: number
  workspaces?: { id: number; name: string; slug: string }[]
  email_weekly?: boolean
  in_app_alerts?: boolean
  daily_digest?: boolean
  profile_public?: boolean
  show_email?: boolean
  show_location?: boolean
  show_activity?: boolean
  settings_template?: string
  banner_url?: string
  skills?: string
  email_invoices?: boolean
  email_expenses?: boolean
}

interface AuthState {
  token: string | null
  user: User | null
  activeWorkspaceId: number | null
  isAuthenticated: boolean
  login: (token: string, user: User, workspaceId?: number | string | null) => void
  logout: () => void
  setActiveWorkspace: (workspaceId: number) => void
  updateUser: (user: Partial<User>) => void
}

const parseWorkspaceId = (value: number | string | null | undefined): number | null => {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const normalized = String(value).trim().toLowerCase()
  if (!normalized || ['null', 'undefined', 'none'].includes(normalized)) return null
  const num = Number(normalized)
  return Number.isInteger(num) ? num : null
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: localStorage.getItem('flos_token'),
      user: null,
      activeWorkspaceId: (() => {
        const raw = localStorage.getItem('flos_workspace_id')
        const parsed = parseWorkspaceId(raw)
        if (raw && parsed === null) {
          localStorage.removeItem('flos_workspace_id')
        }
        return parsed
      })(),
      isAuthenticated: !!localStorage.getItem('flos_token'),
      login: (token, user, workspaceId) => {
        localStorage.setItem('flos_token', token)
        const activeWId = parseWorkspaceId(workspaceId) || (user.workspaces && user.workspaces[0]?.id) || null
        if (activeWId !== null) {
          localStorage.setItem('flos_workspace_id', String(activeWId))
        }
        set({ token, user, activeWorkspaceId: activeWId, isAuthenticated: true })
      },
      logout: () => {
        localStorage.removeItem('flos_token')
        localStorage.removeItem('flos_workspace_id')
        set({ token: null, user: null, activeWorkspaceId: null, isAuthenticated: false })
      },
      setActiveWorkspace: (workspaceId) => {
        localStorage.setItem('flos_workspace_id', String(workspaceId))
        set({ activeWorkspaceId: workspaceId })
      },
      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
    }),
    {
      name: 'freelanceos-auth',
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
)

// ─── UI State ─────────────────────────────────────────────────────────────
interface UIState {
  sidebarCollapsed: boolean
  activeTimer: {
    running: boolean
    startTime: number | null
    projectId: number | null
    projectName: string
    description: string
  }
  toggleSidebar: () => void
  startTimer: (projectId: number | null, projectName: string, description: string) => void
  stopTimer: () => { durationMinutes: number; projectId: number | null } | null
  updateTimerDescription: (description: string) => void
}

export const useUIStore = create<UIState>()((set, get) => ({
  sidebarCollapsed: false,
  activeTimer: {
    running: false,
    startTime: null,
    projectId: null,
    projectName: '',
    description: '',
  },
  toggleSidebar: () =>
    set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  startTimer: (projectId, projectName, description) =>
    set({
      activeTimer: {
        running: true,
        startTime: Date.now(),
        projectId,
        projectName,
        description,
      },
    }),

  stopTimer: () => {
    const { activeTimer } = get()
    if (!activeTimer.running || !activeTimer.startTime) return null
    const durationMs = Date.now() - activeTimer.startTime
    const durationMinutes = Math.round(durationMs / 60000)
    const result = {
      durationMinutes,
      projectId: activeTimer.projectId,
    }
    set({
      activeTimer: {
        running: false,
        startTime: null,
        projectId: null,
        projectName: '',
        description: '',
      },
    })
    return result
  },

  updateTimerDescription: (description) =>
    set((s) => ({
      activeTimer: { ...s.activeTimer, description },
    })),
}))
