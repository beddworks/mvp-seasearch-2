import { Link, router, usePage } from '@inertiajs/react'
import AdminLayout from '@/Layouts/AdminLayout'
import { initials } from '@/lib/utils'

export default function RecruitersIndex({ recruiters, filters, stats }) {
    const { flash } = usePage().props

    function filter(key, val) {
        router.get(route('admin.recruiters.index'), { ...filters, [key]: val }, { preserveState: true, replace: true })
    }

    const TIER_COLORS = { junior: 'var(--sea2)', senior: 'var(--amber2)', elite: 'var(--violet2)' }

    return (
        <AdminLayout title="Recruiters">
            <div className="page-content">
                <div className="page-head">
                    <div>
                        <div className="page-title">Recruiters</div>
                        <div className="page-sub">Manage recruiter tiers, trust levels, and groups</div>
                    </div>
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
                                        <Link href={route('admin.recruiters.show', r.id)} className="btn btn-sm btn-secondary">View</Link>
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
