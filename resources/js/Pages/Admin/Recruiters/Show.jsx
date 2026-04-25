import { useState } from 'react'
import { router, useForm } from '@inertiajs/react'
import AdminLayout from '@/Layouts/AdminLayout'
import { fmtDate, initials } from '@/lib/utils'

export default function RecruiterShow({ recruiter }) {
    const [showDelete, setShowDelete] = useState(false)
    const { data, setData, put, processing } = useForm({
        tier:            recruiter.tier,
        trust_level:     recruiter.trust_level,
        recruiter_group: recruiter.recruiter_group || '',
        status:          recruiter.user?.status || 'active',
    })

    function submit(e) {
        e.preventDefault()
        put(route('admin.recruiters.update', recruiter.id))
    }

    const labelStyle = { fontSize: 12, fontWeight: 500, color: 'var(--ink2)', display: 'block', marginBottom: 4 }

    return (
        <AdminLayout title={recruiter.user?.name || 'Recruiter'}>
            <div className="page-content">
                <div className="page-head">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--sea)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700 }}>
                            {initials(recruiter.user?.name || '?')}
                        </div>
                        <div>
                            <div className="page-title">{recruiter.user?.name}</div>
                            <div className="page-sub">{recruiter.user?.email} · {recruiter.tier} · {recruiter.trust_level}</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <a href={route('admin.recruiters.index')} className="btn btn-secondary">← Back</a>
                        <button className="btn btn-danger" onClick={() => setShowDelete(true)}>Delete</button>
                    </div>
                </div>

                <div className="g21" style={{ gap: 16 }}>
                    <div>
                        {/* Claims history */}
                        <div className="dcard" style={{ padding: 20, marginBottom: 16 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Active Mandates ({recruiter.active_mandates_count}/2)</div>
                            {!recruiter.claims?.length ? (
                                <div style={{ fontSize: 12, color: 'var(--ink3)' }}>No claims yet.</div>
                            ) : recruiter.claims.map(c => (
                                <div key={c.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--mist3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--sea2)' }}>{c.mandate?.title || '—'}</div>
                                        <div style={{ fontSize: 11, color: 'var(--ink3)' }}>{c.mandate?.client?.company_name} · {fmtDate(c.assigned_at)}</div>
                                    </div>
                                    <span className={`badge ${c.status === 'approved' ? 'badge-jade' : c.status === 'rejected' ? 'badge-ruby' : 'badge-amber'}`}>{c.status}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        {/* Update form */}
                        <div className="dcard" style={{ padding: 20 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Update Recruiter</div>
                            <form onSubmit={submit}>
                                <div className="form-group" style={{ marginBottom: 12 }}>
                                    <label style={labelStyle}>Tier</label>
                                    <select className="form-input" value={data.tier} onChange={e => setData('tier', e.target.value)}>
                                        {['junior', 'senior', 'elite'].map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div className="form-group" style={{ marginBottom: 12 }}>
                                    <label style={labelStyle}>Trust Level</label>
                                    <select className="form-input" value={data.trust_level} onChange={e => setData('trust_level', e.target.value)}>
                                        {['standard', 'trusted'].map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div className="form-group" style={{ marginBottom: 12 }}>
                                    <label style={labelStyle}>Recruiter Group</label>
                                    <select className="form-input" value={data.recruiter_group} onChange={e => setData('recruiter_group', e.target.value)}>
                                        <option value="">None</option>
                                        {['Dwikar', 'Emma', 'BTI', 'Jiebei'].map(g => <option key={g} value={g}>{g}</option>)}
                                    </select>
                                </div>
                                <div className="form-group" style={{ marginBottom: 14 }}>
                                    <label style={labelStyle}>Account Status</label>
                                    <select className="form-input" value={data.status} onChange={e => setData('status', e.target.value)}>
                                        {['active', 'pending', 'suspended'].map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <button type="submit" className="btn btn-primary btn-sm" disabled={processing}>
                                    {processing ? 'Saving...' : 'Update'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>

            {showDelete && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="dcard" style={{ width: 380, padding: 28 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-head)', marginBottom: 10 }}>Delete Recruiter?</div>
                        <div style={{ fontSize: 13, color: 'var(--ink3)', marginBottom: 20 }}>
                            This will permanently delete <strong>{recruiter.user?.name}</strong> and their account. This cannot be undone.
                        </div>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button className="btn btn-secondary btn-sm" onClick={() => setShowDelete(false)}>Cancel</button>
                            <button className="btn btn-danger btn-sm" onClick={() => router.delete(route('admin.recruiters.destroy', recruiter.id))}>Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    )
}
