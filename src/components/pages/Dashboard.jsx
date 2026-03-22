import { useNavigate } from 'react-router-dom'
import { useQuotations, useMetrics } from '../../hooks/useApi'
import { fmt, fmtPct, pct, fmtDate, quoteProfit, marginColorClass } from '../../utils/format'
import { LoadingPage, PageError, StatusBadge, EmptyState } from '../ui/index'

function StatCard({ color, icon, value, label, sub }) {
  return (
    <div className={`stat-card ${color}`}>
      <div className="stat-icon">{icon}</div>
      <div className="stat-val">{value}</div>
      <div className="stat-lbl">{label}</div>
      <div className="stat-change neutral">{sub}</div>
    </div>
  )
}

export default function Dashboard({ toast }) {
  const nav = useNavigate()
  const { data: quotes = [], isLoading: qLoading, error: qError, refetch: qRefetch } = useQuotations()
  const { data: metrics,       isLoading: mLoading }                                  = useMetrics()

  if (qLoading) return <LoadingPage message="Loading dashboard…"/>
  if (qError)   return <PageError error={qError} onRetry={qRefetch}/>

  const completed = quotes.filter(q => q.status === 'COMPLETED')
  const pipeline  = quotes.filter(q => ['DRAFT','SENT','APPROVED'].includes(q.status))
  const recentQ   = [...quotes]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 6)

  // Use server metrics if available, else compute from local data
  const totalRevenue = metrics?.totalRevenue ?? completed.reduce((s, q) => s + Number(q.grossPrice ?? 0), 0)
  const totalProfit  = metrics?.totalProfit  ?? completed.reduce((s, q) => s + Number(q.profit ?? 0), 0)
  const avgMargin    = metrics?.avgMargin    ?? 0
  const pipelineVal  = metrics?.pipeline     ?? pipeline.reduce((s, q) => s + Number(q.grossPrice ?? 0), 0)

  const byStatus = ['DRAFT','SENT','APPROVED','COMPLETED','REJECTED'].map(s => ({
    status: s,
    count:  quotes.filter(q => q.status === s).length,
    value:  quotes.filter(q => q.status === s).reduce((a, q) => a + Number(q.grossPrice ?? 0), 0),
  })).filter(x => x.count > 0)

  const statusColors = {
    DRAFT: 'var(--text2)', SENT: '#60A5FA', APPROVED: 'var(--green)',
    COMPLETED: 'var(--purple)', REJECTED: 'var(--red)',
  }

  return (
    <div>
      <div className="stats-grid">
        <StatCard color="orange" icon="💰" value={fmt(totalRevenue)}   label="Total Revenue"    sub={`${completed.length} completed jobs`}/>
        <StatCard color="green"  icon="📈" value={fmt(totalProfit)}    label="Total Profit"     sub={`${fmtPct(avgMargin)} avg margin`}/>
        <StatCard color="blue"   icon="⚡" value={fmt(pipelineVal)}    label="Pipeline Value"   sub={`${pipeline.length} active quotes`}/>
        <StatCard color="purple" icon="📋" value={quotes.length}       label="Total Quotations" sub={`${metrics?.conversionRate ?? 0}% conversion`}/>
      </div>

      <div className="grid-2 mb-5">
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Quote Pipeline</div>
              <div className="card-sub">By status</div>
            </div>
          </div>
          <div className="card-body">
            {byStatus.length === 0
              ? <EmptyState subtitle="No quotes yet"/>
              : byStatus.map(({ status, count, value }) => (
              <div key={status} className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <StatusBadge status={status}/>
                    <span className="text-sm text-muted">{count} quote{count > 1 ? 's' : ''}</span>
                  </div>
                  <span className="text-sm font-mono font-600">{fmt(value)}</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{
                    width: pct(count, quotes.length),
                    background: statusColors[status] ?? 'var(--orange)',
                  }}/>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Recent Quotations</div>
            <button className="btn btn-ghost btn-sm" onClick={() => nav('/quotes')}>View All →</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Client</th><th>Price</th><th>Profit</th><th>Margin</th><th>Status</th></tr></thead>
              <tbody>
                {recentQ.length === 0 && (
                  <tr><td colSpan={5}><EmptyState subtitle="No quotations yet"/></td></tr>
                )}
                {recentQ.map(q => {
                  const { gross, profit, margin } = quoteProfit(q)
                  return (
                    <tr key={q.id}>
                      <td className="font-600">{q.clientName}</td>
                      <td className="font-mono text-orange">{fmt(gross)}</td>
                      <td className={`font-mono font-600 ${marginColorClass(profit >= 0 ? 100 : 0)}`}>{fmt(profit)}</td>
                      <td>
                        <span className={`badge ${parseFloat(margin) >= 30 ? 'badge-approved' : 'badge-orange'}`}>
                          {margin}%
                        </span>
                      </td>
                      <td><StatusBadge status={q.status}/></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
