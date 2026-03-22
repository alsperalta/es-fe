import { useQuotations, usePackages, useClients, useMetrics } from '../../hooks/useApi'
import { fmt, fmtPct, pct, fmtDate, quoteProfit } from '../../utils/format'
import { LoadingPage, PageError, EmptyState, StatCard } from '../ui/index'

function BarRow({ label, value, max, color, right }) {
  return (
    <div className="bar-row">
      <div className="bar-label">{label}</div>
      <div className="bar-track">
        <div className="bar-fill" style={{ width: pct(value, max), background: color }}/>
      </div>
      <div className="bar-val">{right}</div>
    </div>
  )
}

export default function Analytics() {
  const { data: quotes   = [], isLoading: qLoad, error: qErr, refetch } = useQuotations()
  const { data: packages = [], isLoading: pLoad } = usePackages()
  const { data: clients  = [], isLoading: cLoad } = useClients()
  const { data: metrics }                          = useMetrics()

  if (qLoad || pLoad || cLoad) return <LoadingPage message="Building analytics…"/>
  if (qErr)                    return <PageError error={qErr} onRetry={refetch}/>

  const completed  = quotes.filter(q => q.status === 'COMPLETED')
  const totalRev   = Number(metrics?.totalRevenue  ?? completed.reduce((s,q) => s + Number(q.grossPrice  ?? 0), 0))
  const totalProfit= Number(metrics?.totalProfit   ?? completed.reduce((s,q) => s + Number(q.profit      ?? 0), 0))
  const avgMargin  = metrics?.avgMargin ?? 0
  const pipeline   = Number(metrics?.pipeline ?? 0)
  const convRate   = metrics?.conversionRate ?? 0

  // Last 12 months
  const months12 = Array.from({ length:12 }, (_,i) => {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 11 + i)
    return { label: d.toLocaleString('default', { month:'short' }), m: d.getMonth(), y: d.getFullYear() }
  })

  const monthData = months12.map(({ m, y }) => {
    const mq = completed.filter(q => {
      const d = new Date(q.date || q.createdAt || '')
      return d.getMonth() === m && d.getFullYear() === y
    })
    return {
      rev:    mq.reduce((s,q) => s + Number(q.grossPrice ?? 0), 0),
      profit: mq.reduce((s,q) => s + Number(q.profit     ?? 0), 0),
      count:  quotes.filter(q => { const d=new Date(q.date||q.createdAt||''); return d.getMonth()===m&&d.getFullYear()===y }).length,
    }
  })

  const maxRev   = Math.max(...monthData.map(m => m.rev), 1)
  const maxCount = Math.max(...monthData.map(m => m.count), 1)

  // System type split
  const onGridRev  = completed.filter(q => q.systemType === 'on-grid').reduce((s,q) => s + Number(q.grossPrice ?? 0), 0)
  const hybridRev  = completed.filter(q => q.systemType === 'hybrid').reduce((s,q) => s + Number(q.grossPrice ?? 0), 0)
  const onGridCnt  = quotes.filter(q => q.systemType === 'on-grid').length
  const hybridCnt  = quotes.filter(q => q.systemType === 'hybrid').length

  // Package profitability
  const pkgStats = packages.map(p => {
    const pq = completed.filter(q => q.packageId === p.id)
    const rev = pq.reduce((s,q) => s + Number(q.grossPrice ?? 0), 0)
    const profit = pq.reduce((s,q) => s + Number(q.profit ?? 0), 0)
    return { ...p, count: pq.length, rev, profit }
  }).sort((a,b) => b.rev - a.rev)

  const maxPkgRev = Math.max(...pkgStats.map(p => p.rev), 1)

  // Top clients
  const clientStats = clients.map(c => {
    const cq = quotes.filter(q => q.clientId === c.id || q.clientName === c.name)
    const rev    = cq.filter(q => q.status==='COMPLETED').reduce((s,q) => s + Number(q.grossPrice ?? 0), 0)
    const profit = cq.filter(q => q.status==='COMPLETED').reduce((s,q) => s + Number(q.profit     ?? 0), 0)
    return { ...c, count: cq.length, rev, profit }
  }).sort((a,b) => b.rev - a.rev).filter(c => c.count > 0).slice(0, 8)

  return (
    <div>
      {/* KPIs */}
      <div className="stats-grid">
        <StatCard color="orange" icon="💰" value={fmt(totalRev)}        label="Total Revenue"    sub={`${completed.length} completed jobs`}/>
        <StatCard color="green"  icon="📈" value={fmt(totalProfit)}     label="Net Profit"       sub={`${fmtPct(avgMargin)} avg margin`}/>
        <StatCard color="blue"   icon="🎯" value={`${convRate}%`}       label="Conversion Rate"  sub={`${completed.length}/${quotes.length} quotes`}/>
        <StatCard color="purple" icon="💎" value={fmt(pipeline)}        label="Pipeline Value"   sub={`${quotes.filter(q=>['DRAFT','SENT','APPROVED'].includes(q.status)).length} active`}/>
      </div>

      {/* Charts row */}
      <div className="grid-2 mb-5">
        <div className="card">
          <div className="card-header">
            <div className="card-title">Revenue vs Profit — Monthly</div>
            <div className="card-sub">Last 12 months (completed only)</div>
          </div>
          <div className="card-body">
            <div style={{ display:'flex', gap:16, marginBottom:12, fontSize:11 }}>
              {[['#1B4F8A','Revenue'],['var(--green)','Profit']].map(([c,l]) => (
                <span key={l} style={{ display:'flex', alignItems:'center', gap:6, color:'var(--text2)' }}>
                  <span style={{ width:10, height:10, borderRadius:2, background:c, display:'inline-block' }}/>
                  {l}
                </span>
              ))}
            </div>
            <div className="bar-chart">
              {months12.map(({ label }, i) => (
                <div key={label} className="bar-row">
                  <div className="bar-label" style={{ fontSize:11 }}>{label}</div>
                  <div style={{ flex:1, display:'flex', flexDirection:'column', gap:3 }}>
                    <div className="bar-track"><div className="bar-fill" style={{ width:pct(monthData[i].rev, maxRev), background:'linear-gradient(90deg,#1B4F8A,#60A5FA)' }}/></div>
                    <div className="bar-track"><div className="bar-fill" style={{ width:pct(monthData[i].profit, maxRev), background:'linear-gradient(90deg,var(--green),#34D399)' }}/></div>
                  </div>
                  <div className="bar-val" style={{ fontSize:10, width:100 }}>
                    <div>{fmt(monthData[i].rev)}</div>
                    <div style={{ color:'var(--green)' }}>{fmt(monthData[i].profit)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
          <div className="card">
            <div className="card-header"><div className="card-title">Monthly Quote Activity</div><div className="card-sub">Last 6 months</div></div>
            <div className="card-body">
              <div className="bar-chart">
                {months12.slice(-6).map(({ label }, i) => (
                  <BarRow key={label} label={label}
                    value={monthData[6+i].count} max={maxCount}
                    color="linear-gradient(90deg,var(--purple),#A78BFA)"
                    right={`${monthData[6+i].count} quotes`}/>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><div className="card-title">Revenue by System Type</div></div>
            <div className="card-body">
              <div className="flex gap-4">
                {[['On-Grid',onGridCnt,onGridRev,'tag-ongrid'],['Hybrid',hybridCnt,hybridRev,'tag-hybrid']].map(([t,cnt,rev,cls]) => (
                  <div key={t} style={{ flex:1, background:'var(--card2)', borderRadius:10, padding:14 }}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`tag ${cls}`}>{t}</span>
                      <span className="text-sm text-muted">{cnt} quotes</span>
                    </div>
                    <div className="font-mono font-bold text-orange" style={{ fontSize:20 }}>{fmt(rev)}</div>
                    <div className="text-xs text-muted mt-1">Completed revenue</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Package + Client row */}
      <div className="grid-2 mb-5">
        <div className="card">
          <div className="card-header"><div className="card-title">Package Profitability</div><div className="card-sub">Completed jobs only</div></div>
          <div className="card-body">
            {pkgStats.length === 0
              ? <EmptyState subtitle="No completed jobs yet"/>
              : pkgStats.map(p => (
              <div key={p.id} className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <span className="font-600 text-sm">{p.name}</span>
                    <span className="text-xs text-muted ml-2">{p.count} jobs</span>
                  </div>
                  <span className="font-mono text-sm text-orange">{fmt(p.rev)}</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{
                    width: pct(p.rev, maxPkgRev),
                    background: p.type === 'hybrid'
                      ? 'linear-gradient(90deg,var(--orange),var(--ora2))'
                      : 'linear-gradient(90deg,#1B4F8A,#60A5FA)',
                  }}/>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">Top Clients</div></div>
          <div className="card-body">
            {clientStats.length === 0
              ? <EmptyState subtitle="No client data yet"/>
              : clientStats.map((c, i) => (
              <div key={c.id} className="flex items-center gap-3 mb-3">
                <div style={{ width:24, height:24, borderRadius:6, background:`hsl(${i*55},45%,28%)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'#fff', flexShrink:0 }}>
                  {i + 1}
                </div>
                <div style={{ flex:1 }}>
                  <div className="font-600 text-sm">{c.name}</div>
                  <div className="text-xs text-muted">{c.count} quotes · {fmt(c.rev)} revenue</div>
                </div>
                <div className="text-green font-mono text-sm font-600">{fmt(c.profit)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Full P&L table */}
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Profitability — All Completed Jobs</div>
            <div className="card-sub">Source: {metrics ? 'Server-aggregated' : 'Client-computed'} · GET /api/quotations/metrics</div>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr>
              <th>Client</th><th>Package</th><th>System</th><th>Date</th>
              <th>Revenue</th><th>Cost</th><th>Profit</th><th>Margin</th>
            </tr></thead>
            <tbody>
              {completed.length === 0 && (
                <tr><td colSpan={8}><EmptyState subtitle="Mark quotations as Completed to see P&L data"/></td></tr>
              )}
              {[...completed].sort((a,b) => new Date(b.date||b.createdAt)-new Date(a.date||a.createdAt)).map(q => {
                const { totalCost, gross, profit, margin } = quoteProfit(q)
                const mgNum = parseFloat(margin)
                return (
                  <tr key={q.id}>
                    <td className="font-600">{q.clientName}</td>
                    <td className="text-sm text-muted">{q.packageName||'Custom'}</td>
                    <td><span className={`tag tag-${(q.systemType||'on-grid').replace('-','')}`}>{q.systemType} {q.systemSize}</span></td>
                    <td className="text-xs text-muted">{fmtDate(q.date||q.createdAt)}</td>
                    <td className="font-mono text-orange font-600">{fmt(gross)}</td>
                    <td className="font-mono text-muted">{fmt(totalCost)}</td>
                    <td className={`font-mono font-600 ${profit>=0?'text-green':'text-red'}`}>{fmt(profit)}</td>
                    <td><span className={`badge ${mgNum>=30?'badge-approved':mgNum>=20?'badge-orange':'badge-rejected'}`}>{margin}%</span></td>
                  </tr>
                )
              })}
              {completed.length > 0 && (
                <tr style={{ background:'var(--navy3)' }}>
                  <td colSpan={4} className="font-bold">TOTAL</td>
                  <td className="font-mono font-bold text-orange">{fmt(totalRev)}</td>
                  <td className="font-mono font-bold text-muted">{fmt(completed.reduce((s,q)=>s+Number(q.totalCost??0),0))}</td>
                  <td className="font-mono font-bold text-green">{fmt(totalProfit)}</td>
                  <td><span className="badge badge-approved">{fmtPct(avgMargin)}</span></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
