import AdminLayout from '@/Layouts/AdminLayout'
import { useForm, usePage, router } from '@inertiajs/react'
import { fmtDate } from '@/lib/utils'
import { useState } from 'react'

export default function TimerConfigIndex({ timerRows, stats }) {
    const { flash } = usePage().props
    const [expanded, setExpanded] = useState(null)

    function runNow() {
        router.post(route('admin.timer-config.run-now'), {}, {
            preserveScroll: true,
        })
    }

    return (
        <AdminLayout breadcrumb="Timer Config">
            {/* Flash */}
            {flash?.success && (
                <div style={{
                    background: 'var(--jade-pale)', border: '1px solid var(--jade3)',
                    color: 'var(--jade2)', padding: '10px 16px', borderRadius: 'var(--rsm)',
                    marginBottom: 16, fontSize: 13,
                }}>
                    {flash.success}
                </div>
            )}
            {flash?.error && (
                <div style={{
                    background: '#fff0f0', border: '1px solid var(--ruby2)',
                    color: 'var(--ruby2)', padding: '10px 16px', borderRadius: 'var(--rsm)',
                    marginBottom: 16, fontSize: 13,
                }}>
                    {flash.error}
                </div>
            )}

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                    <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-head)', color: 'var(--ink)' }}>
                        Timer Engine
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink4)', marginTop: 2 }}>
                        Timer A/B/C — runs every hour via <code style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>php artisan schedule:run</code>
                    </div>
                </div>
                <button className="btn btn-primary btn-sm" onClick={runNow}>
                    ▶ Run checks now
                </button>
            </div>

            {/* Stats */}
            <div className="stat-row" style={{ marginBottom: 20 }}>
                {[
                    { label: 'Timer A overdue',    value: stats.overdue_a,      color: 'var(--ruby2)' },
                    { label: 'Timer B active',      value: stats.timer_b_active, color: 'var(--amber2)' },
                    { label: 'Timer C active',      value: stats.timer_c_active, color: 'var(--sea2)' },
                    { label: 'Client SLA breached', value: stats.sla_breached,   color: 'var(--violet2)' },
                ].map((s, i) => (
                    <div key={i} className="sm">
                        <div className="sm-bar" style={{ background: s.color }} />
                        <div className="sm-num">{s.value}</div>
                        <div className="sm-lbl">{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Timer reference */}
            <div style={{
                background: 'var(--mist)', border: '1px solid var(--wire)',
                borderRadius: 'var(--r)', padding: '14px 18px', marginBottom: 20,
                display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12,
            }}>
                {[
                    {
                        label: 'Timer A — Submission deadline',
                        color: 'var(--ruby2)',
                        desc: 'Recruiter must submit ≥1 CDD within N days of assigned_at. On fail: slot withdrawn. After 3 fails → role DROPPED.',
                    },
                    {
                        label: 'Timer B — Late penalty (optional)',
                        color: 'var(--amber2)',
                        desc: 'Recruiter must submit 3 CDDs within N days. Day 6 = −10%, Day 7 = −20%, Day 8+ = −30% of payout.',
                    },
                    {
                        label: 'Timer C — Client SLA (optional)',
                        color: 'var(--sea2)',
                        desc: 'Client must respond to submitted CDD within N days. Breach → admin alerted for manual slot free.',
                    },
                ].map((t, i) => (
                    <div key={i}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.color, flexShrink: 0 }} />
                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>{t.label}</div>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--ink4)', lineHeight: 1.5 }}>{t.desc}</div>
                    </div>
                ))}
            </div>

            {/* Table */}
            {timerRows.length === 0 ? (
                <div style={{
                    background: 'var(--mist)', border: '1px solid var(--wire)', borderRadius: 'var(--r)',
                    padding: '40px 24px', textAlign: 'center', color: 'var(--ink4)', fontSize: 13,
                }}>
                    No active mandates with claims found.
                </div>
            ) : (
                <div className="table-wrap">
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--wire)' }}>
                                {['Role', 'Client', 'Status', 'Timer A', 'Timer B', 'Timer C', 'Claims', ''].map(h => (
                                    <th key={h} style={{
                                        padding: '10px 14px', textAlign: 'left', fontSize: 11,
                                        fontWeight: 600, color: 'var(--ink4)', textTransform: 'uppercase',
                                        letterSpacing: '.06em',
                                    }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {timerRows.map(row => (
                                <>
                                    <tr key={row.id} style={{ borderBottom: '1px solid var(--wire)' }}>
                                        <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>
                                            {row.title}
                                        </td>
                                        <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--ink4)' }}>
                                            {row.client || '—'}
                                        </td>
                                        <td style={{ padding: '12px 14px' }}>
                                            <StatusBadge status={row.status} />
                                        </td>
                                        <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--ink4)' }}>
                                            {row.timer_a_days}d deadline
                                        </td>
                                        <td style={{ padding: '12px 14px' }}>
                                            {row.timer_b_active
                                                ? <span className="badge badge-amber">{row.timer_b_days}d window</span>
                                                : <span style={{ fontSize: 11, color: 'var(--ink4)' }}>OFF</span>
                                            }
                                        </td>
                                        <td style={{ padding: '12px 14px' }}>
                                            {row.timer_c_active
                                                ? <span className="badge badge-sea">{row.timer_c_sla_days}d SLA</span>
                                                : <span style={{ fontSize: 11, color: 'var(--ink4)' }}>OFF</span>
                                            }
                                        </td>
                                        <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--ink4)' }}>
                                            {row.active_claims.length} active
                                        </td>
                                        <td style={{ padding: '12px 14px' }}>
                                            <button
                                                className="btn btn-ghost btn-sm"
                                                onClick={() => setExpanded(expanded === row.id ? null : row.id)}
                                            >
                                                {expanded === row.id ? '▲ Less' : '▼ Edit'}
                                            </button>
                                        </td>
                                    </tr>

                                    {/* Expanded row */}
                                    {expanded === row.id && (
                                        <tr key={`${row.id}-expand`} style={{ background: 'var(--mist)' }}>
                                            <td colSpan={8} style={{ padding: '0 14px 16px 14px' }}>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, paddingTop: 16 }}>
                                                    <TimerEditForm mandate={row} />
                                                    <ClaimsPanel claims={row.active_claims} />
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </AdminLayout>
    )
}

function StatusBadge({ status }) {
    const map = {
        active: 'badge-jade', paused: 'badge-amber',
        dropped: 'badge-ruby', filled: 'badge-sea',
    }
    return <span className={`badge ${map[status] || ''}`}>{status}</span>
}

function TimerEditForm({ mandate }) {
    const { data, setData, put, processing, errors } = useForm({
        timer_a_days:     mandate.timer_a_days ?? 3,
        timer_b_active:   mandate.timer_b_active ?? false,
        timer_b_days:     mandate.timer_b_days ?? 5,
        timer_c_active:   mandate.timer_c_active ?? false,
        timer_c_sla_days: mandate.timer_c_sla_days ?? 5,
    })

    function submit(e) {
        e.preventDefault()
        put(route('admin.timer-config.update', mandate.id), { preserveScroll: true })
    }

    return (
        <form onSubmit={submit}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginBottom: 10 }}>
                Edit timer settings
            </div>

            {/* Timer A */}
            <div style={{ marginBottom: 10 }}>
                <label className="form-label">Timer A — days to first CDD</label>
                <input type="number" className="form-input" min={1} max={30}
                    value={data.timer_a_days}
                    onChange={e => setData('timer_a_days', parseInt(e.target.value))}
                    style={{ width: 80 }}
                />
            </div>

            {/* Timer B */}
            <div style={{ marginBottom: 10 }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="checkbox" checked={data.timer_b_active}
                        onChange={e => setData('timer_b_active', e.target.checked)}
                    />
                    Timer B — late penalty
                </label>
                {data.timer_b_active && (
                    <div style={{ marginTop: 6 }}>
                        <label className="form-label">Days window for 3 CDDs</label>
                        <input type="number" className="form-input" min={1} max={30}
                            value={data.timer_b_days}
                            onChange={e => setData('timer_b_days', parseInt(e.target.value))}
                            style={{ width: 80 }}
                        />
                        <div style={{ fontSize: 11, color: 'var(--ink4)', marginTop: 4 }}>
                            Day {data.timer_b_days + 1} = -10% · Day {data.timer_b_days + 2} = -20% · Day {data.timer_b_days + 3}+ = -30%
                        </div>
                    </div>
                )}
            </div>

            {/* Timer C */}
            <div style={{ marginBottom: 14 }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="checkbox" checked={data.timer_c_active}
                        onChange={e => setData('timer_c_active', e.target.checked)}
                    />
                    Timer C — client SLA
                </label>
                {data.timer_c_active && (
                    <div style={{ marginTop: 6 }}>
                        <label className="form-label">Client response SLA (days)</label>
                        <input type="number" className="form-input" min={1} max={30}
                            value={data.timer_c_sla_days}
                            onChange={e => setData('timer_c_sla_days', parseInt(e.target.value))}
                            style={{ width: 80 }}
                        />
                    </div>
                )}
            </div>

            <button className="btn btn-primary btn-sm" disabled={processing}>
                {processing ? 'Saving…' : 'Save changes'}
            </button>
        </form>
    )
}

function ClaimsPanel({ claims }) {
    if (!claims.length) {
        return (
            <div style={{ fontSize: 12, color: 'var(--ink4)', paddingTop: 14 }}>
                No active claims for this mandate.
            </div>
        )
    }

    return (
        <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginBottom: 10 }}>
                Active claim timer status
            </div>
            {claims.map(c => (
                <div key={c.claim_id} style={{
                    background: '#fff', border: '1px solid var(--wire)',
                    borderRadius: 'var(--rsm)', padding: '10px 12px', marginBottom: 8,
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)' }}>
                            {c.recruiter_name}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--ink4)' }}>
                            Day 0: {c.assigned_at ? fmtDate(c.assigned_at) : '—'}
                        </span>
                    </div>
                    <div style={{ marginTop: 6, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{
                            fontSize: 11, padding: '2px 8px', borderRadius: 4,
                            background: c.timer_a_status === 'overdue' ? '#fff0f0' : 'var(--jade-pale)',
                            color: c.timer_a_status === 'overdue' ? 'var(--ruby2)' : 'var(--jade2)',
                        }}>
                            A: {c.timer_a_status === 'overdue' ? 'OVERDUE' : `${c.timer_a_days_left}d left`}
                        </span>
                        {c.timer_b_status && (
                            <span style={{
                                fontSize: 11, padding: '2px 8px', borderRadius: 4,
                                background: c.timer_b_status === 'penalty' ? '#fff8e8' : 'var(--mist2)',
                                color: c.timer_b_status === 'penalty' ? 'var(--amber2)' : 'var(--ink4)',
                            }}>
                                B: {c.timer_b_status === 'penalty'
                                    ? `-${Math.round(c.timer_b_penalty * 100)}%`
                                    : c.timer_b_status}
                            </span>
                        )}
                        <span style={{ fontSize: 11, color: 'var(--ink4)' }}>
                            Day {c.days_elapsed}
                        </span>
                    </div>
                </div>
            ))}
        </div>
    )
}
