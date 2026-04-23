import { Link } from '@inertiajs/react'
import ClientLayout from '@/Layouts/ClientLayout'
import { fmtDate, fmtRelative } from '@/lib/utils'

const STATUS_COLORS = {
    draft:   'var(--ink4)',
    active:  'var(--jade2)',
    paused:  'var(--amber2)',
    closed:  'var(--ink4)',
    filled:  'var(--sea2)',
    dropped: 'var(--ruby2)',
}

export default function ClientMandatesIndex({ mandates, client, stats }) {
    return (
        <ClientLayout breadcrumb="My Roles">
            <div className="page-content">
                <div className="page-head">
                    <div>
                        <div className="page-title">My Roles</div>
                        <div className="page-sub">{client.company_name} · {stats.total} role{stats.total !== 1 ? 's' : ''}</div>
                    </div>
                </div>

                {/* Stats */}
                <div className="stat-row" style={{ marginBottom: 20 }}>
                    {[
                        { label: 'Total Roles',   val: stats.total,  color: 'var(--sea2)' },
                        { label: 'Active',         val: stats.active, color: 'var(--jade2)' },
                        { label: 'Filled',         val: stats.filled, color: 'var(--violet2)' },
                    ].map(({ label, val, color }) => (
                        <div key={label} className="dcard" style={{ padding: '14px 16px', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: color }} />
                            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--font-head)' }}>{val}</div>
                            <div style={{ fontSize: 11, color: 'var(--ink4)', marginTop: 2 }}>{label}</div>
                        </div>
                    ))}
                </div>

                {/* Mandate list */}
                {mandates.length === 0 ? (
                    <div className="dcard" style={{ padding: 40, textAlign: 'center', color: 'var(--ink4)', fontSize: 13 }}>
                        No roles found.
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {mandates.map(m => (
                            <div key={m.id} className="dcard" style={{
                                padding: '16px 20px',
                                border: '1px solid var(--wire)',
                                display: 'flex', alignItems: 'center', gap: 16,
                            }}>
                                {/* Avatar */}
                                <div style={{
                                    width: 40, height: 40, borderRadius: 10,
                                    background: 'var(--sea-pale)', color: 'var(--sea2)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: 13,
                                    flexShrink: 0,
                                }}>
                                    {client.company_name.slice(0, 2).toUpperCase()}
                                </div>

                                {/* Main info */}
                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{m.title}</div>
                                        {m.is_fast_track && <span className="badge badge-jade">Fast Track</span>}
                                        <span style={{
                                            fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 4, textTransform: 'capitalize',
                                            background: (STATUS_COLORS[m.status] || 'var(--ink4)') + '22',
                                            color: STATUS_COLORS[m.status] || 'var(--ink4)',
                                        }}>{m.status}</span>
                                    </div>
                                    <div style={{ fontSize: 12, color: 'var(--ink4)', display: 'flex', gap: 12 }}>
                                        {m.seniority && <span>{m.seniority.replace(/_/g, ' ')}</span>}
                                        {m.location && <span>{m.location}</span>}
                                        <span>{m.openings_count} opening{m.openings_count !== 1 ? 's' : ''}</span>
                                        <span>Posted {fmtDate(m.created_at)}</span>
                                    </div>
                                    {m.approved_claim && (
                                        <div style={{ fontSize: 11, color: 'var(--sea2)', marginTop: 3 }}>
                                            Recruiter: {m.approved_claim.recruiter_name} · Day 0: {fmtDate(m.approved_claim.assigned_at)}
                                        </div>
                                    )}
                                </div>

                                {/* Metrics */}
                                <div style={{ display: 'flex', gap: 20, flexShrink: 0 }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--font-head)' }}>{m.submissions_count}</div>
                                        <div style={{ fontSize: 10, color: 'var(--ink4)' }}>Candidates</div>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: 18, fontWeight: 700, color: m.hired_count > 0 ? 'var(--jade2)' : 'var(--ink)', fontFamily: 'var(--font-head)' }}>{m.hired_count}</div>
                                        <div style={{ fontSize: 10, color: 'var(--ink4)' }}>Hired</div>
                                    </div>
                                </div>

                                {/* Action */}
                                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                                    <Link
                                        href={route('client.mandates.show', m.id)}
                                        className="btn btn-secondary btn-sm"
                                    >
                                        View →
                                    </Link>
                                    <Link
                                        href={route('client.mandates.kanban', m.id)}
                                        className="btn btn-primary btn-sm"
                                    >
                                        Kanban
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </ClientLayout>
    )
}
