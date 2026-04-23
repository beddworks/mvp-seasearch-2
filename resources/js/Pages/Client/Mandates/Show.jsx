import { Link } from '@inertiajs/react'
import ClientLayout from '@/Layouts/ClientLayout'
import { fmtDate, fmtRelative } from '@/lib/utils'

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

const MANDATE_STATUS_COLORS = {
    draft:   'var(--ink4)',
    active:  'var(--jade2)',
    paused:  'var(--amber2)',
    closed:  'var(--ink4)',
    filled:  'var(--sea2)',
    dropped: 'var(--ruby2)',
}

export default function ClientMandateShow({ mandate, client }) {
    const submissions = mandate.submissions ?? []
    const claims = mandate.claims ?? []
    const approvedClaim = claims.find(c => c.status === 'approved')

    // Only show approved submissions to client
    const visibleSubmissions = submissions.filter(s => s.admin_review_status !== 'pending')

    return (
        <ClientLayout breadcrumb={mandate.title}>
            <div className="page-content">
                <div className="page-head">
                    <div>
                        <div className="page-title">{mandate.title}</div>
                        <div className="page-sub">
                            {client.company_name}
                            {mandate.location ? ` · ${mandate.location}` : ''}
                            {mandate.seniority ? ` · ${mandate.seniority.replace(/_/g, ' ')}` : ''}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <Link href={route('client.mandates.kanban', mandate.id)} className="btn btn-primary">View Kanban →</Link>
                        <Link href={route('client.mandates.index')} className="btn btn-secondary">← All Roles</Link>
                    </div>
                </div>

                {/* Stats */}
                <div className="stat-row" style={{ marginBottom: 16 }}>
                    {[
                        { label: 'Candidates', val: visibleSubmissions.length, color: 'var(--sea2)' },
                        { label: 'In Interview', val: visibleSubmissions.filter(s => s.client_status === 'interview').length, color: 'var(--sea2)' },
                        { label: 'Offered', val: visibleSubmissions.filter(s => ['offered','offer_made'].includes(s.client_status)).length, color: 'var(--violet2)' },
                        { label: 'Hired', val: visibleSubmissions.filter(s => s.client_status === 'hired').length, color: 'var(--jade2)' },
                    ].map(({ label, val, color }) => (
                        <div key={label} className="dcard" style={{ padding: '14px 16px', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: color }} />
                            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--font-head)' }}>{val}</div>
                            <div style={{ fontSize: 11, color: 'var(--ink4)', marginTop: 2 }}>{label}</div>
                        </div>
                    ))}
                </div>

                <div className="g21" style={{ gap: 16 }}>
                    {/* Left: Candidates */}
                    <div>
                        <div className="dcard" style={{ padding: 20, marginBottom: 16 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                                Candidates ({visibleSubmissions.length})
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--ink4)', marginBottom: 14 }}>
                                Showing approved submissions · pending admin review are hidden
                            </div>

                            {visibleSubmissions.length === 0 ? (
                                <div style={{ fontSize: 12, color: 'var(--ink4)', padding: '12px 0' }}>No candidates submitted yet.</div>
                            ) : visibleSubmissions.map(s => (
                                <div key={s.id} style={{
                                    padding: '14px 0',
                                    borderBottom: '1px solid var(--wire)',
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div style={{ display: 'flex', gap: 10, flex: 1 }}>
                                            {/* Avatar */}
                                            <div style={{
                                                width: 36, height: 36, borderRadius: '50%',
                                                background: 'var(--sea-pale)', color: 'var(--sea2)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: 11, fontWeight: 700, flexShrink: 0,
                                            }}>
                                                {(s.candidate?.name || '?').split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 2 }}>
                                                    {s.candidate?.name || '—'}
                                                </div>
                                                <div style={{ fontSize: 12, color: 'var(--ink4)' }}>
                                                    {[s.candidate?.current_title, s.candidate?.current_company].filter(Boolean).join(' · ')}
                                                </div>
                                                {s.recruiter_note && (
                                                    <div style={{
                                                        fontSize: 12, color: 'var(--ink3)', marginTop: 6,
                                                        padding: '6px 10px', background: 'var(--mist2)', borderRadius: 6,
                                                        borderLeft: '3px solid var(--sea3)',
                                                    }}>
                                                        {s.recruiter_note}
                                                    </div>
                                                )}
                                                {s.interview_date && (
                                                    <div style={{ fontSize: 11, color: 'var(--sea2)', marginTop: 4 }}>
                                                        📅 Interview: {fmtDate(s.interview_date)}
                                                        {s.interview_format ? ` · ${s.interview_format}` : ''}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                                            <span style={{
                                                fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 4,
                                                background: (CLIENT_STATUS_COLORS[s.client_status] || 'var(--ink4)') + '22',
                                                color: CLIENT_STATUS_COLORS[s.client_status] || 'var(--ink4)',
                                                textTransform: 'capitalize',
                                            }}>
                                                {(s.client_status || 'pending').replace(/_/g, ' ')}
                                            </span>
                                            <div style={{ fontSize: 10, color: 'var(--ink4)' }}>
                                                {fmtRelative(s.submitted_at || s.created_at)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right: Role details */}
                    <div>
                        <div className="dcard" style={{ padding: 20, marginBottom: 14 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Role Details</div>
                            {[
                                { label: 'Status', value: (
                                    <span style={{ color: MANDATE_STATUS_COLORS[mandate.status] || 'var(--ink4)', fontWeight: 600, textTransform: 'capitalize' }}>
                                        {mandate.status}
                                    </span>
                                )},
                                { label: 'Seniority', value: mandate.seniority?.replace(/_/g,' ') || '—' },
                                { label: 'Location', value: mandate.location || '—' },
                                { label: 'Industry', value: mandate.industry || '—' },
                                { label: 'Openings', value: mandate.openings_count ?? 1 },
                                { label: 'Fast Track', value: mandate.is_fast_track ? <span className="badge badge-jade">Yes</span> : 'No' },
                                { label: 'Posted', value: fmtDate(mandate.published_at || mandate.created_at) },
                            ].map(({ label, value }) => (
                                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--wire)', fontSize: 13 }}>
                                    <span style={{ color: 'var(--ink4)', fontWeight: 500 }}>{label}</span>
                                    <span style={{ color: 'var(--ink)' }}>{value}</span>
                                </div>
                            ))}
                        </div>

                        {/* Recruiter info */}
                        {approvedClaim && (
                            <div className="dcard" style={{ padding: 20 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Assigned Recruiter</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <div style={{
                                        width: 36, height: 36, borderRadius: '50%', background: 'var(--sea2)',
                                        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 11, fontWeight: 700, flexShrink: 0,
                                    }}>
                                        {(approvedClaim.recruiter?.user?.name || '?').split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                                            {approvedClaim.recruiter?.user?.name || '—'}
                                        </div>
                                        <div style={{ fontSize: 11, color: 'var(--ink4)' }}>
                                            {approvedClaim.recruiter?.tier}
                                            {approvedClaim.assigned_at ? ` · Since ${fmtDate(approvedClaim.assigned_at)}` : ''}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Description */}
                        {mandate.description && (
                            <div className="dcard" style={{ padding: 20, marginTop: 14 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Job Description</div>
                                <div style={{ fontSize: 13, color: 'var(--ink2)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{mandate.description}</div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </ClientLayout>
    )
}
