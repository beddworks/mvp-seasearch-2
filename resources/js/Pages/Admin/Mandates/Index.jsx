import { Link, router, usePage } from '@inertiajs/react'
import AdminLayout from '@/Layouts/AdminLayout'
import { fmtDate, fmtCurrency } from '@/lib/utils'

const STATUS_COLORS = {
    draft: 'var(--ink3)',
    active: 'var(--jade2)',
    paused: 'var(--amber2)',
    closed: 'var(--ink3)',
    filled: 'var(--sea2)',
    dropped: 'var(--ruby2)',
}

export default function MandatesIndex({ mandates, filters, stats }) {
    const { flash } = usePage().props

    function filter(key, val) {
        router.get(route('admin.mandates.index'), { ...filters, [key]: val }, { preserveState: true, replace: true })
    }

    return (
        <AdminLayout title="Mandates">
            <div className="page-content">
                <div className="page-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div>
                        <div className="page-title">Mandates</div>
                    </div>
                    <Link href={route('admin.mandates.create')} className="btn btn-primary">+ New Mandate</Link>
                </div>

                {flash?.success && (
                    <div style={{ background: 'var(--jade-pale)', border: '1px solid var(--jade3)', borderRadius: 'var(--rsm)', padding: '10px 14px', fontSize: 12, color: 'var(--jade)', marginBottom: 16 }}>
                        {flash.success}
                    </div>
                )}

                <div className="stat-row" style={{ marginBottom: 20 }}>
                    {[
                        { label: 'Total', value: stats.total, color: 'var(--sea2)' },
                        { label: 'Active', value: stats.active, color: 'var(--jade2)' },
                        { label: 'Filled', value: stats.filled, color: 'var(--sea3)' },
                        { label: 'Dropped', value: stats.dropped, color: 'var(--ruby2)' },
                    ].map(s => (
                        <div className="dcard" key={s.label} style={{ padding: '14px 16px', position: 'relative' }}>
                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: s.color, borderRadius: '12px 12px 0 0' }} />
                            <div style={{ fontSize: 11, color: 'var(--ink3)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{s.label}</div>
                            <div style={{ fontSize: 26, fontFamily: 'var(--font-head)', fontWeight: 700, color: 'var(--ink)' }}>{s.value}</div>
                        </div>
                    ))}
                </div>

                <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                    {['', 'draft', 'active', 'paused', 'filled', 'dropped'].map(s => (
                        <button
                            key={s}
                            className={`btn btn-sm ${filters.status === s || (!filters.status && !s) ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => filter('status', s)}
                        >
                            {s || 'All'}
                        </button>
                    ))}
                    <div style={{ flex: 1, maxWidth: 240 }}>
                        <input
                            className="form-input"
                            placeholder="Search mandates..."
                            defaultValue={filters.search || ''}
                            onKeyDown={e => e.key === 'Enter' && filter('search', e.target.value)}
                            style={{ height: 32, padding: '0 10px', fontSize: 12 }}
                        />
                    </div>
                </div>

                <div className="table-wrap">
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--wire)' }}>
                                {['Title', 'Client', 'Seniority', 'Salary', 'Status', 'Created', 'Actions'].map(h => (
                                    <th key={h} style={{ padding: '10px 14px', fontSize: 11, fontWeight: 500, color: 'var(--ink3)', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {mandates.data.length === 0 ? (
                                <tr><td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: 'var(--ink3)', fontSize: 13 }}>No mandates found.</td></tr>
                            ) : mandates.data.map(m => (
                                <tr key={m.id} style={{ borderBottom: '1px solid var(--mist3)' }}>
                                    <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>
                                        <Link href={route('admin.mandates.show', m.id)} style={{ color: 'var(--sea2)', textDecoration: 'none' }}>{m.title}</Link>
                                    </td>
                                    <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--ink3)' }}>{m.client?.company_name || '—'}</td>
                                    <td style={{ padding: '10px 14px' }}>
                                        {m.seniority && <span className="badge badge-sea">{m.seniority}</span>}
                                    </td>
                                    <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--ink3)' }}>
                                        {m.salary_min ? fmtCurrency(m.salary_min, m.currency || 'SGD') : '—'}
                                    </td>
                                    <td style={{ padding: '10px 14px' }}>
                                        <span style={{ fontSize: 11, fontWeight: 500, color: STATUS_COLORS[m.status] || 'var(--ink3)', background: 'rgba(0,0,0,0.04)', borderRadius: 'var(--rxs)', padding: '2px 8px' }}>
                                            {m.status}
                                        </span>
                                    </td>
                                    <td style={{ padding: '10px 14px', fontSize: 11, color: 'var(--ink3)' }}>{fmtDate(m.created_at)}</td>
                                    <td style={{ padding: '10px 14px' }}>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <Link href={route('admin.mandates.edit', m.id)} className="btn btn-sm btn-secondary">Edit</Link>
                                            <Link href={route('admin.mandates.kanban', m.id)} className="btn btn-sm btn-secondary">Kanban</Link>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {mandates.last_page > 1 && (
                    <div style={{ display: 'flex', gap: 6, marginTop: 16, justifyContent: 'flex-end' }}>
                        {mandates.links.map((link, i) => (
                            <button
                                key={i}
                                className={`btn btn-sm ${link.active ? 'btn-primary' : 'btn-secondary'}`}
                                disabled={!link.url}
                                onClick={() => link.url && router.get(link.url)}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ))}
                    </div>
                )}
            </div>
        </AdminLayout>
    )
}
