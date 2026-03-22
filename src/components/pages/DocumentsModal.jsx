import { useState } from 'react'
import { downloadBlob } from '../../api/client'
import { fmt, quoteProfit, fmtDate } from '../../utils/format'
import { StatusBadge } from '../ui/index'

export default function DocumentsModal({ quote, onClose, toast }) {
  const [tab,     setTab]     = useState('quotation')
  const [loading, setLoading] = useState(null)

  const [contractForm, setContractForm] = useState({
    contractNumber:  `SPS-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
    contractDate:    new Date().toISOString().slice(0, 10),
    clientAddress:   quote?.siteAddress ?? '',
    clientPhone:     '',
    clientEmail:     '',
    startDate:       '',
    durationDays:    3,
    additionalNotes: quote?.notes ?? '',
  })

  const cf = (k, v) => setContractForm(p => ({ ...p, [k]: v }))
  const { gross, profit, margin } = quoteProfit(quote)
  const safeClientName = (quote?.clientName ?? 'client').replace(/[^a-zA-Z0-9_-]/g, '_')
  const today          = new Date().toISOString().slice(0, 10).replace(/-/g, '')

  const download = async (type) => {
    setLoading(type)
    try {
      if (type === 'quotation') {
        await downloadBlob(
          `/documents/quotation/${quote.id}/pdf`, 'GET', null,
          `SolarPro_Quotation_${safeClientName}_${today}.pdf`
        )
      } else {
        await downloadBlob(
          `/documents/contract/${quote.id}/pdf`, 'POST',
          { ...contractForm, contractDate: contractForm.contractDate || null,
            startDate: contractForm.startDate || null, durationDays: +contractForm.durationDays || 3 },
          `SolarPro_Contract_${safeClientName}_${today}.pdf`
        )
      }
      toast(`${type === 'quotation' ? 'Quotation' : 'Contract'} PDF downloaded`, 'success')
    } catch (e) {
      toast(e.message || 'PDF generation failed', 'error')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <div>
            <div className="modal-title">📄 Documents</div>
            <div className="text-sm text-muted mt-1">
              {quote.clientName} · {quote.packageName || 'Custom'} · <StatusBadge status={quote.status}/>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* Financial summary strip */}
          <div style={{ background:'var(--navy3)', borderRadius:10, padding:'12px 18px',
            display:'flex', gap:24, flexWrap:'wrap', marginBottom:20, alignItems:'center' }}>
            {[['Quote Price', fmt(gross), 'text-orange'], ['Your Profit', fmt(profit), profit>=0?'text-green':'text-red'],
              ['Margin', margin+'%', parseFloat(margin)>=30?'text-green':'text-orange']].map(([l,v,c]) => (
              <div key={l}>
                <div className="text-xs text-muted">{l}</div>
                <div className={`font-mono font-bold ${c}`} style={{ fontSize:17 }}>{v}</div>
              </div>
            ))}
            <div style={{ marginLeft:'auto' }}>
              <span className={`tag tag-${(quote.systemType||'on-grid').replace('-','')}`}>
                {quote.systemType} {quote.systemSize}
              </span>
            </div>
          </div>

          <div className="tabs">
            <button className={`tab ${tab==='quotation'?'active':''}`} onClick={() => setTab('quotation')}>📋 Client Quotation PDF</button>
            <button className={`tab ${tab==='contract' ?'active':''}`} onClick={() => setTab('contract')}>📝 Installation Contract PDF</button>
          </div>

          {tab === 'quotation' && (
            <div>
              <div className="grid-2 mb-5" style={{ gap:20 }}>
                <div className="card">
                  <div className="card-header"><div className="card-title">What the client sees</div></div>
                  <div className="card-body" style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {[['✅','System type, capacity, panels, inverter details'],
                      ['✅','All line items with quantities and client prices'],
                      ['✅','Total investment amount and payment schedule'],
                      ['✅','Estimated savings and ROI projection (25 years)'],
                      ['✅','Package inclusions and warranty table'],
                      ['✅','Acceptance signature block']
                    ].map(([icon, text]) => (
                      <div key={text} style={{ display:'flex', gap:10, fontSize:12.5 }}>
                        <span style={{ flexShrink:0 }}>{icon}</span>
                        <span style={{ color:'var(--text3)', lineHeight:1.5 }}>{text}</span>
                      </div>
                    ))}
                    <div className="hr" style={{ margin:'8px 0' }}/>
                    <div style={{ fontSize:11, fontWeight:700, color:'var(--text2)', textTransform:'uppercase', letterSpacing:.8, marginBottom:4 }}>
                      Hidden from client
                    </div>
                    {[['🔒','Your cost per item — client only sees sell price'],
                      ['🔒','Gross profit and margin %'],
                      ['🔒','Internal notes and cost breakdown'],
                    ].map(([icon, text]) => (
                      <div key={text} style={{ display:'flex', gap:10, fontSize:12.5 }}>
                        <span style={{ flexShrink:0 }}>{icon}</span>
                        <span style={{ color:'var(--text2)', lineHeight:1.5 }}>{text}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card">
                  <div className="card-header"><div className="card-title">PDF contents</div></div>
                  <div className="card-body">
                    {[['📄','Cover','Letterhead, quote number, date, client name'],
                      ['🔧','System overview',`${(quote.systemType||'').toUpperCase()} · ${quote.systemSize||'—'} · ${quote.packageName||'Custom'}`],
                      ['📦','Equipment list',`${(quote.items||[]).length} line items with sell prices`],
                      ['💳','Payment schedule','50% down / 30% delivery / 20% completion'],
                      ['📈','Savings & ROI','Monthly savings, payback period, 25-year cumulative'],
                      ['✍️','Signature block','Client acceptance and date'],
                    ].map(([icon, title, detail]) => (
                      <div key={title} style={{ display:'flex', gap:10, marginBottom:12, alignItems:'flex-start' }}>
                        <div style={{ width:28, height:28, borderRadius:6, background:'rgba(245,130,13,.12)',
                          display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0 }}>
                          {icon}
                        </div>
                        <div>
                          <div style={{ fontSize:12.5, fontWeight:600 }}>{title}</div>
                          <div style={{ fontSize:11.5, color:'var(--text2)', marginTop:1 }}>{detail}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <button className="btn btn-primary w-full" style={{ padding:14, fontSize:15, justifyContent:'center' }}
                onClick={() => download('quotation')} disabled={loading === 'quotation'}>
                {loading === 'quotation' ? '⏳ Generating PDF…' : '⬇️  Download Client Quotation PDF'}
              </button>
              <div style={{ textAlign:'center', fontSize:11, color:'var(--text2)', marginTop:8 }}>
                Safe to share directly with your client. Costs and margins are not included.
              </div>
            </div>
          )}

          {tab === 'contract' && (
            <div>
              <div style={{ padding:'12px 16px', background:'rgba(16,185,129,.08)', border:'1px solid rgba(16,185,129,.2)',
                borderRadius:8, marginBottom:20, fontSize:12.5, color:'var(--text3)', lineHeight:1.6 }}>
                Includes: project details, full equipment schedule, payment milestones, warranty table, all legal clauses (force majeure, dispute resolution, liability), and dual signature blocks.
              </div>

              <div className="form-grid form-grid-2 mb-4">
                <div className="form-group">
                  <label className="form-label">Contract Number</label>
                  <input className="form-input" value={contractForm.contractNumber} onChange={e => cf('contractNumber', e.target.value)}/>
                </div>
                <div className="form-group">
                  <label className="form-label">Contract Date</label>
                  <input className="form-input" type="date" value={contractForm.contractDate} onChange={e => cf('contractDate', e.target.value)}/>
                </div>
              </div>

              <div className="section-title">Client Contact Details</div>
              <div className="form-grid form-grid-2 mb-4">
                <div className="form-group" style={{ gridColumn:'1/-1' }}>
                  <label className="form-label">Client Address</label>
                  <input className="form-input" value={contractForm.clientAddress} onChange={e => cf('clientAddress', e.target.value)}/>
                </div>
                <div className="form-group">
                  <label className="form-label">Client Phone</label>
                  <input className="form-input" value={contractForm.clientPhone} onChange={e => cf('clientPhone', e.target.value)} placeholder="+63 xxx xxx xxxx"/>
                </div>
                <div className="form-group">
                  <label className="form-label">Client Email</label>
                  <input className="form-input" value={contractForm.clientEmail} onChange={e => cf('clientEmail', e.target.value)}/>
                </div>
              </div>

              <div className="section-title">Project Schedule</div>
              <div className="form-grid form-grid-2 mb-4">
                <div className="form-group">
                  <label className="form-label">Target Start Date</label>
                  <input className="form-input" type="date" value={contractForm.startDate} onChange={e => cf('startDate', e.target.value)}/>
                </div>
                <div className="form-group">
                  <label className="form-label">Estimated Duration (working days)</label>
                  <input className="form-input" type="number" min={1} max={30} value={contractForm.durationDays} onChange={e => cf('durationDays', +e.target.value)}/>
                </div>
              </div>

              <div className="form-group mb-5">
                <label className="form-label">Additional Notes (optional — printed in contract)</label>
                <textarea className="form-textarea" rows={3} value={contractForm.additionalNotes}
                  onChange={e => cf('additionalNotes', e.target.value)}
                  placeholder="HOA requirements, special client instructions…"/>
              </div>

              <div style={{ background:'var(--navy3)', borderRadius:10, padding:'12px 18px',
                display:'flex', gap:20, flexWrap:'wrap', marginBottom:20 }}>
                <div><div className="text-xs text-muted">Contract No.</div><div className="font-600">{contractForm.contractNumber}</div></div>
                <div><div className="text-xs text-muted">Client</div><div className="font-600">{quote.clientName}</div></div>
                <div><div className="text-xs text-muted">Total Price</div><div className="font-mono font-bold text-orange">{fmt(gross)}</div></div>
                <div><div className="text-xs text-muted">Items</div><div className="font-600">{(quote.items||[]).length} line items</div></div>
              </div>

              <button className="btn btn-primary w-full" style={{ padding:14, fontSize:15, justifyContent:'center' }}
                onClick={() => download('contract')} disabled={loading === 'contract'}>
                {loading === 'contract' ? '⏳ Generating Contract…' : '⬇️  Download Installation Contract PDF'}
              </button>
              <div style={{ textAlign:'center', fontSize:11, color:'var(--text2)', marginTop:8 }}>
                Print 2 copies — one for your file, one for the client after signing.
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
