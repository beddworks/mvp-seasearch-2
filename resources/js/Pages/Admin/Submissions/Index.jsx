import { router, usePage } from '@inertiajs/react'
import AdminLayout from '@/Layouts/AdminLayout'
import { fmtRelative } from '@/lib/utils'

export default function SubmissionsIndex({ submissions, filters, stats }) {
    const { flash } = usePage().props

    function handleApprove(id) {
        if (!confirm('Approve this CDD submission?')) return
        router.post(route('admin.submissions.approve', id))
    }

    function handleReject(id) {
        const reason = prompt('Rejection reason:')
        if (!reason) return
        router.post(route('admin.submissions.reject', id), { reason })
    }

    return (
        <AdminLayout title="CDD Submissions">
            <div className="page-content">
                <div className="page-head">
                    <div>
                        <div className="page-title">CDD Submissions</div>
                        <div className="page-sub">Admin review queue for candidate submissions</div>
                    </div>
                </div>

            

                <div className="stat-row" style={{ marginBottom: 20 }}>
                    {[
                        { label: 'Pending Review', value: stats.pending, color: 'var(--amber2)' },
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
                        <button key={s} className={`btn btn-sm ${(filters.status || '') === s ? 'btn-primary' : 'btn-secondary'}`} onClick={() => router.get(route('admin.submissions.index'), { status: s }, { preserveState: true, replace: true })}>
                            {s || 'All'}
                        </button>
                    ))}
                </div>

                <div className="table-wrap">
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--wire)' }}>
                                {['Candidate', 'Mandate', 'Recruiter', 'Submission #', 'Submitted', 'Status', 'Actions'].map(h => (
                                    <th key={h} style={{ padding: '10px 14px', fontSize: 11, fontWeight: 500, color: 'var(--ink3)', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {submissions.data.length === 0 ? (
                                <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: 'var(--ink3)' }}>No submissions found.</td></tr>
                            ) : submissions.data.map(s => (
                                <tr key={s.id} style={{ borderBottom: '1px solid var(--mist3)' }}>
                                    <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{s.candidate?.name || '—'}</td>
                                    <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--sea2)' }}>{s.mandate?.title || '—'}</td>
                                    <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--ink3)' }}>{s.recruiter?.user?.name || '—'}</td>
                                    <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--ink3)' }}>#{s.submission_number || 1}</td>
                                    <td style={{ padding: '10px 14px', fontSize: 11, color: 'var(--ink3)' }}>{fmtRelative(s.created_at)}</td>
                                    <td style={{ padding: '10px 14px' }}>
                                        <span style={{ fontSize: 11, fontWeight: 600, color: s.admin_review_status === 'pending' ? 'var(--amber2)' : s.admin_review_status === 'approved' ? 'var(--jade2)' : 'var(--ruby2)' }}>
                                            {s.admin_review_status}
                                        </span>
                                    </td>
                                    <td style={{ padding: '10px 14px' }}>
                                        {s.admin_review_status === 'pending' && (
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <button className="btn btn-sm btn-success" onClick={() => handleApprove(s.id)}>Approve</button>
                                                <button className="btn btn-sm btn-danger" onClick={() => handleReject(s.id)}>Reject</button>
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
