// ── Currency ──────────────────────────────────────────────────────────────────
export const fmt = (n) => {
  const num = Number(n ?? 0)
  if (isNaN(num)) return '₱0'
  return '₱' + num.toLocaleString('en-PH', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

// ── Percent (0.0 → "0.0%") ────────────────────────────────────────────────────
export const fmtPct = (n, decimals = 1) => {
  const num = Number(n ?? 0)
  return isNaN(num) ? '0.0%' : num.toFixed(decimals) + '%'
}

// ── Progress bar width string ─────────────────────────────────────────────────
export const pct = (a, b) => {
  if (!b || b === 0) return '0%'
  return Math.min(100, Math.max(0, (Number(a) / Number(b)) * 100)).toFixed(1) + '%'
}

// ── Quotation profit calculations ─────────────────────────────────────────────
/**
 * Accepts either:
 *   - A frontend form object  { items: [{cost, price, qty}], discount }
 *   - A backend DTO           { totalCost, grossPrice, profit, margin } (pre-computed)
 */
export const quoteProfit = (q) => {
  if (!q) return { totalCost: 0, totalPrice: 0, gross: 0, profit: 0, margin: '0.0' }

  // If backend pre-computed the financials, use those directly
  if (q.grossPrice !== undefined) {
    return {
      totalCost:  Number(q.totalCost  ?? 0),
      totalPrice: Number(q.totalPrice ?? 0),
      gross:      Number(q.grossPrice ?? 0),
      profit:     Number(q.profit     ?? 0),
      margin:     Number(q.margin     ?? 0).toFixed(1),
    }
  }

  // Frontend form — compute locally for live preview
  const items      = Array.isArray(q.items) ? q.items : []
  const totalCost  = items.reduce((s, i) => s + (Number(i.cost  ?? 0) * Number(i.qty ?? 1)), 0)
  const totalPrice = items.reduce((s, i) => s + (Number(i.price ?? 0) * Number(i.qty ?? 1)), 0)
  const discount   = Number(q.discount ?? 0)
  const gross      = totalPrice - discount
  const profit     = gross - totalCost
  const margin     = gross > 0 ? ((profit / gross) * 100).toFixed(1) : '0.0'

  return { totalCost, totalPrice, gross, profit, margin }
}

// ── Status badge CSS class ────────────────────────────────────────────────────
export const statusBadgeClass = (s) => ({
  DRAFT:     'badge-draft',
  SENT:      'badge-sent',
  APPROVED:  'badge-approved',
  REJECTED:  'badge-rejected',
  COMPLETED: 'badge-completed',
}[s?.toUpperCase()] ?? 'badge-draft')

// ── Margin colour class ───────────────────────────────────────────────────────
export const marginColorClass = (margin) => {
  const m = parseFloat(margin ?? 0)
  if (m >= 30) return 'text-green'
  if (m >= 20) return 'text-orange'
  return 'text-red'
}

// ── Date formatting ───────────────────────────────────────────────────────────
export const fmtDate = (d) => {
  if (!d) return '—'
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
}

// Alias for backwards compatibility
export const statusBadge = statusBadgeClass
