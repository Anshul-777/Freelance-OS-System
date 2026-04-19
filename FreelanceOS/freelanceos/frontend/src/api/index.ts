import axios from 'axios'

// Use environment variable or default to backend URL
// Development: uses local proxy via Vite (/api goes to localhost:8000)
// Production: uses the live Render backend URL
const BASE_URL = import.meta.env.VITE_API_URL || 
                 (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
                   ? 'https://freelance-os-system.onrender.com/api'
                   : '/api')

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Attach token and workspace on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('flos_token')
  const workspaceIdRaw = localStorage.getItem('flos_workspace_id')
  const workspaceId = workspaceIdRaw && !['null', 'undefined', 'none'].includes(workspaceIdRaw.toLowerCase())
    ? Number(workspaceIdRaw)
    : null

  if (token) config.headers.Authorization = `Bearer ${token}`
  if (workspaceId !== null && !Number.isNaN(workspaceId)) {
    config.headers['X-Workspace-Id'] = workspaceId
  } else if (workspaceIdRaw !== null) {
    localStorage.removeItem('flos_workspace_id')
  }

  return config
})

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('flos_token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ─── Auth ─────────────────────────────────────────────────────────────────
export const authApi = {
  login:           (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register:        (data: any) =>
    api.post('/auth/register', data),
  me:              () => api.get('/auth/me'),
  updateMe:        (data: any) => api.put('/auth/me', data),
  changePassword:  (current: string, next: string) =>
    api.post(`/auth/change-password?current_password=${current}&new_password=${next}`),
  deleteAccount:   () =>
    api.delete('/auth/me'),
}

// ─── Dashboard ────────────────────────────────────────────────────────────
export const dashboardApi = {
  get: () => api.get('/dashboard'),
}

// ─── Projects ─────────────────────────────────────────────────────────────
export const projectsApi = {
  list:   (params?: any) => api.get('/projects', { params }),
  get:    (id: number | string)   => api.get(`/projects/${id}`),
  create: (data: any)    => api.post('/projects', data),
  update: (id: number, data: any) => api.put(`/projects/${id}`, data),
  delete: (id: number)   => api.delete(`/projects/${id}`),
  getDetail: (id: number) => api.get(`/projects/${id}/detail`),

  listTasks:   (projectId: number) => api.get(`/projects/${projectId}/tasks`),
  createTask:  (projectId: number, data: any) => api.post(`/projects/${projectId}/tasks`, data),
  updateTask:  (taskId: number, data: any) => api.put(`/projects/tasks/${taskId}`, data),
  deleteTask:  (taskId: number) => api.delete(`/projects/tasks/${taskId}`),

  // Deliverables
  createDeliverable: (projectId: number, data: any) => api.post(`/projects/${projectId}/deliverables`, data),
  updateDeliverable: (projectId: number, delId: number, data: any) => api.put(`/projects/${projectId}/deliverables/${delId}`, data),
  deleteDeliverable: (projectId: number, delId: number) => api.delete(`/projects/${projectId}/deliverables/${delId}`),

  // Scope Changes
  createScopeChange: (projectId: number, data: any) => api.post(`/projects/${projectId}/scope-changes`, data),
  updateScopeChange: (projectId: number, changeId: number, data: any) => api.put(`/projects/${projectId}/scope-changes/${changeId}`, data),
  deleteScopeChange: (projectId: number, changeId: number) => api.delete(`/projects/${projectId}/scope-changes/${changeId}`),

  // Project Files
  createFile: (projectId: number, data: any) => api.post(`/projects/${projectId}/files`, data),
  listFiles: (projectId: number, fileType?: string) => api.get(`/projects/${projectId}/files`, { params: { file_type: fileType } }),
  deleteFile: (projectId: number, fileId: number) => api.delete(`/projects/${projectId}/files/${fileId}`),
}

// ─── Clients ───────────────────────────────────────────────────────────────
export const clientsApi = {
  list:   (params?: any) => api.get('/clients', { params }),
  get:    (id: number)   => api.get(`/clients/${id}`),
  create: (data: any)    => api.post('/clients', data),
  update: (id: number, data: any) => api.put(`/clients/${id}`, data),
  delete: (id: number)   => api.delete(`/clients/${id}`),
  getNotes:  (id: number) => api.get(`/clients/${id}/notes`),
  addNote:   (id: number, content: string) =>
    api.post(`/clients/${id}/notes?content=${encodeURIComponent(content)}`),
}

// ─── Time Entries ──────────────────────────────────────────────────────────
export const timeApi = {
  list:    (params?: any) => api.get('/time-entries', { params }),
  get:     (id: number)   => api.get(`/time-entries/${id}`),
  create:  (data: any)    => api.post('/time-entries', data),
  update:  (id: number, data: any) => api.put(`/time-entries/${id}`, data),
  delete:  (id: number)   => api.delete(`/time-entries/${id}`),
  summary: (period: string) => api.get(`/time-entries/summary?period=${period}`),
}

// ─── Invoices ──────────────────────────────────────────────────────────────
export const invoicesApi = {
  list:       (params?: any) => api.get('/invoices', { params }),
  get:        (id: number)   => api.get(`/invoices/${id}`),
  getDetail:  (id: number)   => api.get(`/invoices/${id}/detail`),
  create:     (data: any)    => api.post('/invoices', data),
  update:     (id: number, data: any) => api.put(`/invoices/${id}`, data),
  delete:     (id: number)   => api.delete(`/invoices/${id}`),
  markSent:   (id: number)   => api.post(`/invoices/${id}/mark-sent`),
  markPaid:   (id: number, paid_date?: string) =>
    api.post(`/invoices/${id}/mark-paid${paid_date ? `?paid_date=${paid_date}` : ''}`),
  recordPayment: (id: number, data: any) =>
    api.post(`/invoices/${id}/record-payment`, data),
  sendReminder: (id: number) =>
    api.post(`/invoices/${id}/send-reminder`),
  duplicate:  (id: number, dates?: any) =>
    api.post(`/invoices/${id}/duplicate`, dates || {}),
  downloadPdf:(id: number)   =>
    api.get(`/invoices/${id}/pdf`, { responseType: 'blob' }),
  getAvailableTimeEntries: (projectId?: number) =>
    api.get('/invoices/available-time-entries', { params: projectId ? { project_id: projectId } : undefined }),
  getAnalytics: (params?: any) =>
    api.get('/invoices/analytics/summary', { params }),
}

// ─── Expenses ──────────────────────────────────────────────────────────────
export const expensesApi = {
  axios:   api, // Special export for binary data (PDF/CSV)
  list:    (params?: any) => api.get('/expenses', { params }),
  get:     (id: number)   => api.get(`/expenses/${id}`),
  create:  (data: any)    => api.post('/expenses', data),
  update:  (id: number, data: any) => api.put(`/expenses/${id}`, data),
  delete:  (id: number)   => api.delete(`/expenses/${id}`),
  summary: (params?: any) => api.get('/expenses/summary', { params }),
}

// ─── Recurring Expenses ───────────────────────────────────────────────────
export const recurringExpensesApi = {
  list:   () => api.get('/recurring-expenses'),
  create: (data: any) => api.post('/recurring-expenses', data),
  update: (id: number, data: any) => api.put(`/recurring-expenses/${id}`, data),
  delete: (id: number) => api.delete(`/recurring-expenses/${id}`),
}

// ─── Analytics ─────────────────────────────────────────────────────────────
export const analyticsApi = {
  get: (year?: number) => api.get(`/analytics${year ? `?year=${year}` : ''}`),
}

export const notificationsApi = {
  getAll: () => api.get('/notifications'),
  markRead: (id: number) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
  delete: (id: number) => api.delete(`/notifications/${id}`),
  deleteAll: () => api.delete('/notifications'),
}

export default api
