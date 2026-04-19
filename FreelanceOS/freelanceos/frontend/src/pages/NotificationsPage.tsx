import { useState, useEffect } from 'react'
import { Bell, Trash2, CheckCircle2, AlertCircle, Info, Clock, CheckCheck } from 'lucide-react'
import { SectionHeader, PageLoader } from '../components/UI'
import { formatDate, classNames } from '../utils'
import toast from 'react-hot-toast'
import { notificationsApi } from '../api'

interface Notification {
  id: number
  type: 'success' | 'warning' | 'error' | 'info' | string
  title: string
  message: string
  created_at: string
  read: boolean
  reference_type?: string
  reference_id?: number
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread' | 'success' | 'warning' | 'error'>('all')

  const fetchNotifications = async () => {
    try {
      setIsLoading(true)
      const res = await notificationsApi.getAll()
      setNotifications(res.data)
    } catch (err: any) {
      toast.error('Failed to load notifications')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
  }, [])

  const filtered = notifications.filter(n => {
    if (filter === 'unread') return !n.read
    if (filter !== 'all') return n.type === filter
    return true
  })

  const unreadCount = notifications.filter(n => !n.read).length

  const handleMarkAsRead = async (id: number) => {
    try {
      await notificationsApi.markRead(id)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    } catch {
      toast.error('Failed to mark as read')
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await notificationsApi.delete(id)
      setNotifications(prev => prev.filter(n => n.id !== id))
      toast.success('Notification deleted')
    } catch {
      toast.error('Failed to delete notification')
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsApi.markAllRead()
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      toast.success('All notifications marked as read')
    } catch {
      toast.error('Failed to update notifications')
    }
  }

  const handleClearAll = async () => {
    try {
      await notificationsApi.deleteAll()
      setNotifications([])
      toast.success('All notifications cleared')
    } catch {
      toast.error('Failed to clear notifications')
    }
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle2 size={20} className="text-emerald-500" />
      case 'warning': return <AlertCircle size={20} className="text-amber-500" />
      case 'error': return <AlertCircle size={20} className="text-red-500" />
      default: return <Info size={20} className="text-blue-500" />
    }
  }

  const getBgColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-emerald-50 border-emerald-200'
      case 'warning': return 'bg-amber-50 border-amber-200'
      case 'error': return 'bg-red-50 border-red-200'
      default: return 'bg-blue-50 border-blue-200'
    }
  }

  if (isLoading) return <PageLoader />

  return (
    <div className="page-container w-full animate-fade-in">
      <SectionHeader
        title="Notifications"
        description={unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up!'}
      />

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {(['all', 'unread', 'success', 'warning', 'error'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={classNames(
              'px-4 py-2 rounded-lg font-semibold text-sm whitespace-nowrap transition-all',
              filter === f
                ? 'bg-brand-600 text-white shadow-lg'
                : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
            )}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Action Buttons */}
      {notifications.length > 0 && (
        <div className="flex gap-3 mb-6">
          <button
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0}
            className="btn-secondary text-sm disabled:opacity-50">
            Mark all as read
          </button>
          <button
            onClick={handleClearAll}
            className="btn-danger text-sm">
            Clear all
          </button>
        </div>
      )}

      {/* Notifications List */}
      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Bell size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-400 text-lg">
            {notifications.length === 0 ? 'No notifications yet' : 'No notifications match your filter'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(notification => (
            <div
              key={notification.id}
              className={classNames(
                'card p-5 border-l-4 transition-all hover:shadow-lg',
                notification.read ? 'opacity-75' : 'ring-1 ring-brand-200',
                notification.type === 'success' && 'border-l-emerald-500 bg-emerald-50/30',
                notification.type === 'warning' && 'border-l-amber-500 bg-amber-50/30',
                notification.type === 'error' && 'border-l-red-500 bg-red-50/30',
                notification.type === 'info' && 'border-l-blue-500 bg-blue-50/30',
              )}>
              <div className="flex gap-4">
                <div className="flex-shrink-0 mt-1">
                  {getIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-1">
                    <h3 className="font-bold text-slate-900">{notification.title}</h3>
                    <span className="text-xs text-slate-400 whitespace-nowrap flex items-center gap-1">
                      <Clock size={12} />
                      {formatDate(notification.created_at, 'short')}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mb-3">{notification.message}</p>
                  <div className="flex gap-2">
                    {notification.reference_id && (
                      <button
                        className="btn-primary text-xs py-1.5 flex items-center gap-1">
                        View Details
                      </button>
                    )}
                    {!notification.read && (
                      <button
                        onClick={() => handleMarkAsRead(notification.id)}
                        className="btn-secondary text-xs py-1.5">
                        Mark as read
                      </button>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(notification.id)}
                  className="flex-shrink-0 p-2 hover:bg-slate-200 rounded-lg transition-colors text-slate-400 hover:text-slate-600">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
