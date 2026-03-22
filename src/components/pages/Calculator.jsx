import { useState } from 'react'
import { fmt } from '../../utils/format'

const PHIL_REGIONS = [
  { label:'Metro Manila / NCR', peak:4.8, rate:13.5 },
  { label:'Luzon (Central)',    peak:5.2, rate:12.0 },
  { label:'Luzon (North)',      peak:5.0, rate:11.5 },
  { label:'Visayas',            peak:5.4, rate:12.5 },
  { label:'Mindanao',           peak:5.5, rate:10.5 },
]

const APPLIANCES = [
  { id:'ac1',  label:'Aircon 1.0HP',      watts:900,  qty:1, hoursDay:8   },
  { id:'ac15', label:'Aircon 1.5HP',      watts:1350, qty:1, hoursDay:8   },
  { id:'ref',  label:'Refrigerator',      watts:150,  qty:1, hoursDay:24  },
  { id:'tv',   label:'Smart TV 55"',      watts:150,  qty:1, hoursDay:6   },
  { id:'wash', label:'Washing Machine',   watts:500,  qty:1, hoursDay:1   },
  { id:'pump', label:'Water Pump',        watts:750,  qty:1, hoursDay:2   },
  { id:'led',  label:'LED Lights (set)',  watts:50,   qty:5, hoursDay:6   },
  { id:'lap',  label:'Laptop',            watts:65,   qty:1, hoursDay:8   },
  { id:'rice', label:'Rice Cooker',       watts:600,  qty:1, hoursDay:1   },
  { id:'fan',  label:'Electric Fan (×2)', watts:60,   qty:2, hoursDay:8   },
  { id:'wh',   label:'Water Heater',      watts:3000, qty:1, hoursDay:0.5 },
  { id:'ev',   label:'EV Charger (L2)',   watts:7200, qty:1, hoursDay:3   },
]

function calculate({ dailyKwh, region, hasBrownouts, brownoutHrs, preferBattery, roofArea, budget, packages }) {
  const { peak: peakSun, rate: tariff } = region
  const sysKwp    = Math.max(3, Math.ceil((dailyKwh / peakSun / 0.80) * 2) / 2)
  const panelW    = 445
  const panels    = Math.ceil((sysKwp * 1000) / panelW)
  const actualKwp = panels * panelW / 1000
  const dailyGen  = actualKwp * peakSun * 0.80
  const selfConsume = Math.min(dailyGen, dailyKwh)
  const gridExport  = Math.max(dailyGen - dailyKwh, 0)

  let recType = 'on-grid', batteryKwh = 0, batteryReason = ''
  if (hasBrownouts || preferBattery) {
    recType = 'hybrid'
    batteryKwh = Math.ceil(Math.max((dailyKwh/18) * brownoutHrs * 1.2, 5) / 5) * 5
    batteryReason = hasBrownouts ? `Sized for ~${brownoutHrs}h backup` : 'Added per client preference'
  }
  const invKw   = Math.ceil(actualKwp * 1.1)
  const invType = recType === 'hybrid' ? 'Hybrid' : 'String'

  const INV_C  = invKw<=5?32000:invKw<=8?45000:invKw<=10?58000:72000
  const INV_P  = Math.round(INV_C * (recType==='hybrid'?1.45:1.38))
  const PANEL_C = 5400, PANEL_P = 7200
  const BAT_C  = batteryKwh * 9500, BAT_P = batteryKwh * 13500
  const MOUNT_C = 11000 + panels*200, MOUNT_P = Math.round(MOUNT_C*1.5)
  const WIRE_C  = Math.round(8000+actualKwp*800),  WIRE_P  = Math.round(WIRE_C*1.6)
  const LABOR_C = Math.round(12000+actualKwp*1200), LABOR_P = Math.round(LABOR_C*1.4)
  const PERM_C  = 5500, PERM_P = 9000, MISC_C = 3500, MISC_P = 5500

  const totalCost  = panels*PANEL_C + INV_C + BAT_C + MOUNT_C + WIRE_C + LABOR_C + PERM_C + MISC_C
  const totalPrice = panels*PANEL_P + INV_P + BAT_P + MOUNT_P + WIRE_P + LABOR_P + PERM_P + MISC_P

  const annualSavings = selfConsume * 365 * tariff
  const netMet        = gridExport  * 365 * tariff * 0.85
  const netBenefit    = annualSavings + netMet - 6000
  const simplePayback = (totalPrice / netBenefit).toFixed(1)

  let cum = 0, paybackYear = null
  const yearlyData = Array.from({ length:25 }, (_,i) => {
    const yr  = i+1
    const sav = selfConsume*365*tariff * Math.pow(0.995,yr) * Math.pow(1.04,yr)
    const nm  = gridExport *365*tariff*0.85 * Math.pow(0.995,yr) * Math.pow(1.04,yr)
    cum += sav + nm - 6000
    if (!paybackYear && cum >= totalPrice) paybackYear = yr
    return { yr, cumSavings: Math.round(cum) }
  })

  const annualGen = Math.round(dailyGen * 365)
  return {
    sysKwp: actualKwp, panels, panelW, invKw, invType, recType,
    batteryKwh, batteryReason,
    coverage: Math.round(Math.min(dailyGen/dailyKwh,1)*100),
    dailyKwh: dailyKwh.toFixed(1), dailyGen: dailyGen.toFixed(1),
    monthlyGen: Math.round(dailyGen*30), annualGen,
    selfConsume: selfConsume.toFixed(1), gridExport: gridExport.toFixed(1),
    totalCost, totalPrice,
    grossProfit: totalPrice-totalCost,
    grossMargin: ((totalPrice-totalCost)/totalPrice*100).toFixed(1),
    withinBudget: totalPrice <= ({200000:200000,300000:300000,500000:500000,750000:750000}[budget]||Infinity),
    roofFits: roofArea >= panels*2.5, roofNeeded: Math.round(panels*2.5),
    annualSavings: Math.round(annualSavings),
    netMeteringCredit: Math.round(netMet),
    netBenefit: Math.round(netBenefit),
    simplePayback, paybackYear,
    lifetime25: yearlyData[24].cumSavings,
    roi25: ((yearlyData[24].cumSavings-totalPrice)/totalPrice*100).toFixed(1),
    yearlyData,
    co2PerYear: (annualGen*0.67/1000).toFixed(2),
    treesEquiv: Math.round(annualGen*0.67/22),
    newMonthlyBill: Math.max(0, Math.round(dailyKwh*30*tariff - annualSavings/12)),
    billReduction: Math.round(Math.min((annualSavings/12)/(dailyKwh*30*tariff)*100, 100)),
    matchedPkg: packages?.find(p => Math.abs(parseFloat(p.size)-actualKwp)<=1.5 && p.type===recType) || null,
    region,
  }
}

export default function Calculator({ packages = [] }) {
  const [step,      setStep]      = useState(1)
  const [result,    setResult]    = useState(null)
  const [activeTab, setActiveTab] = useState('recommendation')
  const [region,    setRegion]    = useState(0)
  const [monthlyBill,setMonthlyBill] = useState(8000)
  const [inputMode, setInputMode] = useState('bill')
  const [hasBrownouts, setHasBrownouts] = useState(false)
  const [brownoutHrs,  setBrownoutHrs]  = useState(2)
  const [preferBattery,setPreferBattery]= useState(false)
  const [roofArea,  setRoofArea]  = useState(40)
  const [budget,    setBudget]    = useState('any')
  const [appliances,setAppliances]= useState(APPLIANCES.slice(0,6).map(a=>({...a,enabled:true})))
  const [showPicker,setShowPicker]= useState(false)

  const reg = PHIL_REGIONS[region]
  const dailyBill = monthlyBill / reg.rate / 30
  const dailyAppl = appliances.filter(a=>a.enabled).reduce((s,a)=>s+a.watts*a.qty*a.hoursDay/1000,0)
  const effectiveDailyKwh = inputMode==='bill' ? dailyBill : dailyAppl

  const doCalc = () => {
    setResult(calculate({ dailyKwh:effectiveDailyKwh, region:reg, hasBrownouts, brownoutHrs, preferBattery, roofArea, budget, packages }))
    setStep(3); setActiveTab('recommendation')
  }

  const r = result

  return (
    <div>
      {/* Progress */}
      <div style={{display:'flex',alignItems:'center',gap:0,marginBottom:28}}>
        {[{n:1,l:'Inputs'},{n:2,l:'Calculate'},{n:3,l:'Results'}].map((s,i)=>(
          <div key={s.n} style={{display:'flex',alignItems:'center'}}>
            <div onClick={()=>step>s.n&&setStep(s.n)} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 16px',borderRadius:8,background:step>=s.n?'rgba(245,130,13,.12)':'transparent',border:step===s.n?'1px solid rgba(245,130,13,.35)':'1px solid transparent',cursor:step>s.n?'pointer':'default'}}>
              <div style={{width:24,height:24,borderRadius:'50%',background:step>s.n?'var(--green)':step===s.n?'var(--orange)':'var(--navy3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:'#fff'}}>{step>s.n?'✓':s.n}</div>
              <span style={{fontSize:12.5,fontWeight:600,color:step>=s.n?'var(--text3)':'var(--text2)'}}>{s.l}</span>
            </div>
            {i<2&&<div style={{width:32,height:1,background:step>s.n?'var(--orange)':'var(--border)'}}/>}
          </div>
        ))}
      </div>

      {step===1 && (
        <div className="grid-2" style={{gap:24}}>
          <div style={{display:'flex',flexDirection:'column',gap:20}}>
            {/* Region */}
            <div className="card">
              <div className="card-header"><div className="card-title">📍 Location</div></div>
              <div className="card-body">
                <div className="form-group"><label className="form-label">Region</label>
                  <select className="form-select" value={region} onChange={e=>setRegion(+e.target.value)}>
                    {PHIL_REGIONS.map((r,i)=><option key={i} value={i}>{r.label} — ₱{r.rate}/kWh · {r.peak}h peak sun</option>)}
                  </select>
                </div>
              </div>
            </div>
            {/* Energy */}
            <div className="card">
              <div className="card-header">
                <div className="card-title">⚡ Energy Consumption</div>
                <div className="tabs" style={{marginBottom:0,background:'var(--navy3)',padding:'3px',borderRadius:8}}>
                  <button className={`tab ${inputMode==='bill'?'active':''}`} style={{padding:'5px 14px',fontSize:12}} onClick={()=>setInputMode('bill')}>Monthly Bill</button>
                  <button className={`tab ${inputMode==='appliances'?'active':''}`} style={{padding:'5px 14px',fontSize:12}} onClick={()=>setInputMode('appliances')}>Appliances</button>
                </div>
              </div>
              <div className="card-body">
                {inputMode==='bill' ? (
                  <div>
                    <div className="form-group"><label className="form-label">Average Monthly Bill (₱)</label>
                      <input className="form-input" type="number" value={monthlyBill} onChange={e=>setMonthlyBill(+e.target.value)}/>
                    </div>
                    <div style={{marginTop:12,background:'var(--navy3)',borderRadius:8,padding:'10px 14px',display:'flex',gap:20,flexWrap:'wrap'}}>
                      <div><div className="text-xs text-muted">Daily Usage</div><div className="font-mono font-bold text-orange" style={{fontSize:18}}>{dailyBill.toFixed(1)} kWh</div></div>
                      <div><div className="text-xs text-muted">Rate Used</div><div className="font-mono font-bold" style={{fontSize:15,color:'var(--text3)'}}>₱{reg.rate}/kWh</div></div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <table style={{width:'100%',borderCollapse:'collapse',fontSize:12.5}}>
                      <thead><tr style={{background:'var(--navy3)'}}>
                        {['On','Appliance','Qty','Watts','Hrs/Day','kWh/d'].map(h=><th key={h} style={{padding:'7px 8px',textAlign:'left',fontSize:11,color:'var(--text2)'}}>{h}</th>)}
                      </tr></thead>
                      <tbody>
                        {appliances.map(a=>(
                          <tr key={a.id} style={{borderBottom:'1px solid var(--border)',opacity:a.enabled?1:.4}}>
                            <td style={{padding:'6px 8px'}}><input type="checkbox" checked={a.enabled} onChange={()=>setAppliances(p=>p.map(x=>x.id===a.id?{...x,enabled:!x.enabled}:x))} style={{accentColor:'var(--orange)'}}/></td>
                            <td style={{padding:'6px 8px',color:'var(--text3)'}}>{a.label}</td>
                            <td style={{padding:'6px 8px'}}><input type="number" value={a.qty} onChange={e=>setAppliances(p=>p.map(x=>x.id===a.id?{...x,qty:+e.target.value}:x))} style={{width:40,background:'var(--input)',border:'1px solid var(--border)',borderRadius:4,color:'var(--text)',textAlign:'center',padding:'2px',fontSize:12,outline:'none'}} min={1}/></td>
                            <td style={{padding:'6px 8px'}}><input type="number" value={a.watts} onChange={e=>setAppliances(p=>p.map(x=>x.id===a.id?{...x,watts:+e.target.value}:x))} style={{width:55,background:'var(--input)',border:'1px solid var(--border)',borderRadius:4,color:'var(--text)',textAlign:'center',padding:'2px',fontSize:12,outline:'none'}} min={1}/></td>
                            <td style={{padding:'6px 8px'}}><input type="number" value={a.hoursDay} onChange={e=>setAppliances(p=>p.map(x=>x.id===a.id?{...x,hoursDay:+e.target.value}:x))} style={{width:40,background:'var(--input)',border:'1px solid var(--border)',borderRadius:4,color:'var(--text)',textAlign:'center',padding:'2px',fontSize:12,outline:'none'}} min={0.1} step={0.5}/></td>
                            <td className="font-mono text-orange font-600" style={{padding:'6px 8px'}}>{(a.watts*a.qty*a.hoursDay/1000).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="flex items-center justify-between mt-3">
                      <button className="btn btn-secondary btn-sm" onClick={()=>setShowPicker(true)}>＋ Add Appliance</button>
                      <div style={{background:'var(--navy3)',borderRadius:8,padding:'8px 14px'}}><div className="text-xs text-muted">Daily Total</div><div className="font-mono font-bold text-orange" style={{fontSize:17}}>{dailyAppl.toFixed(1)} kWh</div></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{display:'flex',flexDirection:'column',gap:20}}>
            <div className="card">
              <div className="card-header"><div className="card-title">🏠 Site</div></div>
              <div className="card-body">
                <div className="form-group"><label className="form-label">Usable Roof Area (sqm)</label>
                  <input className="form-input" type="number" value={roofArea} onChange={e=>setRoofArea(+e.target.value)} min={10}/>
                  <div className="form-hint">Typical home: 30–80 sqm</div>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="card-header"><div className="card-title">🔋 Power Reliability</div></div>
              <div className="card-body">
                <label style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer',marginBottom:12}}>
                  <input type="checkbox" checked={hasBrownouts} onChange={e=>setHasBrownouts(e.target.checked)} style={{accentColor:'var(--orange)',width:16,height:16}}/>
                  <span className="form-label" style={{margin:0}}>Area experiences brownouts</span>
                </label>
                {hasBrownouts&&<div className="form-group mb-3"><label className="form-label">Avg Duration (hrs)</label><input className="form-input" type="number" value={brownoutHrs} onChange={e=>setBrownoutHrs(+e.target.value)} min={1} max={24}/></div>}
                <label style={{display:'flex',alignItems:'center',gap:10,cursor:'pointer'}}>
                  <input type="checkbox" checked={preferBattery} onChange={e=>setPreferBattery(e.target.checked)} style={{accentColor:'var(--orange)',width:16,height:16}}/>
                  <span className="form-label" style={{margin:0}}>Client prefers battery backup</span>
                </label>
              </div>
            </div>
            <div className="card">
              <div className="card-header"><div className="card-title">💰 Budget</div></div>
              <div className="card-body">
                <select className="form-select" value={budget} onChange={e=>setBudget(e.target.value)}>
                  <option value="200000">Up to ₱200,000</option>
                  <option value="300000">Up to ₱300,000</option>
                  <option value="500000">Up to ₱500,000</option>
                  <option value="750000">Up to ₱750,000</option>
                  <option value="any">No limit</option>
                </select>
              </div>
            </div>
            <button className="btn btn-primary w-full" style={{padding:14,fontSize:15,justifyContent:'center'}} onClick={doCalc}>
              ⚡ Calculate Solar Recommendation →
            </button>
          </div>
        </div>
      )}

      {step===3 && r && (
        <div>
          <div className="tabs mb-5">
            {[['recommendation','🎯 Recommendation'],['pricing','💰 Pricing'],['roi','📈 ROI'],['environment','🌿 Environment']].map(([t,l])=>(
              <button key={t} className={`tab ${activeTab===t?'active':''}`} onClick={()=>setActiveTab(t)}>{l}</button>
            ))}
          </div>

          {activeTab==='recommendation'&&(
            <div>
              <div style={{background:'linear-gradient(135deg,var(--navy2),var(--navy3))',border:'1px solid var(--border)',borderRadius:16,padding:28,marginBottom:24}}>
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <div style={{fontSize:11,fontWeight:700,color:'var(--orange)',letterSpacing:2,textTransform:'uppercase',marginBottom:6}}>Recommended System</div>
                    <div style={{fontSize:36,fontWeight:800,lineHeight:1}}>{r.sysKwp} kWp</div>
                    <div style={{fontSize:16,color:'var(--text2)',marginTop:4}}>{r.recType==='hybrid'?'Hybrid Solar System':'On-Grid Solar System'}</div>
                    <div className="flex gap-2 mt-3 flex-wrap">
                      <span className={`tag tag-${r.recType.replace('-','')}`} style={{fontSize:12,padding:'5px 14px'}}>{r.recType}</span>
                      <span style={{background:'rgba(255,255,255,.07)',border:'1px solid var(--border)',borderRadius:20,padding:'5px 14px',fontSize:12,color:'var(--text3)'}}>{r.panels} × {r.panelW}W panels</span>
                      <span style={{background:'rgba(255,255,255,.07)',border:'1px solid var(--border)',borderRadius:20,padding:'5px 14px',fontSize:12,color:'var(--text3)'}}>{r.invType} {r.invKw}kW</span>
                      {r.batteryKwh>0&&<span style={{background:'rgba(245,130,13,.15)',border:'1px solid rgba(245,130,13,.3)',borderRadius:20,padding:'5px 14px',fontSize:12,color:'var(--orange)'}}>🔋 {r.batteryKwh}kWh Battery</span>}
                    </div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div style={{fontSize:11,color:'var(--text2)',marginBottom:4}}>Estimated Investment</div>
                    <div className="font-mono" style={{fontSize:32,fontWeight:800,color:'var(--orange)'}}>{fmt(r.totalPrice)}</div>
                    <div style={{fontSize:13,color:'var(--green)',marginTop:4}}>Payback in ~{r.simplePayback} years</div>
                  </div>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:24}}>
                {[{icon:'⚡',val:r.dailyGen+' kWh',lbl:'Daily Generation',c:'var(--orange)'},{icon:'🔆',val:r.coverage+'%',lbl:'Bill Coverage',c:'var(--green)'},{icon:'📉',val:r.billReduction+'%',lbl:'Bill Reduction',c:'var(--purple)'},{icon:'📊',val:r.monthlyGen+' kWh',lbl:'Monthly Output',c:'var(--blue2)'}].map((c,i)=>(
                  <div key={i} style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:12,padding:16}}>
                    <div style={{fontSize:22,marginBottom:8}}>{c.icon}</div>
                    <div className="font-mono" style={{fontSize:22,fontWeight:800,color:c.c,lineHeight:1}}>{c.val}</div>
                    <div style={{fontSize:11.5,fontWeight:600,color:'var(--text3)',marginTop:5}}>{c.lbl}</div>
                  </div>
                ))}
              </div>
              <div className="grid-2">
                <div className="card">
                  <div className="card-header"><div className="card-title">🎯 Why This System?</div></div>
                  <div className="card-body" style={{display:'flex',flexDirection:'column',gap:10}}>
                    {[
                      [`Sized for your ${r.dailyKwh} kWh/day consumption`, true],
                      [`Generates ${r.dailyGen} kWh/day at ${r.region.peak}h peak sun`, true],
                      [r.recType==='hybrid'?`Hybrid + ${r.batteryKwh}kWh battery — ${r.batteryReason}`:'On-Grid — max ROI with stable grid', true],
                      [r.roofFits?`${r.panels} panels fit your ${roofArea}sqm roof`:`⚠️ Roof may be tight — need ~${r.roofNeeded}sqm`,r.roofFits],
                      [r.withinBudget?`Price ${fmt(r.totalPrice)} within budget`:`Note: ${fmt(r.totalPrice)} slightly over budget`,r.withinBudget],
                    ].map(([txt,ok],i)=>(
                      <div key={i} style={{display:'flex',gap:10,padding:'8px 12px',background:'var(--input)',borderRadius:8}}>
                        <span style={{fontSize:14}}>{ok?'✅':'⚠️'}</span>
                        <span style={{fontSize:12.5,color:'var(--text3)',lineHeight:1.5}}>{txt}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="card">
                  <div className="card-header"><div className="card-title">🔧 Tech Specs</div></div>
                  <div className="card-body">
                    {[['System',r.sysKwp+' kWp'],['Panels',r.panels+' × '+r.panelW+'W Mono'],['Inverter',r.invType+' '+r.invKw+'kW'],...(r.batteryKwh>0?[['Battery',r.batteryKwh+'kWh LiFePO4']]:[]),['Daily Output',r.dailyGen+' kWh'],['Annual Output',(+r.annualGen).toLocaleString()+' kWh'],['Roof Needed',r.roofNeeded+' sqm']].map(([l,v])=>(
                      <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'1px solid var(--border)'}}>
                        <span style={{fontSize:12,color:'var(--text2)'}}>{l}</span>
                        <span style={{fontSize:12.5,fontWeight:600}}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {r.matchedPkg&&<div style={{marginTop:20,padding:'16px 20px',background:'rgba(16,185,129,.08)',border:'1px solid rgba(16,185,129,.25)',borderRadius:12,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
                <div><div style={{fontSize:12,color:'var(--green)',fontWeight:700,textTransform:'uppercase',letterSpacing:1,marginBottom:4}}>✅ Matching Package in Catalog</div><div style={{fontSize:15,fontWeight:700}}>{r.matchedPkg.name}</div></div>
                <div style={{textAlign:'right'}}><div style={{fontSize:11,color:'var(--text2)'}}>Catalog Price</div><div className="font-mono" style={{fontSize:22,fontWeight:800,color:'var(--orange)'}}>{fmt(r.matchedPkg.priceBase||0)}</div></div>
              </div>}
            </div>
          )}

          {activeTab==='pricing'&&(
            <div className="grid-2">
              <div className="card">
                <div className="card-header"><div className="card-title">💰 Investment Breakdown</div></div>
                <div className="card-body">
                  {[['Solar Panels',r.panels*5400,r.panels*7200,'#3266ad'],['Inverter',r.invKw<=5?32000:r.invKw<=8?45000:58000,r.invKw<=5?Math.round(32000*1.38):r.invKw<=8?Math.round(45000*1.38):Math.round(58000*1.38),'#73726c'],...(r.batteryKwh>0?[['Battery',r.batteryKwh*9500,r.batteryKwh*13500,'#E88B2C']]:[]),['Mounting',11000+r.panels*200,Math.round((11000+r.panels*200)*1.5),'#5a8f5a'],['Wiring',Math.round(8000+r.sysKwp*800),Math.round((8000+r.sysKwp*800)*1.6),'#8060c0'],['Labor',Math.round(12000+r.sysKwp*1200),Math.round((12000+r.sysKwp*1200)*1.4),'#c06060'],['Permits',5500,9000,'#5090a0'],['Misc',3500,5500,'#909090']].map(([label,cost,price,color])=>(
                    <div key={label} style={{marginBottom:12}}>
                      <div className="flex items-center justify-between mb-1">
                        <span style={{fontSize:12.5,color:'var(--text3)'}}>{label}</span>
                        <div className="flex gap-3">
                          <span style={{fontSize:11,color:'var(--text2)',fontFamily:"'JetBrains Mono',monospace"}}>Cost: {fmt(cost)}</span>
                          <span style={{fontSize:13,fontWeight:700,color:'var(--orange)',fontFamily:"'JetBrains Mono',monospace"}}>{fmt(price)}</span>
                        </div>
                      </div>
                      <div style={{height:6,background:'var(--navy3)',borderRadius:3,overflow:'hidden'}}><div style={{height:'100%',width:(price/r.totalPrice*100)+'%',background:color,borderRadius:3}}/></div>
                    </div>
                  ))}
                  <div className="hr"/>
                  {[['Total Cost',fmt(r.totalCost),'var(--text2)'],['Sell Price',fmt(r.totalPrice),'var(--orange)'],['Gross Profit',fmt(r.grossProfit),r.grossProfit>=0?'var(--green)':'var(--red)'],['Margin',r.grossMargin+'%',parseFloat(r.grossMargin)>=30?'var(--green)':'var(--orange)']].map(([l,v,c])=>(
                    <div key={l} className="flex items-center justify-between" style={{padding:'6px 0',borderBottom:'1px solid var(--border)'}}>
                      <span className="text-sm text-muted">{l}</span><span className="font-mono font-600" style={{color:c}}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="card">
                <div className="card-header"><div className="card-title">💳 Payment Schedule</div></div>
                <div className="card-body">
                  {[['Down Payment (50%)',Math.round(r.totalPrice*.5),'Upon contract signing'],['2nd Payment (30%)',Math.round(r.totalPrice*.3),'Upon equipment delivery'],['Final (20%)',Math.round(r.totalPrice*.2),'Upon commissioning']].map(([l,v,n])=>(
                    <div key={l} style={{padding:'12px 14px',background:'var(--input)',borderRadius:8,marginBottom:10}}>
                      <div className="flex items-center justify-between">
                        <div><div style={{fontSize:12.5,fontWeight:600}}>{l}</div><div style={{fontSize:11,color:'var(--text2)',marginTop:2}}>{n}</div></div>
                        <div className="font-mono" style={{fontSize:18,fontWeight:800,color:'var(--orange)'}}>{fmt(v)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab==='roi'&&(
            <div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:24}}>
                {[{icon:'📅',val:r.simplePayback+' yrs',lbl:'Simple Payback',c:'var(--blue2)'},{icon:'💸',val:fmt(r.netBenefit),lbl:'Net Annual Benefit',c:'var(--green)'},{icon:'💰',val:fmt(r.lifetime25),lbl:'25-Year Savings',c:'var(--orange)'},{icon:'📈',val:r.roi25+'%',lbl:'25-Year ROI',c:'var(--purple)'}].map((c,i)=>(
                  <div key={i} style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:12,padding:18}}>
                    <div style={{fontSize:22,marginBottom:10}}>{c.icon}</div>
                    <div className="font-mono" style={{fontSize:24,fontWeight:800,color:c.c,lineHeight:1}}>{c.val}</div>
                    <div style={{fontSize:11.5,color:'var(--text2)',marginTop:6}}>{c.lbl}</div>
                  </div>
                ))}
              </div>
              <div className="card">
                <div className="card-header"><div className="card-title">📈 25-Year Cumulative Savings</div></div>
                <div className="card-body">
                  <div className="bar-chart">
                    {r.yearlyData.filter((_,i)=>[0,4,9,14,19,24].includes(i)).map(y=>{
                      const maxV=r.yearlyData[24].cumSavings||1
                      return (
                        <div key={y.yr} className="bar-row">
                          <div className="bar-label">Year {y.yr}</div>
                          <div className="bar-track"><div className="bar-fill" style={{width:(Math.max(y.cumSavings,0)/maxV*100)+'%',background:y.cumSavings>=r.totalPrice?'linear-gradient(90deg,var(--green),#34D399)':'linear-gradient(90deg,var(--blue2),var(--orange))'}}/></div>
                          <div className="bar-val" style={{fontSize:11,color:y.cumSavings>=r.totalPrice?'var(--green)':'var(--text2)'}}>{fmt(y.cumSavings)}</div>
                        </div>
                      )
                    })}
                  </div>
                  {r.paybackYear&&<div style={{marginTop:14,padding:'10px 14px',background:'rgba(16,185,129,.08)',border:'1px solid rgba(16,185,129,.2)',borderRadius:8,fontSize:12,color:'var(--green)'}}>✅ System pays for itself by <strong>Year {r.paybackYear}</strong> — {25-r.paybackYear} more years of profit!</div>}
                </div>
              </div>
            </div>
          )}

          {activeTab==='environment'&&(
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:20}}>
              {[{icon:'🌍',val:r.co2PerYear+' tonnes',lbl:'CO₂ Avoided / Year'},{icon:'🌳',val:r.treesEquiv,lbl:'Trees Equivalent / Year'},{icon:'☀️',val:(+r.annualGen).toLocaleString()+' kWh',lbl:'Clean Energy / Year'}].map((c,i)=>(
                <div key={i} style={{background:'var(--card)',border:'1px solid rgba(16,185,129,.2)',borderRadius:14,padding:24,textAlign:'center'}}>
                  <div style={{fontSize:36,marginBottom:12}}>{c.icon}</div>
                  <div className="font-mono" style={{fontSize:28,fontWeight:800,color:'var(--green)'}}>{c.val}</div>
                  <div style={{fontSize:12.5,fontWeight:600,color:'var(--text3)',marginTop:6}}>{c.lbl}</div>
                </div>
              ))}
            </div>
          )}

          <div style={{marginTop:24,display:'flex',gap:12,justifyContent:'flex-end'}}>
            <button className="btn btn-secondary" onClick={()=>{setStep(1);setResult(null)}}>← Recalculate</button>
          </div>
        </div>
      )}

      {/* Appliance picker */}
      {showPicker&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowPicker(false)}>
          <div className="modal" style={{maxWidth:480}}>
            <div className="modal-header"><div className="modal-title">Add Appliance</div><button className="btn-icon" onClick={()=>setShowPicker(false)}>✕</button></div>
            <div className="modal-body" style={{display:'flex',flexDirection:'column',gap:6}}>
              {APPLIANCES.filter(a=>!appliances.find(s=>s.id===a.id)).map(a=>(
                <div key={a.id} onClick={()=>{setAppliances(p=>[...p,{...a,enabled:true}]);setShowPicker(false)}} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 14px',background:'var(--input)',borderRadius:8,cursor:'pointer',border:'1px solid var(--border)',transition:'border-color .15s'}} onMouseEnter={e=>e.currentTarget.style.borderColor='var(--orange)'} onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border)'}>
                  <div><div style={{fontWeight:600,fontSize:13}}>{a.label}</div><div className="text-xs text-muted">{a.watts}W × {a.qty} × {a.hoursDay}h/day</div></div>
                  <div className="font-mono text-orange font-600">{(a.watts*a.qty*a.hoursDay/1000).toFixed(2)} kWh/d</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
