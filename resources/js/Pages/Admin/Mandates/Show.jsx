import { Link } from '@inertiajs/react'
import AdminLayout from '@/Layouts/AdminLayout'
import { fmtDate, fmtCurrency, fmtRelative } from '@/lib/utils'

const STATUS_COLORS = {
    draft: 'var(--ink3)',
    active: 'var(--jade2)',
    paused: 'var(--amber2)',
    closed: 'var(--ink3)',
    filled: 'var(--sea2)',
    dropped: 'var(--ruby2)',
}

const CLIENT_STATUS_COLORS = {
    sourced:     'var(--ink4)',
    screened:    'var(--amber2)',
    interview:   'var(--sea2)',
    offered:     'var(--violet2)',
    offer_made:  'var(--violet2)',
    hired:       'var(--jade2)',
    rejected:    'var(--ruby2)',
    shortlisted: 'var(--jade3)',
    pending:     'var(--amber2)',
    on_hold:     'var(--ink4)',
}

const ADMIN_STATUS_COLORS = {
    pending:  'var(--amber2)',
    approved: 'var(--jade2)',
    rejected: 'var(--ruby2)',
    bypassed: 'var(--violet2)',
}

export default function MandateShow({ mandate }) {
    const submissions = mandate.submissions ?? []
    const claims = mandate.claims ?? []
    const approvedClaim = claims.find(c => c.status === 'approved')

    return (
        <AdminLayout title={mandate.title} breadcrumb={mandate.title}>
            <div className="page-content">
                <div className="page-head">
                    <div>
                        <div className="page-title">{mandate.title}</div>
                        <div className="page-sub">{mandate.client?.company_name} · {mandate.location || 'Remote'}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <Link href={route('admin.mandates.kanban', mandate.id)} className="btn btn-primary">View Kanban →</Link>
                        <Link href={route('admin.mandates.edit', mandate.id)} className="btn btn-secondary">Edit</Link>
                        <a href={route('admin.mandates.index')} className="btn btn-secondary">← Back</a>
                    </div>
                </div>

                {/* Stat row */}
                <div className="stat-row" style={{ marginBottom: 16 }}>
                    {[
                        { label: 'Claims', val: claims.length },
                        { label: 'Submitted CDDs', val: submissions.length },
                        { label: 'Approved', val: submissions.filter(s => s.admin_review_status === 'approved').length },
                        { label: 'Hired', val: submissions.filter(s => s.client_status === 'hired').length },
                    ].map(({ label, val }) => (
                        <div key={label} className="dcard" style={{ padding: '14px 16px', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'var(--sea2)' }} />
                            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--font-head)' }}>{val}</div>
                            <div style={{ fontSize: 11, color: 'var(--ink4)', marginTop: 2 }}>{label}</div>
                        </div>
                    ))}
                </div>

                <div className="g21" style={{ gap: 16 }}>
                    <div>
                        {/* Submitted Candidates */}
                        <div className="dcard" style={{ padding: 20, marginBottom: 16 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>Submitted Candidates ({submissions.length}/3)</span>
                                {approvedClaim && (
                                    <span style={{ fontSize: 11, color: 'var(--ink4)' }}>
                                        by {approvedClaim.recruiter?.user?.name}
                                    </span>
                                )}
                            </div>
                            {!submissions.length ? (
                                <div style={{ fontSize: 12, color: 'var(--ink3)', padding: '8px 0' }}>No candidates submitted yet.</div>
                            ) : submissions.map(s => (
                                <div key={s.id} style={{
                                    padding: '12px 0',
                                    borderBottom: '1px solid var(--wire)',
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                                }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                                            <div style={{
                                                width: 28, height: 28, borderRadius: '50%',
                                                background: 'var(--sea-pale)', color: 'var(--sea2)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: 10, fontWeight: 700, flexShrink: 0,
                                            }}>
                                                {(s.candidate?.name || '?').split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                                            </div>
                                            <div>
                                                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                                                    #{s.submission_number} — {s.candidate?.name || '—'}
                                                </div>
                                                <div style={{ fontSize: 11, color: 'var(--ink4)' }}>
                                                    {s.candidate?.current_title} · {s.candidate?.current_company}
                                                </div>
                                            </div>
                                        </div>
                                        {s.recruiter_note && (
                                            <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 4, marginLeft: 36,
                                                maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {s.recruiter_note}
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', flex: 'column', alignItems: 'flex-end', gap: 4 }}>
                                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                            <span style={{
                                                fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                                                background: (ADMIN_STATUS_COLORS[s.admin_review_status] || 'var(--ink4)') + '22',
                                                color: ADMIN_STATUS_COLORS[s.admin_review_status] || 'var(--ink4)',
                                            }}>
                                                {s.admin_review_status}
                                            </span>
                                            <span style={{
                                                fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                                                background: (CLIENT_STATUS_COLORS[s.client_status] || 'var(--ink4)') + '22',
                                                color: CLIENT_STATUS_COLORS[s.client_status] || 'var(--ink4)',
                                            }}>
                                                {s.client_status}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: 10, color: 'var(--ink4)', textAlign: 'right' }}>
                                            {fmtRelative(s.submitted_at || s.created_at)}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Claims / Recruiter Applications */}
                        <div className="dcard" style={{ padding: 20, marginBottom: 16 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Recruiter Claims ({claims.length})</div>
                            {!claims.length ? (
                                <div style={{ fontSize: 12, color: 'var(--ink3)' }}>No claims yet.</div>
                            ) : claims.map(c => (
                                <div key={c.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--wire)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{c.recruiter?.user?.name || '—'}</div>
                                        <div style={{ fontSize: 11, color: 'var(--ink4)' }}>
                                            {c.recruiter?.tier}
                                            {c.assigned_at ? ` · Day 0: ${fmtDate(c.assigned_at)}` : ' · Pending'}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                        <Link
                                            href={route('admin.claims.approve', c.id)}
                                            method="post"
                                            as="button"
                                            style={{ fontSize: 11, padding: '3px 10px', borderRadius: 5, border: '1px solid var(--jade2)', background: 'transparent', color: 'var(--jade2)', cursor: 'pointer', display: c.status !== 'pending' ? 'none' : '' }}
                                        >Approve</Link>
                                        <span style={{
                                            fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                                            background: (c.status === 'approved' ? 'var(--jade2)' : c.status === 'rejected' ? 'var(--ruby2)' : 'var(--amber2)') + '22',
                                            color: c.status === 'approved' ? 'var(--jade2)' : c.status === 'rejected' ? 'var(--ruby2)' : 'var(--amber2)',
                                        }}>{c.status}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Description */}
                        {mandate.description && (
                            <div className="dcard" style={{ padding: 20 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Description</div>
                                <div style={{ fontSize: 13, color: 'var(--ink2)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{mandate.description}</div>
                            </div>
                        )}
                    </div>

                    <div>
                        <div className="dcard" style={{ padding: 20 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Details</div>
                            {[
                                { label: 'Status', value: <span style={{ color: STATUS_COLORS[mandate.status] || 'var(--ink3)', fontWeight: 600, textTransform: 'capitalize' }}>{mandate.status}</span> },
                                { label: 'Client', value: mandate.client?.company_name || '—' },
                                { label: 'Seniority', value: mandate.seniority || '—' },
                                { label: 'Industry', value: mandate.industry || '—' },
                                { label: 'Openings', value: mandate.openings_count ?? 1 },
                                { label: 'Salary', value: mandate.salary_min ? `${fmtCurrency(mandate.salary_min, mandate.salary_currency)} – ${fmtCurrency(mandate.salary_max, mandate.salary_currency)}` : '—' },
                                { label: 'Reward %', value: mandate.reward_pct ? `${Math.round(mandate.reward_pct * 100)}%` : '—' },
                                { label: 'Fast Track', value: mandate.is_fast_track ? <span className="badge badge-jade">Yes</span> : 'No' },
                                { label: 'Timer B', value: mandate.timer_b_active ? <span className="badge badge-amber">Active</span> : 'Off' },
                                { label: 'Timer C', value: mandate.timer_c_active ? <span className="badge badge-amber">Active</span> : 'Off' },
                                { label: 'Created', value: fmtDate(mandate.created_at) },
                            ].map(({ label, value }) => (
                                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--mist3)', fontSize: 13 }}>
                                    <span style={{ color: 'var(--ink3)', fontWeight: 500 }}>{label}</span>
                                    <span style={{ color: 'var(--ink)' }}>{value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    )
}
