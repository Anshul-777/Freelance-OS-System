import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store'
import { AppLayout } from './components/Layout/AppLayout'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import ProjectsPage from './pages/ProjectsPage'
import ProjectDetailPageEnhanced from './pages/ProjectDetailPageEnhanced'
import ClientsPage from './pages/ClientsPage'
import TimeTrackerPage from './pages/TimeTrackerPage'
import InvoicesPage from './pages/InvoicesPage'
import InvoiceDetailPage from './pages/InvoiceDetailPage'
import InvoiceAnalyticsPage from './pages/InvoiceAnalyticsPage'
import ExpensesPage from './pages/ExpensesPage'
import ExpenseDetailPage from './pages/ExpenseDetailPage'
import AnalyticsPage from './pages/AnalyticsPage'
import SettingsPage from './pages/SettingsPage'
import ProfilePage from './pages/ProfilePage'
import NotificationsPage from './pages/NotificationsPage'
import LandingPage from './pages/LandingPage'
import NotFoundPage from './pages/NotFoundPage'

export default function App() {
  const { isAuthenticated } = useAuthStore()
  return <BrowserRouter><Routes><Route path="/" element={<LandingPage />} /><Route path="/login" element={isAuthenticated ? <Navigate to="/app/dashboard" replace /> : <LoginPage />} /><Route path="/register" element={isAuthenticated ? <Navigate to="/app/dashboard" replace /> : <RegisterPage />} /><Route path="/settings" element={<Navigate to="/app/settings" replace />} /><Route path="/app" element={isAuthenticated ? <AppLayout /> : <Navigate to="/login" replace />}><Route path="dashboard" element={<DashboardPage />} /><Route path="projects" element={<ProjectsPage />} /><Route path="projects/:id" element={<ProjectDetailPageEnhanced />} /><Route path="clients" element={<ClientsPage />} /><Route path="time-tracker" element={<TimeTrackerPage />} /><Route path="invoices" element={<InvoicesPage />} /><Route path="invoices/:id" element={<InvoiceDetailPage />} /><Route path="invoices/analytics" element={<InvoiceAnalyticsPage />} /><Route path="expenses" element={<ExpensesPage />} /><Route path="expenses/:id" element={<ExpenseDetailPage />} /><Route path="analytics" element={<AnalyticsPage />} /><Route path="notifications" element={<NotificationsPage />} /><Route path="profile" element={<ProfilePage />} /><Route path="settings" element={<SettingsPage />} /><Route path="" element={<Navigate to="dashboard" replace />} /></Route><Route path="*" element={<NotFoundPage />} /></Routes></BrowserRouter>
}
