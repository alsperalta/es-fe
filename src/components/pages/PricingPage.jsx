// PricingPage.jsx — full Pricing Tool (Custom Calculator, Cost Breakdown, All Setups, Margin Guide)
// This file contains the same logic as the standalone HTML app, now as a proper React component
// connected to savedCalcsApi for persistent save/load via Spring Boot.

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { savedCalcsApi } from '../../api/endpoints'
import { fmt } from '../../utils/format'

const SETUPS = [
  { id:'s1', name:'5kW On-Grid',  type:'on-grid', panels:12, panelW:415, inv:'Growatt 5kW String',  battKwh:0,  costs:{panels:57600,inverter:29000,battery:0,    mounting:13500,wiring:9200, labor:16000,permits:6200,overhead:9500, misc:4000}, prices:{panels:78000, inverter:39000,battery:0,    mounting:20000,wiring:15000,labor:23000,permits:9500, overhead:9500, misc:4000} },
  { id:'s2', name:'8kW On-Grid',  type:'on-grid', panels:18, panelW:445, inv:'Huawei 8kW String',  battKwh:0,  costs:{panels:93600,inverter:44000,battery:0,    mounting:18500,wiring:12500,labor:18000,permits:7000,overhead:12000,misc:5000}, prices:{panels:126000,inverter:60000,battery:0,    mounting:28000,wiring:20000,labor:26000,permits:11000,overhead:12000,misc:5000} },
  { id:'s3', name:'10kW On-Grid', type:'on-grid', panels:22, panelW:445, inv:'Huawei 10kW String', battKwh:0,  costs:{panels:114400,inverter:58000,battery:0,   mounting:22000,wiring:14500,labor:22000,permits:7500,overhead:14500,misc:6000}, prices:{panels:154000,inverter:78000,battery:0,   mounting:33000,wiring:23000,labor:32000,permits:12000,overhead:14500,misc:6000} },
  { id:'s4', name:'5kW Hybrid',   type:'hybrid',  panels:12, panelW:415, inv:'Deye 5kW Hybrid',   battKwh:5,  costs:{panels:57600,inverter:36500,battery:55000, mounting:13500,wiring:12000,labor:22000,permits:6500,overhead:14000,misc:6500}, prices:{panels:78000, inverter:50000,battery:76000, mounting:20000,wiring:19000,labor:32000,permits:10500,overhead:14000,misc:6500} },
  { id:'s5', name:'8kW Hybrid',   type:'hybrid',  panels:18, panelW:445, inv:'Deye 8kW Hybrid',   battKwh:10, costs:{panels:93600,inverter:56000,battery:96000, mounting:18500,wiring:15500,labor:25000,permits:7500,overhead:18000,misc:8000}, prices:{panels:126000,inverter:76000,battery:132000,mounting:28000,wiring:24000,labor:36000,permits:12000,overhead:18000,misc:8000} },
  { id:'s6', name:'12kW Hybrid',  type:'hybrid',  panels:26, panelW:445, inv:'Huawei 12kW Hybrid', battKwh:15, costs:{panels:135200,inverter:74000,battery:142500,mounting:25000,wiring:19500,labor:30000,permits:9000,overhead:22000,misc:10000},prices:{panels:182000,inverter:100000,battery:196000,mounting:38000,wiring:31000,labor:44000,permits:14000,overhead:22000,misc:10000} },
]
const COST_LABELS = {panels:'Solar Panels',inverter:'Inverter',battery:'Battery Storage',mounting:'Mounting',wiring:'Wiring & Conduit',labor:'Labor',permits:'Permits & Net Metering',overhead:'Overhead',misc:'Misc'}
const COST_COLORS = {panels:'#3266ad',inverter:'#73726c',battery:'#E88B2C',mounting:'#5a8f5a',wiring:'#8060c0',labor:'#c06060',permits:'#5090a0',overhead:'#909090',misc:'#b0906a'}

const setupTotals = s => {
  const tc = Object.values(s.costs).reduce((a,b)=>a+b,0)
  const tp = Object.values(s.prices).reduce((a,b)=>a+b,0)
  return { tc, tp, profit: tp-tc, margin: ((tp-tc)/tp*100).toFixed(1) }
}

const DEFAULTS = {label:'',nPanels:12,panelCost:4800,panelPrice:6500,invCost:29000,invPrice:39000,battKwh:0,battCostPerKwh:9500,battPricePerKwh:13500,mountCost:13500,mountPrice:20000,wiringCost:9200,wiringPrice:15000,laborCost:16000,laborPrice:23000,permitCost:6200,permitPrice:9500,overheadCost:9500,overheadPrice:9500,miscCost:4000,miscPrice:4000}

const MARGIN_ZONES = [
  {range:'Below 25%', badge:'badge-rejected', title:'Danger zone',      color:'var(--red)',    body:'Not covering overhead, callbacks, and rework. One bad callback erases all profit on that job.'},
  {range:'25–30%',    badge:'badge-orange',   title:'Acceptable',       color:'var(--orange)', body:'Viable at high volume (4+ jobs/month) while building your brand. Push up as referrals grow.'},
  {range:'30–35%',    badge:'badge-approved', title:'Target zone',      color:'var(--green)',  body:'Covers all costs, rework, slow months, and leaves real net profit. The industry sweet spot.'},
  {range:'35–40%',    badge:'badge-approved', title:'Premium tier',     color:'var(--green)',  body:'Justified by certified team, strong warranty, and after-sales. Hybrid systems earn this.'},
  {range:'Above 40%', badge:'badge-orange',   title:'Proceed carefully',color:'var(--orange)', body:'Risky unless you have a differentiator. Fine for difficult roofs or remote sites.'},
]

const priceSensRows = (tc, price) => [-20000,-10000,0,10000,20000,30000,50000].map(d=>{const p=price+d;const pr=p-tc;const mg=(pr/p*100).toFixed(1);return{delta:d,p,pr,mg}})

export default function PricingPage({ toast }) {
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState('custom')
  const [selSetup, setSelSetup]   = useState('s1')
  const [form, setForm]           = useState(DEFAULTS)
  const [saveModal, setSaveModal] = useState(false)
  const [loadModal, setLoadModal] = useState(false)
  const [saveName, setSaveName]   = useState('')
  const [delCalc, setDelCalc]     = useState(null)

  const { data: savedCalcs=[] } = useQuery({ queryKey:['savedCalcs'], queryFn: savedCalcsApi.getAll })
  const createMut = useMutation({ mutationFn: savedCalcsApi.create, onSuccess:()=>{ qc.invalidateQueries(['savedCalcs']); toast('Saved','success'); setSaveModal(false); setSaveName('') }, onError:e=>toast(e.message,'error') })
  const deleteMut = useMutation({ mutationFn: savedCalcsApi.delete, onSuccess:()=>{ qc.invalidateQueries(['savedCalcs']); toast('Deleted','info'); setDelCalc(null) }, onError:e=>toast(e.message,'error') })

  const f = (k,v) => setForm(p=>({...p,[k]:isNaN(+v)?v:+v}))

  const calc = useMemo(()=>{
    const equip   = form.nPanels*form.panelCost  + form.invCost  + form.battKwh*form.battCostPerKwh
    const equipP  = form.nPanels*form.panelPrice + form.invPrice + form.battKwh*form.battPricePerKwh
    const install = form.mountCost+form.wiringCost+form.laborCost
    const installP= form.mountPrice+form.wiringPrice+form.laborPrice
    const admin   = form.permitCost+form.overheadCost+form.miscCost
    const adminP  = form.permitPrice+form.overheadPrice+form.miscPrice
    const totalCost=equip+install+admin; const totalPrice=equipP+installP+adminP
    const profit=totalPrice-totalCost; const margin=totalPrice>0?(profit/totalPrice*100).toFixed(1):'0.0'
    return {equip,equipP,install,installP,admin,adminP,totalCost,totalPrice,profit,margin}
  },[form])

  const mc    = parseFloat(calc.margin)>=30?'text-green':parseFloat(calc.margin)>=25?'text-orange':'text-red'
  const mBadge= parseFloat(calc.margin)>=30?'badge-approved':parseFloat(calc.margin)>=25?'badge-orange':'badge-rejected'
  const activeSetup = SETUPS.find(s=>s.id===selSetup)
  const at = activeSetup ? setupTotals(activeSetup) : null

  const saveCalc = () => {
    if (!saveName.trim()) { toast('Enter a name','error'); return }
    createMut.mutate({ name: saveName.trim(), date: new Date().toISOString().slice(0,10), inputs:{...form}, result:{...calc} })
  }
  const loadCalc = entry => { setForm({...DEFAULTS,...entry.inputs}); setLoadModal(false); toast(`Loaded: ${entry.name}`,'info') }

  const lineItems = [
    {label:`Panels (${form.nPanels}×)`, cost:form.nPanels*form.panelCost, price:form.nPanels*form.panelPrice},
    {label:'Inverter', cost:form.invCost, price:form.invPrice},
    ...(form.battKwh>0?[{label:`Battery (${form.battKwh}kWh)`, cost:form.battKwh*form.battCostPerKwh, price:form.battKwh*form.battPricePerKwh}]:[]),
    {label:'Mounting', cost:form.mountCost, price:form.mountPrice},
    {label:'Wiring', cost:form.wiringCost, price:form.wiringPrice},
    {label:'Labor', cost:form.laborCost, price:form.laborPrice},
    {label:'Permits', cost:form.permitCost, price:form.permitPrice},
    {label:'Overhead', cost:form.overheadCost, price:form.overheadPrice},
    {label:'Misc', cost:form.miscCost, price:form.miscPrice},
  ]

  return (
    <div>
      <div className="tabs mb-5">
        {[['custom','🔧 Custom Calculator'],['breakdown','📊 Cost Breakdown'],['allsetups','📋 All Setups'],['margins','🎯 Margin Guide']].map(([t,l])=>(
          <button key={t} className={`tab ${activeTab===t?'active':''}`} onClick={()=>setActiveTab(t)}>{l}</button>
        ))}
      </div>

      {/* ── CUSTOM CALCULATOR ── */}
      {activeTab==='custom'&&(
        <div>
          <div className="flex items-center justify-between mb-5">
            <div className="flex gap-2">
              <button className="btn btn-secondary btn-sm" onClick={()=>setForm(DEFAULTS)}>↺ Reset</button>
              <button className="btn btn-secondary btn-sm" onClick={()=>setLoadModal(true)}>
                📂 Load {savedCalcs.length>0&&<span className="nav-badge" style={{marginLeft:4}}>{savedCalcs.length}</span>}
              </button>
            </div>
            <button className="btn btn-primary btn-sm" onClick={()=>{setSaveName(form.label||`Calc ${new Date().toLocaleDateString()}`);setSaveModal(true)}}>💾 Save</button>
          </div>

          <div style={{background:'linear-gradient(135deg,var(--navy2),var(--navy3))',border:'1px solid var(--border)',borderRadius:14,padding:'20px 24px',marginBottom:24,display:'flex',gap:20,flexWrap:'wrap',alignItems:'center',justifyContent:'space-between'}}>
            <div>
              <div style={{fontSize:11,color:'var(--text2)',letterSpacing:1,textTransform:'uppercase',marginBottom:4}}>Custom Setup</div>
              <div style={{fontSize:13,color:'var(--text2)'}}>{form.label||'Untitled calculation'}</div>
            </div>
            <div className="flex gap-5 flex-wrap">
              {[['Cost',fmt(calc.totalCost),'text-red'],['Price',fmt(calc.totalPrice),'text-orange'],['Profit',fmt(calc.profit),calc.profit>=0?'text-green':'text-red'],['Margin',calc.margin+'%',mc]].map(([l,v,c])=>(
                <div key={l} style={{textAlign:'center'}}>
                  <div style={{fontSize:10,color:'var(--text2)',textTransform:'uppercase',letterSpacing:.8,marginBottom:3}}>{l}</div>
                  <div className={`font-mono font-bold ${c}`} style={{fontSize:20}}>{v}</div>
                </div>
              ))}
              <span className={`badge ${mBadge}`} style={{alignSelf:'center',fontSize:12}}>{parseFloat(calc.margin)>=30?'Target ✓':parseFloat(calc.margin)>=25?'Acceptable':'Too Low ⚠'}</span>
            </div>
          </div>

          <div className="grid-2" style={{gap:20}}>
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              {/* Label */}
              <div className="card"><div className="card-body" style={{padding:'14px 18px'}}>
                <div className="form-group"><label className="form-label">Label / Client Name</label><input className="form-input" value={form.label} onChange={e=>f('label',e.target.value)} placeholder="e.g. Santos Residence – 8kW"/></div>
              </div></div>
              {/* Panels */}
              <div className="card">
                <div className="card-header" style={{padding:'12px 18px 10px'}}><div className="card-title" style={{fontSize:13}}>☀ Panels — <span className="text-orange font-mono">{form.nPanels} pcs</span></div></div>
                <div className="card-body">
                  <input type="range" min={6} max={40} value={form.nPanels} onChange={e=>f('nPanels',e.target.value)} style={{width:'100%',marginBottom:12}}/>
                  <div className="form-grid form-grid-2">
                    <div className="form-group"><label className="form-label">Cost/panel (₱)</label><input className="form-input" type="number" value={form.panelCost} onChange={e=>f('panelCost',e.target.value)}/><div className="form-hint">Total: {fmt(form.nPanels*form.panelCost)}</div></div>
                    <div className="form-group"><label className="form-label">Sell/panel (₱)</label><input className="form-input" type="number" value={form.panelPrice} onChange={e=>f('panelPrice',e.target.value)}/><div className="form-hint">Total: {fmt(form.nPanels*form.panelPrice)}</div></div>
                  </div>
                </div>
              </div>
              {/* Inverter */}
              <div className="card">
                <div className="card-header" style={{padding:'12px 18px 10px'}}><div className="card-title" style={{fontSize:13}}>⚡ Inverter</div></div>
                <div className="card-body">
                  <div className="form-grid form-grid-2">
                    <div className="form-group"><label className="form-label">Cost (₱)</label><input className="form-input" type="number" value={form.invCost} onChange={e=>f('invCost',e.target.value)}/></div>
                    <div className="form-group"><label className="form-label">Sell price (₱)</label><input className="form-input" type="number" value={form.invPrice} onChange={e=>f('invPrice',e.target.value)}/></div>
                  </div>
                </div>
              </div>
              {/* Battery */}
              <div className="card">
                <div className="card-header" style={{padding:'12px 18px 10px'}}><div className="card-title" style={{fontSize:13}}>🔋 Battery — <span className="text-orange font-mono">{form.battKwh} kWh</span></div></div>
                <div className="card-body">
                  <input type="range" min={0} max={30} step={5} value={form.battKwh} onChange={e=>f('battKwh',e.target.value)} style={{width:'100%',marginBottom:12}}/>
                  {form.battKwh>0&&<div className="form-grid form-grid-2">
                    <div className="form-group"><label className="form-label">Cost/kWh (₱)</label><input className="form-input" type="number" value={form.battCostPerKwh} onChange={e=>f('battCostPerKwh',e.target.value)}/></div>
                    <div className="form-group"><label className="form-label">Sell/kWh (₱)</label><input className="form-input" type="number" value={form.battPricePerKwh} onChange={e=>f('battPricePerKwh',e.target.value)}/></div>
                  </div>}
                </div>
              </div>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              {[{k:'mount',l:'🔧 Mounting',ck:'mountCost',pk:'mountPrice'},{k:'wire',l:'🔌 Wiring',ck:'wiringCost',pk:'wiringPrice'},{k:'labor',l:'👷 Labor',ck:'laborCost',pk:'laborPrice'},{k:'permit',l:'📋 Permits',ck:'permitCost',pk:'permitPrice'},{k:'oh',l:'🏢 Overhead',ck:'overheadCost',pk:'overheadPrice'},{k:'misc',l:'📦 Misc',ck:'miscCost',pk:'miscPrice'}].map(({k,l,ck,pk})=>(
                <div key={k} className="card">
                  <div className="card-header" style={{padding:'10px 18px 8px'}}><div className="card-title" style={{fontSize:13}}>{l}</div></div>
                  <div className="card-body" style={{paddingTop:10}}>
                    <div className="form-grid form-grid-2">
                      <div className="form-group"><label className="form-label">Your cost (₱)</label><input className="form-input" type="number" value={form[ck]} onChange={e=>f(ck,e.target.value)}/></div>
                      <div className="form-group"><label className="form-label">Charge client (₱)</label><input className="form-input" type="number" value={form[pk]} onChange={e=>f(pk,e.target.value)}/></div>
                    </div>
                    <div style={{fontSize:11,color:'var(--text2)',marginTop:2}}>Line profit: <span className={`font-mono font-600 ${(form[pk]-form[ck])>=0?'text-green':'text-red'}`}>{fmt(form[pk]-form[ck])}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Line item table */}
          <div className="card mt-5">
            <div className="card-header"><div className="card-title">Full Line-Item Breakdown</div></div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Item</th><th>Your Cost</th><th>Client Price</th><th>Line Profit</th><th>% of Price</th><th>Margin</th></tr></thead>
                <tbody>
                  {lineItems.map((row,i)=>{
                    const lp=row.price-row.cost; const lm=row.price>0?((lp/row.price)*100).toFixed(0)+'%':'—'
                    return (
                      <tr key={i}>
                        <td className="font-600">{row.label}</td>
                        <td className="font-mono text-muted">{fmt(row.cost)}</td>
                        <td className="font-mono text-orange font-600">{fmt(row.price)}</td>
                        <td className={`font-mono font-600 ${lp>=0?'text-green':'text-red'}`}>{fmt(lp)}</td>
                        <td className="text-sm text-muted">{calc.totalPrice>0?(row.price/calc.totalPrice*100).toFixed(1)+'%':'—'}</td>
                        <td><span className={`badge ${parseFloat(lm)>=30?'badge-approved':parseFloat(lm)>=20?'badge-orange':'badge-draft'}`}>{lm}</span></td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr style={{background:'var(--navy3)'}}>
                    <td className="font-bold">TOTAL</td>
                    <td className="font-mono font-bold text-red">{fmt(calc.totalCost)}</td>
                    <td className="font-mono font-bold text-orange">{fmt(calc.totalPrice)}</td>
                    <td className={`font-mono font-bold ${calc.profit>=0?'text-green':'text-red'}`}>{fmt(calc.profit)}</td>
                    <td>—</td>
                    <td><span className={`badge ${mBadge}`}>{calc.margin}%</span></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Price sensitivity */}
          <div className="card mt-5">
            <div className="card-header"><div className="card-title">Price Sensitivity</div></div>
            <div className="card-body">
              {priceSensRows(calc.totalCost,calc.totalPrice).map(({delta,p,pr,mg},i)=>{
                const isCurrent=delta===0; const mc2=parseFloat(mg)>=30?'text-green':parseFloat(mg)>=25?'text-orange':'text-red'; const mb2=parseFloat(mg)>=30?'badge-approved':parseFloat(mg)>=25?'badge-orange':'badge-rejected'
                return (
                  <div key={i} className="flex items-center gap-3 mb-2" style={{background:isCurrent?'rgba(245,130,13,.07)':'transparent',borderRadius:6,padding:'6px 8px',margin:'2px -8px'}}>
                    <div style={{width:120,fontSize:12,fontWeight:isCurrent?600:400,color:isCurrent?'var(--orange)':'var(--text2)',flexShrink:0}}>{isCurrent?'→ Current':(delta>0?'+':'')+fmt(delta)}</div>
                    <div className="bar-track" style={{flex:1}}><div className="bar-fill" style={{width:Math.min(parseFloat(mg)*2,100)+'%',background:parseFloat(mg)>=30?'var(--green)':parseFloat(mg)>=25?'var(--orange)':'var(--red)'}}/></div>
                    <div className="font-mono" style={{width:80,textAlign:'right',fontSize:12,color:'var(--text2)'}}>{fmt(p)}</div>
                    <span className={`badge ${mb2}`} style={{width:52,justifyContent:'center'}}>{mg}%</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── COST BREAKDOWN ── */}
      {activeTab==='breakdown'&&(
        <div>
          <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:20}}>
            {SETUPS.map(s=>{const{margin}=setupTotals(s);return(
              <button key={s.id} onClick={()=>setSelSetup(s.id)} style={{padding:'8px 14px',borderRadius:8,border:`1px solid ${selSetup===s.id?'var(--orange)':'var(--border)'}`,background:selSetup===s.id?'rgba(245,130,13,.12)':'transparent',color:selSetup===s.id?'var(--orange)':'var(--text2)',cursor:'pointer',fontSize:12,fontFamily:"'Sora',sans-serif",fontWeight:selSetup===s.id?600:400}}>
                <div style={{fontWeight:600,fontSize:13}}>{s.name}</div>
                <div style={{fontSize:10,marginTop:1,opacity:.8}}>{fmt(Object.values(s.prices).reduce((a,b)=>a+b,0))} · {margin}%</div>
              </button>
            )})}
          </div>
          {activeSetup&&at&&(
            <div>
              <div className="stats-grid mb-5">
                {[['orange','💰',fmt(at.tp),'Sell Price'],['blue','🏷️',fmt(at.tc),'Total Cost'],['green','📈',fmt(at.profit),'Gross Profit'],['purple','🎯',at.margin+'%','Gross Margin']].map(([c,icon,val,lbl])=>(
                  <div key={lbl} className={`stat-card ${c}`}><div className="stat-icon">{icon}</div><div className="stat-val">{val}</div><div className="stat-lbl">{lbl}</div></div>
                ))}
              </div>
              <div className="card">
                <div className="card-header"><div className="card-title">Cost vs Price — {activeSetup.name}</div></div>
                <div className="card-body">
                  {Object.entries(activeSetup.costs).filter(([k])=>k!=='battery'||activeSetup.battKwh>0).map(([k,costVal])=>{
                    const priceVal=activeSetup.prices[k]||0; const lp=priceVal-costVal; const lm=priceVal>0?((lp/priceVal)*100).toFixed(0):0
                    return (
                      <div key={k} style={{marginBottom:14}}>
                        <div className="flex items-center justify-between mb-1">
                          <span style={{fontSize:12.5,color:'var(--text3)'}}>{COST_LABELS[k]||k}</span>
                          <div className="flex gap-3">
                            <span style={{fontSize:11,color:'var(--text2)',fontFamily:"'JetBrains Mono',monospace"}}>Cost: {fmt(costVal)}</span>
                            <span style={{fontSize:13,fontWeight:700,color:'var(--orange)',fontFamily:"'JetBrains Mono',monospace"}}>Price: {fmt(priceVal)}</span>
                            <span className={`badge ${parseFloat(lm)>=30?'badge-approved':parseFloat(lm)>=20?'badge-orange':'badge-draft'}`}>{lm}%</span>
                          </div>
                        </div>
                        <div style={{display:'flex',gap:4,height:8}}>
                          <div style={{flex:costVal,background:COST_COLORS[k]||'#888',borderRadius:'4px 0 0 4px',opacity:.5}}/>
                          <div style={{flex:lp>0?lp:0,background:COST_COLORS[k]||'#888',borderRadius:'0 4px 4px 0'}}/>
                        </div>
                      </div>
                    )
                  })}
                  <div className="hr"/>
                  <div className="flex items-center justify-between">
                    <div><div className="text-xs text-muted">Total Cost</div><div className="font-mono font-bold text-red" style={{fontSize:16}}>{fmt(at.tc)}</div></div>
                    <div><div className="text-xs text-muted">Profit</div><div className={`font-mono font-bold ${at.profit>=0?'text-green':'text-red'}`} style={{fontSize:16}}>{fmt(at.profit)}</div></div>
                    <div><div className="text-xs text-muted">Sell Price</div><div className="font-mono font-bold text-orange" style={{fontSize:18}}>{fmt(at.tp)}</div></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ALL SETUPS ── */}
      {activeTab==='allsetups'&&(
        <div>
          <div className="card">
            <div className="card-header"><div className="card-title">All Setup Comparison</div><div className="card-sub">Click any row to view detailed breakdown</div></div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Setup</th><th>Type</th><th>Equipment</th><th>Install</th><th>Overhead</th><th>Total Cost</th><th>Sell Price</th><th>Profit</th><th>Margin</th></tr></thead>
                <tbody>
                  {SETUPS.map(s=>{
                    const{tc,tp,profit,margin}=setupTotals(s)
                    const equip=(s.costs.panels||0)+(s.costs.inverter||0)+(s.costs.battery||0)
                    const lab=(s.costs.mounting||0)+(s.costs.wiring||0)+(s.costs.labor||0)
                    const adm=(s.costs.permits||0)+(s.costs.overhead||0)+(s.costs.misc||0)
                    const mb2=parseFloat(margin)>=30?'badge-approved':parseFloat(margin)>=25?'badge-orange':'badge-rejected'
                    return (
                      <tr key={s.id} onClick={()=>{setSelSetup(s.id);setActiveTab('breakdown')}} style={{cursor:'pointer'}}>
                        <td><div className="font-600">{s.name}</div><div className="text-xs text-muted">{s.panels}×{s.panelW}W{s.battKwh>0?' · '+s.battKwh+'kWh':''}</div></td>
                        <td><span className={`tag tag-${s.type.replace('-','')}`}>{s.type}</span></td>
                        <td className="font-mono text-sm">{fmt(equip)}</td>
                        <td className="font-mono text-sm">{fmt(lab)}</td>
                        <td className="font-mono text-sm text-muted">{fmt(adm)}</td>
                        <td className="font-mono font-600">{fmt(tc)}</td>
                        <td className="font-mono font-600 text-orange">{fmt(tp)}</td>
                        <td className="font-mono font-600 text-green">{fmt(profit)}</td>
                        <td><span className={`badge ${mb2}`}>{margin}%</span></td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr style={{background:'var(--navy3)'}}>
                    <td className="font-bold" colSpan={5}>COMBINED TOTAL</td>
                    <td className="font-mono font-bold text-red">{fmt(SETUPS.reduce((s,x)=>s+setupTotals(x).tc,0))}</td>
                    <td className="font-mono font-bold text-orange">{fmt(SETUPS.reduce((s,x)=>s+setupTotals(x).tp,0))}</td>
                    <td className="font-mono font-bold text-green">{fmt(SETUPS.reduce((s,x)=>s+setupTotals(x).profit,0))}</td>
                    <td><span className="badge badge-approved">{(SETUPS.reduce((s,x)=>s+parseFloat(setupTotals(x).margin),0)/SETUPS.length).toFixed(1)}%</span></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── MARGIN GUIDE ── */}
      {activeTab==='margins'&&(
        <div className="grid-2">
          <div>
            {MARGIN_ZONES.map((z,i)=>(
              <div key={i} style={{padding:'16px 20px',borderRadius:10,marginBottom:12,background:'var(--card)',border:'1px solid var(--border)',borderLeft:`4px solid ${z.color}`}}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`badge ${z.badge}`}>{z.range}</span>
                  <span style={{fontSize:14,fontWeight:700}}>{z.title}</span>
                </div>
                <div style={{fontSize:12.5,color:'var(--text2)',lineHeight:1.65}}>{z.body}</div>
              </div>
            ))}
          </div>
          <div className="card">
            <div className="card-header"><div className="card-title">Your Setups at a Glance</div></div>
            <div className="card-body">
              {SETUPS.map(s=>{
                const{margin,tp}=setupTotals(s); const mc2=parseFloat(margin)>=30?'var(--green)':parseFloat(margin)>=25?'var(--orange)':'var(--red)'
                return (
                  <div key={s.id} className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-600">{s.name}</span>
                      <div className="flex gap-2"><span className="text-xs text-muted font-mono">{fmt(tp)}</span><span className="font-mono font-600" style={{fontSize:13,color:mc2}}>{margin}%</span></div>
                    </div>
                    <div style={{height:8,background:'var(--navy3)',borderRadius:4,overflow:'hidden'}}>
                      <div style={{height:'100%',width:Math.min(parseFloat(margin)*2,100)+'%',borderRadius:4,background:mc2,transition:'width .4s'}}/>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Save Modal */}
      {saveModal&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setSaveModal(false)}>
          <div className="modal" style={{maxWidth:420}}>
            <div className="modal-header"><div className="modal-title">Save Calculation</div><button className="btn-icon" onClick={()=>setSaveModal(false)}>✕</button></div>
            <div className="modal-body">
              <div className="form-group"><label className="form-label">Name</label><input className="form-input" autoFocus value={saveName} onChange={e=>setSaveName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&saveCalc()}/></div>
            </div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={()=>setSaveModal(false)}>Cancel</button><button className="btn btn-primary" onClick={saveCalc} disabled={createMut.isPending}>💾 Save</button></div>
          </div>
        </div>
      )}

      {/* Load Modal */}
      {loadModal&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setLoadModal(false)}>
          <div className="modal modal-lg">
            <div className="modal-header"><div className="modal-title">Saved Calculations ({savedCalcs.length})</div><button className="btn-icon" onClick={()=>setLoadModal(false)}>✕</button></div>
            <div className="modal-body">
              {savedCalcs.length===0&&<div className="empty"><div className="empty-icon">💾</div><div className="empty-sub">No saved calculations yet</div></div>}
              {[...savedCalcs].reverse().map(c=>{
                const mb2=parseFloat(c.result?.margin)>=30?'badge-approved':parseFloat(c.result?.margin)>=25?'badge-orange':'badge-rejected'
                return (
                  <div key={c.id} style={{padding:'14px 16px',background:'var(--input)',borderRadius:10,marginBottom:10,border:'1px solid var(--border)'}}>
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div>
                        <div className="font-600">{c.name}</div>
                        <div className="text-xs text-muted mt-1">{c.date} · {c.inputs?.nPanels} panels · {c.inputs?.battKwh>0?c.inputs.battKwh+'kWh':'on-grid'}</div>
                      </div>
                      <div className="flex gap-3 items-center flex-wrap">
                        <div><div className="text-xs text-muted">Price</div><div className="font-mono text-orange font-600">{fmt(c.result?.totalPrice||0)}</div></div>
                        <div><div className="text-xs text-muted">Profit</div><div className="font-mono text-green font-600">{fmt(c.result?.profit||0)}</div></div>
                        <span className={`badge ${mb2}`}>{c.result?.margin||0}%</span>
                        <button className="btn btn-secondary btn-sm" onClick={()=>loadCalc(c)}>Load</button>
                        <button className="btn btn-danger btn-sm" onClick={()=>setDelCalc(c)}>Delete</button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={()=>setLoadModal(false)}>Close</button></div>
          </div>
        </div>
      )}

      {delCalc&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setDelCalc(null)}>
          <div className="modal" style={{maxWidth:400}}>
            <div className="modal-header"><div className="modal-title">Delete?</div><button className="btn-icon" onClick={()=>setDelCalc(null)}>✕</button></div>
            <div className="modal-body"><p>Delete <strong>{delCalc.name}</strong>?</p></div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={()=>setDelCalc(null)}>Cancel</button><button className="btn btn-danger" onClick={()=>deleteMut.mutate(delCalc.id)} disabled={deleteMut.isPending}>Delete</button></div>
          </div>
        </div>
      )}
    </div>
  )
}
