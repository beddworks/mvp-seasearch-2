import { Link, router, usePage } from '@inertiajs/react'
import AdminLayout from '@/Layouts/AdminLayout'
import { fmtDate } from '@/lib/utils'

export default function ClientsIndex({ clients, filters }) {
    const { flash } = usePage().props

    return (
        <AdminLayout title="Clients">
            <div className="page-content">
                <div className="page-head">
                    <div>
                        <div className="page-title">Clients</div>
                        <div className="page-sub">Manage client accounts and GSheet access</div>
                    </div>
                    <Link href={route('admin.clients.create')} className="btn btn-primary">+ New Client</Link>
                </div>

                {flash?.success && (
                    <div style={{ background: 'var(--jade-pale)', border: '1px solid var(--jade3)', borderRadius: 'var(--rsm)', padding: '10px 14px', fontSize: 12, color: 'var(--jade)', marginBottom: 16 }}>
                        {flash.success}
                    </div>
                )}

                <div style={{ marginBottom: 14 }}>
                    <input
                        className="form-input"
                        placeholder="Search by company name..."
                        defaultValue={filters.search || ''}
                        onKeyDown={e => e.key === 'Enter' && router.get(route('admin.clients.index'), { search: e.target.value })}
                        style={{ maxWidth: 300, height: 32, padding: '0 10px', fontSize: 12 }}
                    />
                </div>

                <div className="table-wrap">
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--wire)' }}>
                                {['Company', 'Contact', 'Industry', 'Country', 'Created', 'Actions'].map(h => (
                                    <th key={h} style={{ padding: '10px 14px', fontSize: 11, fontWeight: 500, color: 'var(--ink3)', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {clients.data.length === 0 ? (
                                <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: 'var(--ink3)' }}>No clients found.</td></tr>
                            ) : clients.data.map(c => (
                                <tr key={c.id} style={{ borderBottom: '1px solid var(--mist3)' }}>
                                    <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>
                                        <Link href={route('admin.clients.show', c.id)} style={{ color: 'var(--sea2)', textDecoration: 'none' }}>{c.company_name}</Link>
                                    </td>
                                    <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--ink3)' }}>{c.user?.name || '—'}</td>
                                    <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--ink3)' }}>{c.industry || '—'}</td>
                                    <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--ink3)' }}>{c.country || '—'}</td>
                                    <td style={{ padding: '10px 14px', fontSize: 11, color: 'var(--ink3)' }}>{fmtDate(c.created_at)}</td>
                                    <td style={{ padding: '10px 14px' }}>
                                        <Link href={route('admin.clients.edit', c.id)} className="btn btn-sm btn-secondary">Edit</Link>
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
