import { useState } from 'react'
import { Link, router, useForm, usePage } from '@inertiajs/react'
import AdminLayout from '@/Layouts/AdminLayout'
import { initials } from '@/lib/utils'

export default function RecruitersIndex({ recruiters, filters, stats }) {
    const { flash } = usePage().props
    const [showAdd, setShowAdd] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState(null)

    const { data, setData, post, processing, errors, reset } = useForm({
        name: '', email: '', password: '', tier: 'junior', trust_level: 'standard', recruiter_group: '',
    })

    function filter(key, val) {
        router.get(route('admin.recruiters.index'), { ...filters, [key]: val }, { preserveState: true, replace: true })
    }

    function submitAdd(e) {
        e.preventDefault()
        post(route('admin.recruiters.store'), {
            onSuccess: () => { setShowAdd(false); reset() }
        })
    }

    function confirmDelete(r) { setDeleteTarget(r) }
    function doDelete() {
        if (!deleteTarget) return
        router.delete(route('admin.recruiters.destroy', deleteTarget.id), {
            onSuccess: () => setDeleteTarget(null)
        })
    }

    const TIER_COLORS = { junior: 'var(--sea2)', senior: 'var(--amber2)', elite: 'var(--violet2)' }
    const labelStyle = { fontSize: 12, fontWeight: 500, color: 'var(--ink2)', display: 'block', marginBottom: 4 }

    return (
        <AdminLayout title="Recruiters">
            <div className="page-content">
                <div className="page-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div>
                        <div className="page-title">Recruiters</div>
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>+ Add Recruiter</button>
                </div>

                <div className="stat-row" style={{ marginBottom: 20 }}>
                    {[
                        { label: 'Total', value: stats.total, color: 'var(--sea2)' },
                        { label: 'Junior', value: stats.junior, color: 'var(--sea3)' },
                        { label: 'Senior', value: stats.senior, color: 'var(--amber2)' },
                        { label: 'Elite', value: stats.elite, color: 'var(--violet2)' },
                    ].map(s => (
                        <div className="dcard" key={s.label} style={{ padding: '14px 16px', position: 'relative' }}>
                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: s.color, borderRadius: '12px 12px 0 0' }} />
                            <div style={{ fontSize: 11, color: 'var(--ink3)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{s.label}</div>
                            <div style={{ fontSize: 26, fontFamily: 'var(--font-head)', fontWeight: 700, color: 'var(--ink)' }}>{s.value}</div>
                        </div>
                    ))}
                </div>

                <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                    {['', 'junior', 'senior', 'elite'].map(t => (
                        <button key={t} className={`btn btn-sm ${filters.tier === t || (!filters.tier && !t) ? 'btn-primary' : 'btn-secondary'}`} onClick={() => filter('tier', t)}>
                            {t || 'All'}
                        </button>
                    ))}
                    <input className="form-input" placeholder="Search by name..." defaultValue={filters.search || ''} onKeyDown={e => e.key === 'Enter' && filter('search', e.target.value)} style={{ height: 32, padding: '0 10px', fontSize: 12, maxWidth: 200 }} />
                </div>

                <div className="table-wrap">
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--wire)' }}>
                                {['Recruiter', 'Email', 'Tier', 'Trust', 'Group', 'Active Roles', 'Status', 'Actions'].map(h => (
                                    <th key={h} style={{ padding: '10px 14px', fontSize: 11, fontWeight: 500, color: 'var(--ink3)', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {recruiters.data.length === 0 ? (
                                <tr><td colSpan={8} style={{ padding: 32, textAlign: 'center', color: 'var(--ink3)' }}>No recruiters found.</td></tr>
                            ) : recruiters.data.map(r => (
                                <tr key={r.id} style={{ borderBottom: '1px solid var(--mist3)' }}>
                                    <td style={{ padding: '10px 14px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--sea)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, flexShrink: 0 }}>
                                                {initials(r.user?.name || '?')}
                                            </div>
                                            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{r.user?.name || '—'}</div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--ink3)' }}>{r.user?.email || '—'}</td>
                                    <td style={{ padding: '10px 14px' }}>
                                        <span style={{ fontSize: 11, fontWeight: 600, color: TIER_COLORS[r.tier], background: 'rgba(0,0,0,0.04)', borderRadius: 'var(--rxs)', padding: '2px 8px' }}>{r.tier}</span>
                                    </td>
                                    <td style={{ padding: '10px 14px' }}>
                                        {r.trust_level === 'trusted' ? <span className="badge badge-jade">trusted</span> : <span className="badge">standard</span>}
                                    </td>
                                    <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--ink3)' }}>{r.recruiter_group || '—'}</td>
                                    <td style={{ padding: '10px 14px', fontSize: 13, color: 'var(--ink)' }}>{r.active_mandates_count}/2</td>
                                    <td style={{ padding: '10px 14px' }}>
                                        <span style={{ fontSize: 11, color: r.user?.status === 'active' ? 'var(--jade2)' : 'var(--ruby2)', fontWeight: 500 }}>{r.user?.status || '—'}</span>
                                    </td>
                                    <td style={{ padding: '10px 14px' }}>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <Link href={route('admin.recruiters.show', r.id)} className="btn btn-sm btn-secondary">View</Link>
                                            <button className="btn btn-sm btn-danger" onClick={() => confirmDelete(r)}>Delete</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Recruiter Modal */}
            {showAdd && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="dcard" style={{ width: 440, padding: 28, position: 'relative' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-head)' }}>Add Recruiter</div>
                            <button className="btn btn-sm btn-ghost" onClick={() => { setShowAdd(false); reset() }}>✕</button>
                        </div>
                        <form onSubmit={submitAdd}>
                            <div className="form-group" style={{ marginBottom: 12 }}>
                                <label style={labelStyle}>Full Name</label>
                                <input className="form-input" value={data.name} onChange={e => setData('name', e.target.value)} placeholder="Jane Doe" />
                                {errors.name && <div className="form-error">{errors.name}</div>}
                            </div>
                            <div className="form-group" style={{ marginBottom: 12 }}>
                                <label style={labelStyle}>Email</label>
                                <input className="form-input" type="email" value={data.email} onChange={e => setData('email', e.target.value)} placeholder="jane@example.com" />
                                {errors.email && <div className="form-error">{errors.email}</div>}
                            </div>
                            <div className="form-group" style={{ marginBottom: 12 }}>
                                <label style={labelStyle}>Password</label>
                                <input className="form-input" type="password" value={data.password} onChange={e => setData('password', e.target.value)} placeholder="Min. 8 characters" />
                                {errors.password && <div className="form-error">{errors.password}</div>}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                                <div className="form-group">
                                    <label style={labelStyle}>Tier</label>
                                    <select className="form-input" value={data.tier} onChange={e => setData('tier', e.target.value)}>
                                        {['junior', 'senior', 'elite'].map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label style={labelStyle}>Trust Level</label>
                                    <select className="form-input" value={data.trust_level} onChange={e => setData('trust_level', e.target.value)}>
                                        {['standard', 'trusted'].map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="form-group" style={{ marginBottom: 20 }}>
                                <label style={labelStyle}>Recruiter Group</label>
                                <select className="form-input" value={data.recruiter_group} onChange={e => setData('recruiter_group', e.target.value)}>
                                    <option value="">None</option>
                                    {['Dwikar', 'Emma', 'BTI', 'Jiebei'].map(g => <option key={g} value={g}>{g}</option>)}
                                </select>
                            </div>
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setShowAdd(false); reset() }}>Cancel</button>
                                <button type="submit" className="btn btn-primary btn-sm" disabled={processing}>{processing ? 'Creating…' : 'Create Recruiter'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirm Modal */}
            {deleteTarget && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div className="dcard" style={{ width: 380, padding: 28 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-head)', marginBottom: 10 }}>Delete Recruiter?</div>
                        <div style={{ fontSize: 13, color: 'var(--ink3)', marginBottom: 20 }}>
                            This will permanently delete <strong>{deleteTarget.user?.name}</strong> and their account. This cannot be undone.
                        </div>
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                            <button className="btn btn-secondary btn-sm" onClick={() => setDeleteTarget(null)}>Cancel</button>
                            <button className="btn btn-danger btn-sm" onClick={doDelete}>Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    )
}
