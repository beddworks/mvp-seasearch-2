import { router, usePage } from '@inertiajs/react'
import AdminLayout from '@/Layouts/AdminLayout'
import { fmtRelative } from '@/lib/utils'

export default function ClaimsIndex({ claims, filters, stats }) {
    const { flash } = usePage().props

    function handleApprove(id) {
        if (!confirm('Approve this claim? This sets Day 0.')) return
        router.post(route('admin.claims.approve', id))
    }

    function handleReject(id) {
        const note = prompt('Rejection reason (optional):')
        if (note === null) return
        router.post(route('admin.claims.reject', id), { note })
    }

    return (
        <AdminLayout title="Claim Queue">
            <div className="page-content">
                <div className="page-head">
                    <div>
                        <div className="page-title">Claim Queue</div>
                        <div className="page-sub">Approve or reject recruiter mandate claims</div>
                    </div>
                </div>

                {flash?.success && (
                    <div style={{ background: 'var(--jade-pale)', border: '1px solid var(--jade3)', borderRadius: 'var(--rsm)', padding: '10px 14px', fontSize: 12, color: 'var(--jade)', marginBottom: 16 }}>
                        {flash.success}
                    </div>
                )}

                <div className="stat-row" style={{ marginBottom: 20 }}>
                    {[
                        { label: 'Pending', value: stats.pending, color: 'var(--amber2)' },
                        { label: 'Approved', value: stats.approved, color: 'var(--jade2)' },
                        { label: 'Rejected', value: stats.rejected, color: 'var(--ruby2)' },
                    ].map(s => (
                        <div className="dcard" key={s.label} style={{ padding: '14px 16px', position: 'relative' }}>
                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: s.color, borderRadius: '12px 12px 0 0' }} />
                            <div style={{ fontSize: 11, color: 'var(--ink3)', fontWeight: 500, textTransform: 'uppercase' }}>{s.label}</div>
                            <div style={{ fontSize: 26, fontFamily: 'var(--font-head)', fontWeight: 700, color: 'var(--ink)' }}>{s.value}</div>
                        </div>
                    ))}
                    <div className="dcard" style={{ padding: '14px 16px' }} />
                </div>

                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                    {['', 'pending', 'approved', 'rejected'].map(s => (
                        <button key={s} className={`btn btn-sm ${(filters.status || '') === s ? 'btn-primary' : 'btn-secondary'}`} onClick={() => router.get(route('admin.claims.index'), { status: s }, { preserveState: true, replace: true })}>
                            {s || 'All'}
                        </button>
                    ))}
                </div>

                <div className="table-wrap">
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--wire)' }}>
                                {['Mandate', 'Client', 'Recruiter', 'Tier', 'Requested', 'Status', 'Actions'].map(h => (
                                    <th key={h} style={{ padding: '10px 14px', fontSize: 11, fontWeight: 500, color: 'var(--ink3)', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {claims.data.length === 0 ? (
                                <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: 'var(--ink3)' }}>No claims found.</td></tr>
                            ) : claims.data.map(c => (
                                <tr key={c.id} style={{ borderBottom: '1px solid var(--mist3)' }}>
                                    <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 500, color: 'var(--sea2)' }}>{c.mandate?.title || '—'}</td>
                                    <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--ink3)' }}>{c.mandate?.client?.company_name || '—'}</td>
                                    <td style={{ padding: '10px 14px', fontSize: 13, color: 'var(--ink)' }}>{c.recruiter?.user?.name || '—'}</td>
                                    <td style={{ padding: '10px 14px' }}>
                                        {c.recruiter && <span className="badge badge-sea">{c.recruiter.tier}</span>}
                                    </td>
                                    <td style={{ padding: '10px 14px', fontSize: 11, color: 'var(--ink3)' }}>{fmtRelative(c.created_at)}</td>
                                    <td style={{ padding: '10px 14px' }}>
                                        <span style={{ fontSize: 11, fontWeight: 600, color: c.status === 'pending' ? 'var(--amber2)' : c.status === 'approved' ? 'var(--jade2)' : 'var(--ruby2)' }}>
                                            {c.status}
                                        </span>
                                    </td>
                                    <td style={{ padding: '10px 14px' }}>
                                        {c.status === 'pending' && (
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <button className="btn btn-sm btn-success" onClick={() => handleApprove(c.id)}>Approve</button>
                                                <button className="btn btn-sm btn-danger" onClick={() => handleReject(c.id)}>Reject</button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </AdminLayout>
    )
}
