import { useState, useMemo } from 'react'
import { useClients, useCreateClient, useUpdateClient, useDeleteClient } from '../../hooks/useApi'
import { useQuotations } from '../../hooks/useApi'
import { fmt, fmtDate, quoteProfit } from '../../utils/format'
import { LoadingPage, PageError, EmptyState, ConfirmModal, FieldError } from '../ui/index'

const EMPTY = { name:'', email:'', phone:'', address:'', notes:'' }

function ClientForm({ initial, fieldErrors = {}, onChange }) {
  return (
    <div className="form-grid form-grid-2">
      <div className="form-group" style={{ gridColumn:'1/-1' }}>
        <label className="form-label">Full Name *</label>
        <input className="form-input" value={initial.name} onChange={e => onChange('name', e.target.value)} placeholder="Client full name"/>
        <FieldError errors={fieldErrors} field="name"/>
      </div>
      <div className="form-group">
        <label className="form-label">Phone</label>
        <input className="form-input" value={initial.phone ?? ''} onChange={e => onChange('phone', e.target.value)} placeholder="+63 xxx xxx xxxx"/>
      </div>
      <div className="form-group">
        <label className="form-label">Email</label>
        <input className="form-input" value={initial.email ?? ''} onChange={e => onChange('email', e.target.value)} placeholder="client@email.com"/>
        <FieldError errors={fieldErrors} field="email"/>
      </div>
      <div className="form-group" style={{ gridColumn:'1/-1' }}>
        <label className="form-label">Address</label>
        <input className="form-input" value={initial.address ?? ''} onChange={e => onChange('address', e.target.value)}/>
      </div>
      <div className="form-group" style={{ gridColumn:'1/-1' }}>
        <label className="form-label">Notes</label>
        <textarea className="form-textarea" rows={2} value={initial.notes ?? ''} onChange={e => onChange('notes', e.target.value)}/>
      </div>
    </div>
  )
}

export default function ClientsPage({ toast }) {
  const { data: clients = [], isLoading, error, refetch } = useClients()
  const { data: quotes  = [] }                            = useQuotations()

  const createMut = useCreateClient({ onSuccess: () => { toast('Client added', 'success'); closeModal() }, onError: e => handleMutError(e) })
  const updateMut = useUpdateClient({ onSuccess: () => { toast('Client updated', 'success'); closeModal() }, onError: e => handleMutError(e) })
  const deleteMut = useDeleteClient({ onSuccess: () => { toast('Client deleted', 'info'); setDelTarget(null) }, onError: e => toast(e.message, 'error') })

  const [modal,     setModal]     = useState(null)   // null | 'new' | client
  const [form,      setForm]      = useState(EMPTY)
  const [fieldErrs, setFieldErrs] = useState({})
  const [delTarget, setDelTarget] = useState(null)
  const [search,    setSearch]    = useState('')

  const closeModal = () => { setModal(null); setForm(EMPTY); setFieldErrs({}) }
  const openNew    = () => { setForm(EMPTY); setFieldErrs({}); setModal('new') }
  const openEdit   = (c) => { setForm({ ...c }); setFieldErrs({}); setModal(c.id) }
  const upd        = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleMutError = (e) => {
    if (e.fieldErrors && Object.keys(e.fieldErrors).length) setFieldErrs(e.fieldErrors)
    toast(e.message, 'error')
  }

  const save = () => {
    if (modal === 'new') createMut.mutate(form)
    else updateMut.mutate({ id: modal, data: form })
  }

  const filtered = useMemo(() => clients.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  ), [clients, search])

  const clientRevenue = (clientId, name) => {
    const cq = quotes.filter(q => q.clientId === clientId || q.clientName === name)
    const completed = cq.filter(q => q.status === 'COMPLETED')
    return {
      total:   cq.length,
      revenue: completed.reduce((s, q) => s + Number(q.grossPrice ?? 0), 0),
      profit:  completed.reduce((s, q) => s + Number(q.profit      ?? 0), 0),
    }
  }

  const isMutating = createMut.isPending || updateMut.isPending

  if (isLoading) return <LoadingPage message="Loading clients…"/>
  if (error)     return <PageError error={error} onRetry={refetch}/>

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div className="search-wrap" style={{ width: 280 }}>
          <span className="search-icon">🔍</span>
          <input className="form-input search-input" placeholder="Search by name or email…"
            value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
        <button className="btn btn-primary" onClick={openNew}>＋ Add Client</button>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Contact</th><th>Address</th><th>Quotes</th><th>Revenue</th><th>Profit</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7}><EmptyState icon="👥" title="No clients found" subtitle={search ? 'Try a different search' : 'Add your first client'}/></td></tr>
              )}
              {filtered.map(c => {
                const stats = clientRevenue(c.id, c.name)
                return (
                  <tr key={c.id}>
                    <td>
                      <div className="font-600">{c.name}</div>
                      {c.notes && <div className="text-xs text-muted mt-1" style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.notes}</div>}
                    </td>
                    <td>
                      <div className="text-sm">{c.phone || '—'}</div>
                      <div className="text-xs text-muted">{c.email || '—'}</div>
                    </td>
                    <td className="text-sm text-muted">{c.address || '—'}</td>
                    <td><span className="badge badge-orange">{stats.total}</span></td>
                    <td className="font-mono font-600 text-orange">{fmt(stats.revenue)}</td>
                    <td className="font-mono font-600 text-green">{fmt(stats.profit)}</td>
                    <td>
                      <div className="flex gap-2">
                        <button className="btn-icon" title="Edit" onClick={() => openEdit(c)}>✏️</button>
                        <button className="btn-icon" title="Delete" onClick={() => setDelTarget(c)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <div className="modal-title">{modal === 'new' ? 'New Client' : 'Edit Client'}</div>
              <button className="btn-icon" onClick={closeModal}>✕</button>
            </div>
            <div className="modal-body">
              <ClientForm initial={form} fieldErrors={fieldErrs} onChange={upd}/>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
              <button className="btn btn-primary" onClick={save} disabled={isMutating}>
                {isMutating ? 'Saving…' : 'Save Client'}
              </button>
            </div>
          </div>
        </div>
      )}

      {delTarget && (
        <ConfirmModal
          title="Delete Client"
          message={`Delete ${delTarget.name}? Their quotations will remain in the system.`}
          onConfirm={() => deleteMut.mutate(delTarget.id)}
          onCancel={() => setDelTarget(null)}
          loading={deleteMut.isPending}
        />
      )}
    </div>
  )
}
