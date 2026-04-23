import RecruiterLayout from '@/Layouts/RecruiterLayout'
import { Link } from '@inertiajs/react'
import { fmt, fmtCurrency, fmtDate, fmtRelative, initials } from '@/lib/utils'

export default function Dashboard({ recruiter, activeClaims, recentPlacements, totalEarnings, openMandatesCount }) {
    const tier      = recruiter?.tier ?? 'junior'
    const tierLabel = { junior: 'Junior', senior: 'Senior', elite: 'Elite' }[tier]

    const stats = [
        { label: 'Earnings YTD',      value: fmtCurrency(totalEarnings, 'SGD'),       color: 'var(--jade2)' },
        { label: 'Active mandates',   value: recruiter?.active_mandates_count ?? 0,    color: 'var(--sea2)' },
        { label: 'Total placements',  value: recruiter?.total_placements ?? 0,          color: 'var(--violet2)' },
        { label: 'Open on platform',  value: openMandatesCount,                         color: 'var(--amber2)' },
    ]

    return (
        <RecruiterLayout breadcrumb="Dashboard">
            {/* Hero */}
            <div style={{
                background: 'var(--ink)', borderRadius: 'var(--r)', border: '1px solid var(--ink2)',
                padding: '20px 24px', display: 'flex', gap: 24, marginBottom: 16,
            }}>
                <div style={{ flex: 1, paddingRight: 24, borderRight: '1px solid var(--ink2)' }}>
                    <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.08em', color: '#888780', marginBottom: 4 }}>
                        Total earnings YTD
                    </div>
                    <div style={{ fontSize: 36, fontWeight: 700, color: '#fff', fontFamily: 'var(--font-head)', letterSpacing: '-.02em', lineHeight: 1 }}>
                        {fmtCurrency(totalEarnings, 'SGD')}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
                        <span style={{ fontSize: 12, color: '#4CAF52', fontWeight: 500 }}>↑ Recruiter</span>
                        <span style={{ fontSize: 11, color: '#888780' }}>Tier: <strong style={{ color: tier === 'elite' ? '#C49A00' : tier === 'senior' ? '#3589D4' : '#888780' }}>{tierLabel}</strong></span>
                        {recruiter?.recruiter_group && (
                            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'rgba(53,137,212,.15)', color: '#3589D4', border: '1px solid rgba(53,137,212,.3)' }}>
                                {recruiter.recruiter_group}
                            </span>
                        )}
                    </div>
                </div>
                <div style={{ display: 'flex', paddingLeft: 24, flex: 1.4, gap: 0 }}>
                    {[
                        { label: 'Active mandates', value: recruiter?.active_mandates_count ?? 0, sub: 'max 2', tag: null },
                        { label: 'Total placements', value: recruiter?.total_placements ?? 0, sub: 'all time', tag: null },
                        { label: 'Avg days to place', value: recruiter?.avg_days_to_place ?? '—', sub: 'per role', tag: null },
                    ].map((m, i) => (
                        <div key={i} style={{ flex: 1, padding: '0 18px', borderRight: i < 2 ? '1px solid var(--ink2)' : 'none', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.08em', color: '#454340', marginBottom: 5 }}>{m.label}</div>
                            <div style={{ fontSize: 22, fontWeight: 600, color: '#fff', fontFamily: 'var(--font-head)', letterSpacing: '-.02em' }}>{m.value}</div>
                            <div style={{ fontSize: 10, color: '#888780', marginTop: 2 }}>{m.sub}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Stat row */}
            <div className="stat-row" style={{ marginBottom: 16 }}>
                {stats.map((s, i) => (
                    <div key={i} className="sm">
                        <div className="sm-bar" style={{ background: s.color }} />
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                            <div className="sm-num">{s.value}</div>
                        </div>
                        <div className="sm-lbl">{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Main grid */}
            <div className="g21">
                {/* Left: Active mandates */}
                <div className="dcard">
                    <div className="dcard-head">
                        <span className="dcard-title">Active mandates</span>
                        <div style={{ display: 'flex', gap: 6 }}>
                            <span className="cbadge cb-sea">{activeClaims?.length ?? 0} active</span>
                            <Link href={route('recruiter.mandates.index')} className="dcard-ghost-btn">Browse all</Link>
                        </div>
                    </div>
                    {activeClaims?.length === 0 && (
                        <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--ink4)' }}>
                            <div style={{ fontSize: 22, marginBottom: 8 }}>◫</div>
                            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>No active mandates</div>
                            <div style={{ fontSize: 12, marginBottom: 12 }}>Pick a role from the job board to get started</div>
                            <Link href={route('recruiter.mandates.index')} className="btn btn-primary btn-sm">Browse open roles</Link>
                        </div>
                    )}
                    {activeClaims?.map(claim => (
                        <MandateRow key={claim.id} claim={claim} />
                    ))}
                </div>

                {/* Right: Quick actions + recent */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {/* Quick actions */}
                    <div className="dcard">
                        <div className="dcard-head">
                            <span className="dcard-title">Quick actions</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '12px 14px' }}>
                            {[
                                { icon: '◫', label: 'Browse roles', sub: `${openMandatesCount} open`, href: route('recruiter.mandates.index') },
                                { icon: '◉', label: 'Add candidate', sub: 'Upload CV + AI parse', href: route('recruiter.candidates.index') },
                                { icon: '◈', label: 'Open pipeline', sub: 'Kanban board', href: '#' },
                                { icon: '💰', label: 'My earnings', sub: 'Payouts & history', href: route('recruiter.earnings.index') },
                            ].map(qa => (
                                <a key={qa.label} href={qa.href} style={{
                                    background: 'var(--mist2)', border: '1px solid var(--wire)', borderRadius: 'var(--rsm)',
                                    padding: '10px 12px', cursor: 'pointer', textDecoration: 'none', display: 'block',
                                    transition: 'all .15s',
                                }}>
                                    <span style={{ fontSize: 16, display: 'block', marginBottom: 5 }}>{qa.icon}</span>
                                    <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink)' }}>{qa.label}</div>
                                    <div style={{ fontSize: 10, color: 'var(--ink4)', marginTop: 1 }}>{qa.sub}</div>
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Recent placements */}
                    <div className="dcard">
                        <div className="dcard-head">
                            <span className="dcard-title">Recent placements</span>
                            <Link href={route('recruiter.earnings.index')} className="dcard-ghost-btn">All</Link>
                        </div>
                        {recentPlacements?.length === 0 && (
                            <div style={{ padding: '20px 16px', textAlign: 'center', fontSize: 12, color: 'var(--ink4)' }}>No placements yet</div>
                        )}
                        {recentPlacements?.map(p => (
                            <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderBottom: '1px solid var(--wire)' }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 12, fontWeight: 500 }}>{p.candidate?.first_name} {p.candidate?.last_name}</div>
                                    <div style={{ fontSize: 11, color: 'var(--ink4)' }}>{p.mandate?.title} · {p.mandate?.client?.company_name}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--jade2)', fontFamily: 'var(--mono)' }}>{fmtCurrency(p.final_payout, 'SGD')}</div>
                                    <div style={{ fontSize: 10, color: 'var(--ink4)', fontFamily: 'var(--mono)' }}>{fmtDate(p.placed_at)}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </RecruiterLayout>
    )
}

function MandateRow({ claim }) {
    const m = claim.mandate
    return (
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 16px', borderBottom: '1px solid var(--wire)', cursor: 'pointer', transition: 'background .15s', position: 'relative' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: 'var(--sea2)', borderRadius: '3px 0 0 3px' }} />
            <div style={{ width: 38, height: 38, borderRadius: 9, background: 'var(--sea-pale)', color: 'var(--sea)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 500, border: '1px solid var(--wire)', flexShrink: 0 }}>
                {initials(m?.client?.company_name ?? '?')}
            </div>
            <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {m?.title}
                    {m?.is_exclusive && <span className="cbadge cb-gld">Exclusive</span>}
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink4)', marginBottom: 6 }}>{m?.client?.company_name}</div>
                <div style={{ display: 'flex', gap: 4 }}>
                    <span className="cbadge cb-jade">{claim.submissions_count ?? 0} CDDs</span>
                    {m?.is_fast_track && <span className="cbadge cb-sea">Fast-track</span>}
                </div>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-head)', color: 'var(--ink)' }}>
                    SGD {fmt((m?.salary_max ?? 0) * (m?.reward_pct ?? 0.2))}
                </div>
                <div style={{ fontSize: 10, color: 'var(--ink4)', fontFamily: 'var(--mono)', marginTop: 2 }}>
                    {claim.assigned_at ? fmtRelative(claim.assigned_at) : 'New'}
                </div>
                <Link href={route('recruiter.kanban.show', m?.id)} className="dcard-ghost-btn" style={{ fontSize: 10, marginTop: 4, display: 'inline-block' }}>
                    Open kanban →
                </Link>
            </div>
        </div>
    )
}
