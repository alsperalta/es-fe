import { useState, useMemo } from 'react'
import { usePackages, useCreatePackage, useUpdatePackage, useDeletePackage } from '../../hooks/useApi'
import { fmt } from '../../utils/format'
import { LoadingPage, PageError, EmptyState, ConfirmModal, FieldError } from '../ui/index'

const calcCost = (f) =>
  (+f.costPanel * +f.panels) + +f.costInverter + +f.costBattery +
  +f.costMounting + +f.costWiring + +f.costLabor + +f.costPermit + +f.costMisc

const EMPTY = {
  name:'', type:'on-grid', size:'', panels:12, panelWatt:445,
  inverterBrand:'', inverterSize:'', battery:'', batteryKwh:0,
  costPanel:0, costInverter:0, costBattery:0, costMounting:0,
  costWiring:0, costLabor:0, costPermit:0, costMisc:0,
  priceBase:0, description:'',
}

function PackageCard({ pkg, onEdit, onDelete }) {
  const tc     = (+pkg.totalCost) || calcCost(pkg)
  const margin = pkg.grossMargin !== undefined ? parseFloat(pkg.grossMargin).toFixed(1)
    : pkg.priceBase > 0 ? (((pkg.priceBase - tc) / pkg.priceBase) * 100).toFixed(1) : '0.0'
  const profit  = (pkg.priceBase || 0) - tc
  const mgNum   = parseFloat(margin)
  const mgColor = mgNum >= 30 ? 'var(--green)' : mgNum >= 20 ? 'var(--yellow)' : 'var(--red)'

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="flex items-center gap-2">
            <div className="card-title">{pkg.name}</div>
            <span className={`tag tag-${(pkg.type||'on-grid').replace('-','')}`}>{pkg.type}</span>
          </div>
          <div className="card-sub">
            {pkg.size} · {pkg.panels} × {pkg.panelWatt}W · {pkg.inverterBrand} {pkg.inverterSize}
            {pkg.batteryKwh > 0 && ` · 🔋 ${pkg.batteryKwh}kWh`}
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn-icon" title="Edit"   onClick={() => onEdit(pkg)}>✏️</button>
          <button className="btn-icon" title="Delete" onClick={() => onDelete(pkg)}>🗑️</button>
        </div>
      </div>
      <div className="card-body">
        {pkg.description && (
          <div className="text-sm text-muted mb-3" style={{ lineHeight:1.6 }}>{pkg.description}</div>
        )}
        <div className="flex items-center justify-between mb-2">
          <div><div className="text-xs text-muted">Cost</div><div className="font-mono font-bold text-red" style={{ fontSize:15 }}>{fmt(tc)}</div></div>
          <div style={{ textAlign:'center' }}><div className="text-xs text-muted">Profit</div><div className={`font-mono font-bold ${profit >= 0 ? 'text-green' : 'text-red'}`} style={{ fontSize:15 }}>{fmt(profit)}</div></div>
          <div style={{ textAlign:'right' }}><div className="text-xs text-muted">Base Price</div><div className="font-mono font-bold text-orange" style={{ fontSize:17 }}>{fmt(pkg.priceBase)}</div></div>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width:`${Math.min(mgNum*2,100)}%`, background:mgColor }}/>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-muted">Gross Margin</span>
          <span style={{ fontSize:11.5, fontWeight:700, color:mgColor }}>{margin}%</span>
        </div>
      </div>
    </div>
  )
}

function MarginEditor({ tc, form, onChange }) {
  const profit = (form.priceBase || 0) - tc
  const margin = form.priceBase > 0 ? ((profit / form.priceBase) * 100).toFixed(1) : '0.0'
  const markup = tc > 0 ? ((profit / tc) * 100).toFixed(1) : '0.0'
  const mgNum  = parseFloat(margin)
  const mgCol  = mgNum >= 30 ? 'var(--green)' : mgNum >= 20 ? 'var(--yellow)' : 'var(--red)'

  const applyMargin = (pct) => {
    const m = Math.min(Math.max(parseFloat(pct)||0, 0), 99)
    if (tc > 0) onChange('priceBase', Math.round(tc / (1 - m / 100)))
  }

  return (
    <div style={{ background:'var(--navy3)', borderRadius:12, padding:'18px 20px' }}>
      <div style={{ fontSize:11, fontWeight:700, color:'var(--text2)', textTransform:'uppercase', letterSpacing:1, marginBottom:14 }}>
        Selling Price — edit price or margin, the other auto-adjusts
      </div>
      <div className="form-grid form-grid-2" style={{ gap:16, marginBottom:14 }}>
        <div className="form-group">
          <label className="form-label">Base Sell Price (₱)</label>
          <input className="form-input" type="number" value={form.priceBase}
            onChange={e => onChange('priceBase', +e.target.value)}
            style={{ fontSize:16, fontWeight:700, color:'var(--orange)' }}/>
          <div className="form-hint">Type price → margin auto-updates</div>
        </div>
        <div className="form-group">
          <label className="form-label">Target Gross Margin (%)</label>
          <input className="form-input" type="number" value={margin}
            onChange={e => applyMargin(e.target.value)} min={0} max={99} step={0.5}
            style={{ fontSize:16, fontWeight:700, color:mgCol }}/>
          <div className="form-hint">Type margin % → price auto-updates</div>
        </div>
      </div>
      <input type="range" min={0} max={60} step={0.5} value={Math.min(mgNum, 60)}
        onChange={e => applyMargin(e.target.value)} style={{ width:'100%', marginBottom:6 }}/>
      <div style={{ height:6, background:'var(--navy2)', borderRadius:3, overflow:'hidden', marginBottom:14 }}>
        <div style={{ height:'100%', width:`${Math.min(mgNum,60)/60*100}%`, borderRadius:3, background:mgCol, transition:'width .2s' }}/>
      </div>
      <div style={{ display:'flex', gap:16, flexWrap:'wrap', borderTop:'1px solid var(--border)', paddingTop:12, marginBottom:12 }}>
        {[['Total Cost', fmt(tc), 'var(--red)'], ['Base Price', fmt(form.priceBase||0), 'var(--orange)'],
          ['Est. Profit', fmt(profit), profit >= 0 ? 'var(--green)' : 'var(--red)'],
          ['Margin', margin+'%', mgCol], ['Markup', markup+'%', 'var(--text2)']
        ].map(([l,v,c]) => (
          <div key={l} style={{ textAlign:'center', minWidth:80 }}>
            <div style={{ fontSize:10, color:'var(--text2)', textTransform:'uppercase', letterSpacing:.8, marginBottom:3 }}>{l}</div>
            <div style={{ fontFamily:"'JetBrains Mono',monospace", fontWeight:700, fontSize:15, color:c }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ padding:'7px 12px', borderRadius:6, fontSize:11.5, color:mgCol,
        background: mgNum>=30?'rgba(16,185,129,.08)':mgNum>=20?'rgba(245,130,13,.08)':'rgba(239,68,68,.08)',
        border:`1px solid ${mgNum>=30?'rgba(16,185,129,.2)':mgNum>=20?'rgba(245,130,13,.2)':'rgba(239,68,68,.2)'}` }}>
        {mgNum>=35?'✅ Premium tier — strong margin, well above target'
          :mgNum>=30?'✅ Target zone — covers all costs, overhead, and rework risk'
          :mgNum>=20?'⚠️  Acceptable — viable at high volume, push higher when possible'
          :'❌ Too low — below sustainable threshold, increase price'}
      </div>
    </div>
  )
}

export default function PackagesPage({ toast }) {
  const { data: packages = [], isLoading, error, refetch } = usePackages()

  const onSuccess = (msg) => () => { toast(msg, 'success'); closeModal() }
  const onError   = (e)   => { if (e.fieldErrors) setFieldErrs(e.fieldErrors); toast(e.message, 'error') }

  const createMut = useCreatePackage({ onSuccess: onSuccess('Package created'), onError })
  const updateMut = useUpdatePackage({ onSuccess: onSuccess('Package updated'), onError })
  const deleteMut = useDeletePackage({
    onSuccess: () => { toast('Package deleted', 'info'); setDelTarget(null) },
    onError: e => toast(e.message, 'error'),
  })

  const [modal,     setModal]     = useState(null)
  const [form,      setForm]      = useState(EMPTY)
  const [fieldErrs, setFieldErrs] = useState({})
  const [delTarget, setDelTarget] = useState(null)
  const [typeTab,   setTypeTab]   = useState('all')

  const closeModal = () => { setModal(null); setForm(EMPTY); setFieldErrs({}) }
  const openNew    = () => { setForm({ ...EMPTY }); setFieldErrs({}); setModal('new') }
  const openEdit   = (p) => { setForm({ ...p }); setFieldErrs({}); setModal(p.id) }
  const upd        = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const save = () => {
    if (!form.name?.trim()) { toast('Package name is required', 'error'); return }
    modal === 'new' ? createMut.mutate(form) : updateMut.mutate({ id: modal, data: form })
  }

  const filtered = useMemo(() =>
    typeTab === 'all' ? packages : packages.filter(p => p.type === typeTab)
  , [packages, typeTab])

  const tc          = calcCost(form)
  const isMutating  = createMut.isPending || updateMut.isPending

  if (isLoading) return <LoadingPage message="Loading packages…"/>
  if (error)     return <PageError error={error} onRetry={refetch}/>

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div className="tabs" style={{ marginBottom:0 }}>
          {[['all','All Packages'],['on-grid','On-Grid'],['hybrid','Hybrid']].map(([v,l]) => (
            <button key={v} className={`tab ${typeTab===v?'active':''}`} onClick={() => setTypeTab(v)}>{l}</button>
          ))}
        </div>
        <button className="btn btn-primary" onClick={openNew}>＋ New Package</button>
      </div>

      {filtered.length === 0
        ? <EmptyState icon="📦" title="No packages" subtitle={typeTab !== 'all' ? `No ${typeTab} packages yet` : 'Create your first base package'}/>
        : <div className="grid-2">{filtered.map(p => (
            <PackageCard key={p.id} pkg={p} onEdit={openEdit} onDelete={setDelTarget}/>
          ))}</div>
      }

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <div className="modal-title">{modal === 'new' ? 'New Base Package' : 'Edit Package'}</div>
              <button className="btn-icon" onClick={closeModal}>✕</button>
            </div>
            <div className="modal-body">
              <div className="section-title">Package Details</div>
              <div className="form-grid form-grid-2 mb-4">
                <div className="form-group">
                  <label className="form-label">Package Name *</label>
                  <input className="form-input" value={form.name} onChange={e => upd('name', e.target.value)}/>
                  <FieldError errors={fieldErrs} field="name"/>
                </div>
                <div className="form-group">
                  <label className="form-label">System Type</label>
                  <select className="form-select" value={form.type} onChange={e => upd('type', e.target.value)}>
                    <option value="on-grid">On-Grid</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">System Size</label>
                  <input className="form-input" value={form.size} onChange={e => upd('size', e.target.value)} placeholder="5kW"/>
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <input className="form-input" value={form.description||''} onChange={e => upd('description', e.target.value)}/>
                </div>
              </div>

              <div className="section-title">Equipment</div>
              <div className="form-grid form-grid-3 mb-4">
                {[['panels','Panels'],['panelWatt','Watt/Panel'],['inverterBrand','Inverter Brand'],
                  ['inverterSize','Inverter Size'],['battery','Battery Brand'],['batteryKwh','Battery kWh']].map(([k,l]) => (
                  <div key={k} className="form-group">
                    <label className="form-label">{l}</label>
                    <input className="form-input" value={form[k]||''} onChange={e => upd(k, e.target.value)}/>
                  </div>
                ))}
              </div>

              <div className="section-title">Cost Breakdown</div>
              <div className="form-grid form-grid-3 mb-5">
                {[['costPanel','Cost/Panel (₱)'],['costInverter','Inverter'],['costBattery','Battery'],
                  ['costMounting','Mounting'],['costWiring','Wiring'],['costLabor','Labor'],
                  ['costPermit','Permits'],['costMisc','Misc']].map(([k,l]) => (
                  <div key={k} className="form-group">
                    <label className="form-label">{l}</label>
                    <input className="form-input" type="number" min={0} value={form[k]||0} onChange={e => upd(k, +e.target.value)}/>
                    <FieldError errors={fieldErrs} field={k}/>
                  </div>
                ))}
              </div>

              <MarginEditor tc={tc} form={form} onChange={upd}/>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={isMutating}>
                {isMutating ? 'Saving…' : '💾 Save Package'}
              </button>
            </div>
          </div>
        </div>
      )}

      {delTarget && (
        <ConfirmModal
          title="Delete Package"
          message={`Delete "${delTarget.name}"? Existing quotations will not be affected.`}
          confirmLabel="Delete Package"
          onConfirm={() => deleteMut.mutate(delTarget.id)}
          onCancel={() => setDelTarget(null)}
          loading={deleteMut.isPending}
        />
      )}
    </div>
  )
}
