import { useState, useMemo, useCallback } from 'react'
import {
  useQuotations, usePackages, useClients,
  useCreateQuotation, useUpdateQuotation, useUpdateQuotationStatus, useDeleteQuotation,
} from '../../hooks/useApi'
import { fmt, quoteProfit, fmtDate, statusBadgeClass } from '../../utils/format'
import { LoadingPage, PageError, EmptyState, ConfirmModal, StatusBadge, FieldError } from '../ui/index'
import DocumentsModal from './DocumentsModal'

const STATUSES = ['DRAFT','SENT','APPROVED','REJECTED','COMPLETED']

const newItem = () => ({
  _key: Math.random().toString(36).slice(2),
  description:'', qty:1, unit:'pc', cost:0, price:0, sortOrder:0,
})

const emptyForm = () => ({
  clientId:'', clientName:'', packageId:'', packageName:'',
  status:'DRAFT', date: new Date().toISOString().slice(0,10),
  siteAddress:'', systemType:'on-grid', systemSize:'',
  notes:'', discount:0, downPayment:0, paymentStatus:'UNPAID',
  items: [newItem()],
})

// ── Line-item row ─────────────────────────────────────────────────────────────
function LineItemRow({ item, idx, onUpdate, onRemove }) {
  const lp = ((+item.price||0) - (+item.cost||0)) * (+item.qty||1)
  const inputStyle = { background:'var(--input)', border:'1px solid var(--border)',
    borderRadius:4, color:'var(--text)', padding:'3px 6px', fontSize:12,
    outline:'none', fontFamily:"'Sora',sans-serif" }

  return (
    <tr style={{ borderBottom:'1px solid var(--border)' }}>
      <td style={{ padding:'6px 8px' }}>
        <input value={item.description||''} onChange={e => onUpdate(idx,'description',e.target.value)}
          style={{ ...inputStyle, border:'none', background:'transparent', width:'100%' }}/>
      </td>
      <td style={{ padding:'6px 8px' }}>
        <input type="number" value={item.qty} min={1}
          onChange={e => onUpdate(idx,'qty',+e.target.value)}
          style={{ ...inputStyle, width:50, textAlign:'center' }}/>
      </td>
      <td style={{ padding:'6px 8px' }}>
        <select value={item.unit||'pc'} onChange={e => onUpdate(idx,'unit',e.target.value)}
          style={{ background:'transparent', border:'none', color:'var(--text)', fontSize:12, outline:'none' }}>
          {['pc','set','lot','unit','hr','m'].map(u => <option key={u} value={u}>{u}</option>)}
        </select>
      </td>
      <td style={{ padding:'6px 8px' }}>
        <input type="number" value={item.cost} min={0}
          onChange={e => onUpdate(idx,'cost',+e.target.value)}
          style={{ ...inputStyle, width:90 }}/>
      </td>
      <td style={{ padding:'6px 8px' }}>
        <input type="number" value={item.price} min={0}
          onChange={e => onUpdate(idx,'price',+e.target.value)}
          style={{ ...inputStyle, width:90 }}/>
      </td>
      <td className={`font-mono font-600 ${lp >= 0 ? 'text-green' : 'text-red'}`}
        style={{ padding:'6px 8px', fontSize:12 }}>{fmt(lp)}</td>
      <td style={{ padding:'6px 8px' }}>
        <button onClick={() => onRemove(idx)}
          style={{ background:'none', border:'none', color:'var(--red)', cursor:'pointer', fontSize:14, opacity:.6 }}>✕</button>
      </td>
    </tr>
  )
}

// ── Smart margin editor for quotes ────────────────────────────────────────────
function QuoteMarginEditor({ form, setForm }) {
  const { totalCost, gross, profit, margin } = quoteProfit(form)
  const mgNum = parseFloat(margin)
  const mgCol = mgNum >= 30 ? 'var(--green)' : mgNum >= 20 ? 'var(--yellow)' : 'var(--red)'

  const scaleItemPrices = useCallback((targetGross) => {
    const currentGross = form.items.reduce((s,i) => s + (+i.price||0)*(+i.qty||1), 0)
    if (currentGross <= 0 || targetGross <= 0) return
    const scale = targetGross / currentGross
    setForm(p => ({ ...p, items: p.items.map(i => ({ ...i, price: Math.round((+i.price||0)*scale) })) }))
  }, [form.items, setForm])

  const applyMargin = (pct) => {
    const m = Math.min(Math.max(parseFloat(pct)||0, 0), 99)
    if (totalCost > 0) scaleItemPrices(totalCost / (1 - m / 100))
  }

  const applyTotalPrice = (newTotal) => {
    if (+newTotal > 0) scaleItemPrices(+newTotal)
  }

  return (
    <div style={{ background:'var(--navy3)', borderRadius:12, padding:'18px 20px', marginTop:4 }}>
      <div style={{ fontSize:11, fontWeight:700, color:'var(--text2)', textTransform:'uppercase', letterSpacing:1, marginBottom:14 }}>
        Quote Price — editing either field scales all line items proportionally
      </div>
      <div className="form-grid form-grid-2" style={{ gap:16, marginBottom:14 }}>
        <div className="form-group">
          <label className="form-label">Total Quote Price (₱)</label>
          <input className="form-input" type="number" value={gross}
            onChange={e => applyTotalPrice(e.target.value)}
            style={{ fontSize:16, fontWeight:700, color:'var(--orange)' }}/>
          <div className="form-hint">Scales all line items proportionally</div>
        </div>
        <div className="form-group">
          <label className="form-label">Target Gross Margin (%)</label>
          <input className="form-input" type="number" value={margin}
            onChange={e => applyMargin(e.target.value)} min={0} max={99} step={0.5}
            style={{ fontSize:16, fontWeight:700, color:mgCol }}/>
          <div className="form-hint">Recalculates all prices to hit this margin</div>
        </div>
      </div>
      <input type="range" min={0} max={60} step={0.5} value={Math.min(mgNum,60)}
        onChange={e => applyMargin(e.target.value)} style={{ width:'100%', marginBottom:6 }}/>
      <div style={{ height:6, background:'var(--navy2)', borderRadius:3, overflow:'hidden', marginBottom:14 }}>
        <div style={{ height:'100%', width:`${Math.min(mgNum,60)/60*100}%`, borderRadius:3, background:mgCol, transition:'width .2s' }}/>
      </div>
      <div style={{ display:'flex', gap:16, flexWrap:'wrap', borderTop:'1px solid var(--border)', paddingTop:12, marginBottom:12 }}>
        {[['Total Cost', fmt(totalCost), 'var(--red)'], ['Quote Price', fmt(gross), 'var(--orange)'],
          ['Gross Profit', fmt(profit), profit>=0?'var(--green)':'var(--red)'],
          ['Margin', margin+'%', mgCol],
          ['Markup', totalCost>0?(profit/totalCost*100).toFixed(1)+'%':'—', 'var(--text2)'],
          ['Discount', fmt(form.discount||0), 'var(--text2)'],
        ].map(([l,v,c]) => (
          <div key={l} style={{ textAlign:'center', minWidth:80 }}>
            <div style={{ fontSize:10, color:'var(--text2)', textTransform:'uppercase', letterSpacing:.8, marginBottom:3 }}>{l}</div>
            <div style={{ fontFamily:"'JetBrains Mono',monospace", fontWeight:700, fontSize:15, color:c }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ padding:'7px 12px', borderRadius:6, fontSize:11.5, color:mgCol,
        background:mgNum>=30?'rgba(16,185,129,.08)':mgNum>=20?'rgba(245,130,13,.08)':'rgba(239,68,68,.08)',
        border:`1px solid ${mgNum>=30?'rgba(16,185,129,.2)':mgNum>=20?'rgba(245,130,13,.2)':'rgba(239,68,68,.2)'}` }}>
        {mgNum>=35?'✅ Premium — excellent margin'
          :mgNum>=30?'✅ Target zone — covers costs, overhead, and rework risk'
          :mgNum>=20?'⚠️  Acceptable — viable but try to push higher'
          :'❌ Too low — below sustainable threshold'}
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function QuotesPage({ toast }) {
  const { data: quotes   = [], isLoading: qLoad, error: qErr, refetch } = useQuotations()
  const { data: packages = [] } = usePackages()
  const { data: clients  = [] } = useClients()

  const onSuccess = (msg) => () => { toast(msg, 'success'); setModal(null) }
  const onError   = (e)   => { if (e.fieldErrors) setFieldErrs(e.fieldErrors); toast(e.message, 'error') }

  const createMut     = useCreateQuotation({ onSuccess: onSuccess('Quotation created'), onError })
  const updateMut     = useUpdateQuotation({ onSuccess: onSuccess('Quotation updated'), onError })
  const statusMut     = useUpdateQuotationStatus({ onError: e => toast(e.message, 'error') })
  const deleteMut     = useDeleteQuotation({
    onSuccess: () => { toast('Deleted', 'info'); setDelTarget(null) },
    onError: e => toast(e.message, 'error'),
  })

  const [modal,     setModal]     = useState(null)   // null | 'new' | quoteId
  const [viewQ,     setViewQ]     = useState(null)
  const [docQ,      setDocQ]      = useState(null)
  const [delTarget, setDelTarget] = useState(null)
  const [form,      setForm]      = useState(emptyForm())
  const [fieldErrs, setFieldErrs] = useState({})
  const [search,    setSearch]    = useState('')
  const [filterStatus, setFilterStatus] = useState('all')

  const openNew  = () => { setForm(emptyForm()); setFieldErrs({}); setModal('new') }
  const openEdit = (q) => {
    setForm({ ...q, items: q.items?.map(i => ({ ...i, _key: i.id || Math.random().toString(36).slice(2) })) ?? [newItem()] })
    setFieldErrs({})
    setModal(q.id)
  }

  const upd       = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const addItem   = () => setForm(p => ({ ...p, items: [...p.items, { ...newItem(), sortOrder: p.items.length }] }))
  const updItem   = (idx, k, v) => setForm(p => { const items = [...p.items]; items[idx] = { ...items[idx], [k]: v }; return { ...p, items } })
  const removeItem = (idx) => setForm(p => ({ ...p, items: p.items.filter((_,i) => i !== idx) }))

  const loadPackage = (pkgId) => {
    const pkg = packages.find(p => p.id === pkgId)
    if (!pkg) return
    upd('packageId', pkgId)
    upd('packageName', pkg.name)
    upd('systemType', pkg.type)
    upd('systemSize', pkg.size)
    setForm(p => ({
      ...p, packageId: pkgId, packageName: pkg.name,
      systemType: pkg.type, systemSize: pkg.size,
      items: [
        { _key:'1', description:`${pkg.panelWatt}W Solar Panel`, qty:pkg.panels, unit:'pc', cost:+pkg.costPanel||0, price:Math.round((+pkg.costPanel||0)*1.35), sortOrder:0 },
        { _key:'2', description:`${pkg.inverterBrand} ${pkg.inverterSize} Inverter`, qty:1, unit:'pc', cost:+pkg.costInverter||0, price:Math.round((+pkg.costInverter||0)*1.38), sortOrder:1 },
        ...((pkg.type==='hybrid'&&+pkg.costBattery>0) ? [{ _key:'3', description:`${pkg.battery} ${pkg.batteryKwh}kWh Battery`, qty:1, unit:'pc', cost:+pkg.costBattery||0, price:Math.round((+pkg.costBattery||0)*1.3), sortOrder:2 }] : []),
        { _key:'4', description:'Mounting Rails & Hardware', qty:1, unit:'set', cost:+pkg.costMounting||0, price:Math.round((+pkg.costMounting||0)*1.5), sortOrder:3 },
        { _key:'5', description:'DC/AC Wiring & Conduit', qty:1, unit:'lot', cost:+pkg.costWiring||0, price:Math.round((+pkg.costWiring||0)*1.6), sortOrder:4 },
        { _key:'6', description:'Installation & Labor', qty:1, unit:'lot', cost:+pkg.costLabor||0, price:Math.round((+pkg.costLabor||0)*1.4), sortOrder:5 },
        { _key:'7', description:'Permits & Net Metering', qty:1, unit:'lot', cost:+pkg.costPermit||0, price:Math.round((+pkg.costPermit||0)*1.5), sortOrder:6 },
      ],
    }))
  }

  const save = () => {
    if (!form.clientId && !form.clientName?.trim()) { toast('Client is required', 'error'); return }
    if (!form.items?.length) { toast('At least one line item is required', 'error'); return }
    const payload = {
      ...form,
      clientName: form.clientId ? (clients.find(c => c.id === form.clientId)?.name ?? form.clientName) : form.clientName,
      items: form.items.map(({ _key, ...rest }) => rest),
    }
    modal === 'new' ? createMut.mutate(payload) : updateMut.mutate({ id: modal, data: payload })
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return quotes
      .filter(x => filterStatus === 'all' || x.status === filterStatus)
      .filter(x => !q || x.clientName?.toLowerCase().includes(q) || x.packageName?.toLowerCase().includes(q))
      .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))
  }, [quotes, search, filterStatus])

  const isMutating = createMut.isPending || updateMut.isPending

  if (qLoad) return <LoadingPage message="Loading quotations…"/>
  if (qErr)  return <PageError error={qErr} onRetry={refetch}/>

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex gap-3">
          <div className="search-wrap" style={{ width:260 }}>
            <span className="search-icon">🔍</span>
            <input className="form-input search-input" placeholder="Search client or package…"
              value={search} onChange={e => setSearch(e.target.value)}/>
          </div>
          <select className="form-select" style={{ width:150 }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="all">All Status</option>
            {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0)+s.slice(1).toLowerCase()}</option>)}
          </select>
        </div>
        <button className="btn btn-primary" onClick={openNew}>＋ New Quotation</button>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr>
              <th>Client</th><th>Package</th><th>Cost</th><th>Price</th>
              <th>Profit</th><th>Margin</th><th>Status</th><th>Date</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={9}><EmptyState icon="📄" title="No quotations found" subtitle={search ? 'Try a different search' : 'Create your first quotation'}/></td></tr>
              )}
              {filtered.map(q => {
                const { totalCost, gross, profit, margin } = quoteProfit(q)
                const mgNum = parseFloat(margin)
                return (
                  <tr key={q.id}>
                    <td>
                      <div className="font-600">{q.clientName}</div>
                      {q.siteAddress && <div className="text-xs text-muted">{q.siteAddress}</div>}
                    </td>
                    <td>
                      <div className="text-sm">{q.packageName || 'Custom'}</div>
                      <span className={`tag tag-${(q.systemType||'on-grid').replace('-','')}`}>{q.systemType} {q.systemSize}</span>
                    </td>
                    <td className="font-mono text-muted text-sm">{fmt(totalCost)}</td>
                    <td className="font-mono text-orange font-600">{fmt(gross)}</td>
                    <td className={`font-mono font-600 ${profit>=0?'text-green':'text-red'}`}>{fmt(profit)}</td>
                    <td>
                      <span className={`badge ${mgNum>=30?'badge-approved':mgNum>=20?'badge-orange':'badge-rejected'}`}>{margin}%</span>
                    </td>
                    <td>
                      <select value={q.status||'DRAFT'}
                        onChange={e => statusMut.mutate({ id:q.id, status:e.target.value })}
                        style={{ background:'transparent', border:'1px solid var(--border)', color:'var(--text)',
                          borderRadius:6, padding:'4px 8px', fontSize:12, cursor:'pointer', fontFamily:"'Sora',sans-serif" }}>
                        {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0)+s.slice(1).toLowerCase()}</option>)}
                      </select>
                    </td>
                    <td className="text-xs text-muted">{fmtDate(q.date || q.createdAt)}</td>
                    <td>
                      <div className="flex gap-1">
                        <button className="btn-icon" title="View"      onClick={() => setViewQ(q)}>👁️</button>
                        <button className="btn-icon" title="Documents" onClick={() => setDocQ(q)}>📄</button>
                        <button className="btn-icon" title="Edit"      onClick={() => openEdit(q)}>✏️</button>
                        <button className="btn-icon" title="Delete"    onClick={() => setDelTarget(q)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Modal */}
      {viewQ && (() => {
        const { totalCost, gross, profit, margin } = quoteProfit(viewQ)
        return (
          <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setViewQ(null)}>
            <div className="modal modal-lg">
              <div className="modal-header">
                <div>
                  <div className="modal-title">{viewQ.clientName}</div>
                  <div className="text-sm text-muted mt-1">{viewQ.packageName || 'Custom'} · {fmtDate(viewQ.date || viewQ.createdAt)}</div>
                </div>
                <div className="flex gap-2">
                  <button className="btn btn-secondary btn-sm" onClick={() => { setViewQ(null); openEdit(viewQ) }}>✏️ Edit</button>
                  <button className="btn btn-secondary btn-sm" onClick={() => { setViewQ(null); setDocQ(viewQ) }}>📄 Docs</button>
                  <button className="btn-icon" onClick={() => setViewQ(null)}>✕</button>
                </div>
              </div>
              <div className="modal-body">
                <div className="detail-grid mb-4">
                  <div className="detail-item"><label>Client</label><div className="dval">{viewQ.clientName}</div></div>
                  <div className="detail-item"><label>Status</label><div className="dval"><StatusBadge status={viewQ.status}/></div></div>
                  <div className="detail-item"><label>System</label><div className="dval">{viewQ.systemType} {viewQ.systemSize}</div></div>
                  <div className="detail-item"><label>Payment</label><div className="dval">{viewQ.paymentStatus?.toLowerCase() ?? '—'}</div></div>
                  <div className="detail-item" style={{ gridColumn:'1/-1' }}><label>Address</label><div className="dval">{viewQ.siteAddress||'—'}</div></div>
                </div>

                <div className="section-title">Line Items</div>
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12.5 }}>
                    <thead><tr style={{ background:'var(--navy3)' }}>
                      {['Description','Qty','Unit','Cost','Price','Total Price','Line Profit'].map(h => (
                        <th key={h} style={{ padding:'8px 10px', textAlign:'left', fontSize:11, color:'var(--text2)' }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {(viewQ.items||[]).map((item,i) => {
                        const lp = ((+item.price||0)-(+item.cost||0))*(+item.qty||1)
                        return (
                          <tr key={item.id||i} style={{ borderBottom:'1px solid var(--border)' }}>
                            <td style={{ padding:'8px 10px' }}>{item.description}</td>
                            <td style={{ padding:'8px 10px' }}>{item.qty}</td>
                            <td style={{ padding:'8px 10px' }}>{item.unit}</td>
                            <td className="font-mono" style={{ padding:'8px 10px', color:'var(--text2)' }}>{fmt(item.cost)}</td>
                            <td className="font-mono" style={{ padding:'8px 10px' }}>{fmt(item.price)}</td>
                            <td className="font-mono" style={{ padding:'8px 10px' }}>{fmt((+item.price||0)*(+item.qty||1))}</td>
                            <td className={`font-mono font-600 ${lp>=0?'text-green':'text-red'}`} style={{ padding:'8px 10px' }}>{fmt(lp)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="hr"/>
                <div style={{ display:'flex', justifyContent:'flex-end' }}>
                  <div style={{ minWidth:280 }}>
                    {[['Quote Price',fmt(gross),'var(--orange)'],['Total Cost',fmt(totalCost),'var(--text2)'],
                      ['Gross Profit',fmt(profit),profit>=0?'var(--green)':'var(--red)'],
                      ['Margin',margin+'%',parseFloat(margin)>=30?'var(--green)':'var(--orange)']
                    ].map(([l,v,c]) => (
                      <div key={l} className="flex items-center justify-between" style={{ padding:'6px 0', borderBottom:'1px solid var(--border)' }}>
                        <span className="text-sm text-muted">{l}</span>
                        <span className="font-mono font-600" style={{ color:c }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setViewQ(null)}>Close</button></div>
            </div>
          </div>
        )
      })()}

      {/* Edit / Create Modal */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <div className="modal-title">{modal === 'new' ? 'New Quotation' : 'Edit Quotation'}</div>
              <button className="btn-icon" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="section-title">Client & Package</div>
              <div className="form-grid form-grid-2 mb-4">
                <div className="form-group">
                  <label className="form-label">Client</label>
                  <select className="form-select" value={form.clientId}
                    onChange={e => { upd('clientId', e.target.value); upd('clientName', clients.find(c=>c.id===e.target.value)?.name||'') }}>
                    <option value="">— Select Client —</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  {!form.clientId && (
                    <input className="form-input mt-2" placeholder="Or type name" value={form.clientName}
                      onChange={e => upd('clientName', e.target.value)}/>
                  )}
                  <FieldError errors={fieldErrs} field="clientName"/>
                </div>
                <div className="form-group">
                  <label className="form-label">Base Package</label>
                  <select className="form-select" value={form.packageId}
                    onChange={e => { if (e.target.value) loadPackage(e.target.value); else upd('packageId','') }}>
                    <option value="">— None / Custom —</option>
                    {packages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">System Type</label>
                  <select className="form-select" value={form.systemType} onChange={e => upd('systemType', e.target.value)}>
                    <option value="on-grid">On-Grid</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">System Size</label>
                  <input className="form-input" value={form.systemSize||''} onChange={e => upd('systemSize', e.target.value)} placeholder="8kW"/>
                </div>
                <div className="form-group" style={{ gridColumn:'1/-1' }}>
                  <label className="form-label">Installation Address</label>
                  <input className="form-input" value={form.siteAddress||''} onChange={e => upd('siteAddress', e.target.value)}/>
                </div>
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input className="form-input" type="date" value={form.date} onChange={e => upd('date', e.target.value)}/>
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select className="form-select" value={form.status} onChange={e => upd('status', e.target.value)}>
                    {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0)+s.slice(1).toLowerCase()}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Discount (₱)</label>
                  <input className="form-input" type="number" min={0} value={form.discount||0} onChange={e => upd('discount', +e.target.value)}/>
                </div>
                <div className="form-group">
                  <label className="form-label">Payment Status</label>
                  <select className="form-select" value={form.paymentStatus||'UNPAID'} onChange={e => upd('paymentStatus', e.target.value)}>
                    {['UNPAID','PARTIAL','PAID'].map(s => <option key={s} value={s}>{s.charAt(0)+s.slice(1).toLowerCase()}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn:'1/-1' }}>
                  <label className="form-label">Notes</label>
                  <textarea className="form-textarea" rows={2} value={form.notes||''} onChange={e => upd('notes', e.target.value)}/>
                </div>
              </div>

              {/* Line items */}
              <div className="flex items-center justify-between mb-3">
                <div className="section-title" style={{ margin:0 }}>Line Items</div>
                <button className="btn btn-secondary btn-sm" onClick={addItem}>＋ Add Item</button>
              </div>
              <FieldError errors={fieldErrs} field="items"/>
              <div style={{ overflowX:'auto', marginBottom:4 }}>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead><tr style={{ background:'var(--navy3)' }}>
                    {['Description','Qty','Unit','Cost (₱)','Price (₱)','Line Profit',''].map(h => (
                      <th key={h} style={{ padding:'8px 10px', textAlign:'left', fontSize:11, color:'var(--text2)' }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {form.items.map((item, idx) => (
                      <LineItemRow key={item._key||idx} item={item} idx={idx} onUpdate={updItem} onRemove={removeItem}/>
                    ))}
                  </tbody>
                </table>
              </div>

              <QuoteMarginEditor form={form} setForm={setForm}/>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={isMutating}>
                {isMutating ? 'Saving…' : '💾 Save Quotation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {docQ && <DocumentsModal quote={docQ} onClose={() => setDocQ(null)} toast={toast}/>}

      {delTarget && (
        <ConfirmModal
          title="Delete Quotation"
          message={`Delete quotation for "${delTarget.clientName}"? This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={() => deleteMut.mutate(delTarget.id)}
          onCancel={() => setDelTarget(null)}
          loading={deleteMut.isPending}
        />
      )}
    </div>
  )
}
