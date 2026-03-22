import { useEffect, Component } from 'react'

// ── Toast ─────────────────────────────────────────────────────────────────────
export function Toast({ msg, type = 'success', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500)
    return () => clearTimeout(t)
  }, [onClose])

  const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' }
  return (
    <div className={`toast toast-${type}`} role="alert">
      <span style={{ fontWeight: 700 }}>{icons[type] ?? '•'}</span>
      <span style={{ flex: 1 }}>{msg}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none',
        color: 'inherit', cursor: 'pointer', opacity: .6, fontSize: 14, padding: 0 }}>✕</button>
    </div>
  )
}

// ── Loading ───────────────────────────────────────────────────────────────────
export function LoadingSpinner({ size = 24 }) {
  return (
    <>
      <span style={{
        display: 'inline-block', width: size, height: size,
        border: '2px solid var(--border)',
        borderTop: '2px solid var(--orange)',
        borderRadius: '50%',
        animation: 'spin .7s linear infinite',
      }}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </>
  )
}

export function LoadingPage({ message = 'Loading…' }) {
  return (
    <div className="empty">
      <LoadingSpinner size={32}/>
      <div className="empty-sub" style={{ marginTop: 8 }}>{message}</div>
    </div>
  )
}

export function LoadingRow({ cols = 5 }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} style={{ padding: '13px 16px' }}>
          <div style={{
            height: 14, borderRadius: 4,
            background: 'var(--navy3)',
            animation: 'pulse 1.4s ease-in-out infinite',
            width: i === 0 ? '60%' : i === cols - 1 ? '30%' : '80%',
          }}/>
        </td>
      ))}
      <style>{`@keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}`}</style>
    </tr>
  )
}

// ── Empty & Error states ──────────────────────────────────────────────────────
export function EmptyState({ icon = '📭', title, subtitle, action }) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      {title    && <div className="empty-title">{title}</div>}
      {subtitle && <div className="empty-sub">{subtitle}</div>}
      {action   && <div style={{ marginTop: 12 }}>{action}</div>}
    </div>
  )
}

export function PageError({ error, onRetry, resetError }) {
  const retry = onRetry ?? resetError
  return (
    <div className="empty">
      <div className="empty-icon" style={{ color: 'var(--red)' }}>⚠️</div>
      <div className="empty-title">Failed to load data</div>
      <div className="empty-sub">{error?.message || 'An unexpected error occurred.'}</div>
      {retry && (
        <button className="btn btn-secondary" style={{ marginTop: 12 }} onClick={retry}>
          ↺ Retry
        </button>
      )}
    </div>
  )
}

export function ErrorMessage({ error, onRetry }) {
  return <PageError error={error} onRetry={onRetry}/>
}

// ── Confirm modal ─────────────────────────────────────────────────────────────
export function ConfirmModal({
  title,
  message,
  onConfirm,
  onCancel,
  loading    = false,
  confirmLabel = 'Delete',
  danger     = true,
}) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="modal" style={{ maxWidth: 420 }}>
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <button className="btn-icon" onClick={onCancel}>✕</button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: 14, color: 'var(--text2)', lineHeight: 1.6 }}>{message}</p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Badges ────────────────────────────────────────────────────────────────────
const STATUS_MAP = {
  DRAFT:     'badge-draft',
  SENT:      'badge-sent',
  APPROVED:  'badge-approved',
  REJECTED:  'badge-rejected',
  COMPLETED: 'badge-completed',
}

export function StatusBadge({ status }) {
  const key = (status ?? '').toUpperCase()
  const cls = STATUS_MAP[key] ?? 'badge-draft'
  const label = status ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase() : '—'
  return <span className={`badge ${cls}`}>{label}</span>
}

export function PaymentBadge({ status }) {
  const map = {
    PAID:    ['badge-approved', 'Paid'],
    PARTIAL: ['badge-orange',   'Partial'],
    UNPAID:  ['badge-draft',    'Unpaid'],
  }
  const [cls, label] = map[status] ?? ['badge-draft', status ?? '—']
  return <span className={`badge ${cls}`}>{label}</span>
}

// ── Stat card ─────────────────────────────────────────────────────────────────
export function StatCard({ color, icon, value, label, sub }) {
  return (
    <div className={`stat-card ${color}`}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-val">{value}</div>
      <div className="stat-lbl">{label}</div>
      {sub && <div className="stat-change">{sub}</div>}
    </div>
  )
}

// ── Field error (from API validation) ────────────────────────────────────────
export function FieldError({ errors, field }) {
  const msgs = errors?.[field]
  if (!msgs?.length) return null
  return (
    <div style={{ fontSize: 11.5, color: 'var(--red)', marginTop: 4 }}>
      {Array.isArray(msgs) ? msgs.join(', ') : msgs}
    </div>
  )
}

// ── Error boundary ────────────────────────────────────────────────────────────
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  reset = () => this.setState({ hasError: false, error: null })

  render() {
    if (this.state.hasError) {
      return <PageError error={this.state.error} resetError={this.reset}/>
    }
    return this.props.children
  }
}
