import { useState } from 'react'

const csrf = () => document.querySelector('meta[name=csrf-token]')?.content

export default function AddCandidateModal({ mandateId, onClose, onSuccess, routeBase = 'recruiter.kanban' }) {
    const [form, setForm]     = useState({ first_name: '', last_name: '', email: '', linkedin_url: '', current_role: '', current_company: '', initial_stage: 'sourced' })
    const [loading, setLoading] = useState(false)
    const [error, setError]   = useState('')

    function f(k, v) { setForm(p => ({ ...p, [k]: v })) }

    function handleSubmit() {
        if (!form.first_name || !form.last_name) return
        setLoading(true)
        setError('')

        const fd = new FormData()
        Object.entries(form).forEach(([k, v]) => fd.append(k, v))
        fd.append('mandate_id', mandateId)

        fetch(route(routeBase + '.add-candidate'), {
            method: 'POST',
            headers: { 'X-CSRF-TOKEN': csrf() },
            body: fd,
        })
            .then(r => r.json())
            .then(d => {
                if (d.success) onSuccess(d.submission)
                else setError(d.message ?? 'Failed to add candidate.')
            })
            .catch(() => setError('Network error.'))
            .finally(() => setLoading(false))
    }

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 'var(--r)', border: '1px solid var(--wire)', padding: '20px 22px', width: '100%', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>Add candidate to pipeline</div>
                    <button onClick={onClose} style={{ fontSize: 15, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink4)' }}>✕</button>
                </div>

                {error && <div style={{ background: '#fef2f2', border: '1px solid var(--ruby2)', borderRadius: 'var(--rsm)', padding: '8px 12px', fontSize: 12, color: 'var(--ruby2)', marginBottom: 12 }}>{error}</div>}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div className="form-group">
                        <label className="form-label">First name *</label>
                        <input className="form-input" value={form.first_name} onChange={e => f('first_name', e.target.value)} placeholder="Sarah" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Last name *</label>
                        <input className="form-input" value={form.last_name} onChange={e => f('last_name', e.target.value)} placeholder="Wong" />
                    </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div className="form-group">
                        <label className="form-label">Current role</label>
                        <input className="form-input" value={form.current_role} onChange={e => f('current_role', e.target.value)} placeholder="CHRO" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Company</label>
                        <input className="form-input" value={form.current_company} onChange={e => f('current_company', e.target.value)} placeholder="OCBC Bank" />
                    </div>
                </div>
                <div className="form-group">
                    <label className="form-label">Email</label>
                    <input className="form-input" type="email" value={form.email} onChange={e => f('email', e.target.value)} />
                </div>
                <div className="form-group">
                    <label className="form-label">LinkedIn</label>
                    <input className="form-input" value={form.linkedin_url} onChange={e => f('linkedin_url', e.target.value)} placeholder="linkedin.com/in/…" />
                </div>
                <div className="form-group" style={{ marginBottom: 14 }}>
                    <label className="form-label">Initial stage</label>
                    <select className="form-input" value={form.initial_stage} onChange={e => f('initial_stage', e.target.value)}>
                        <option value="sourced">Sourced</option>
                        <option value="screened">Screened</option>
                    </select>
                </div>

                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSubmit} disabled={loading || !form.first_name || !form.last_name}>
                        {loading ? 'Adding…' : 'Add to pipeline'}
                    </button>
                    <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                </div>
            </div>
        </div>
    )
}
