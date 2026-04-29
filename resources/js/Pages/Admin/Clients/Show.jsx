import { Link } from '@inertiajs/react'
import AdminLayout from '@/Layouts/AdminLayout'
import { fmtDate } from '@/lib/utils'

export default function ClientShow({ client }) {
    return (
        <AdminLayout title={client.company_name}>
            <div className="page-content">
                <div className="page-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div>
                        <div className="page-title">{client.company_name}</div>
                        <div className="page-sub">Contact: {client.user?.name} · {client.user?.email}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <Link href={route('admin.clients.edit', client.id)} className="btn btn-secondary">Edit</Link>
                        <a href={route('admin.clients.index')} className="btn btn-secondary">← Back</a>
                    </div>
                </div>

                <div className="g21" style={{ gap: 16 }}>
                    <div>
                        <div className="dcard" style={{ padding: 20, marginBottom: 16 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Mandates ({client.mandates?.length || 0})</div>
                            {!client.mandates?.length ? (
                                <div style={{ fontSize: 12, color: 'var(--ink3)' }}>No mandates for this client.</div>
                            ) : client.mandates.map(m => (
                                <div key={m.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--mist3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <Link href={route('admin.mandates.show', m.id)} style={{ fontSize: 13, fontWeight: 500, color: 'var(--sea2)', textDecoration: 'none' }}>{m.title}</Link>
                                        <div style={{ fontSize: 11, color: 'var(--ink3)' }}>{m.seniority} · {fmtDate(m.created_at)}</div>
                                    </div>
                                    <span style={{ fontSize: 11, fontWeight: 500, color: m.status === 'active' ? 'var(--jade2)' : 'var(--ink3)' }}>{m.status}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <div className="dcard" style={{ padding: 20 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Client Details</div>
                            {[
                                { label: 'Industry', value: client.industry || '—' },
                                { label: 'Country', value: client.country || '—' },
                                { label: 'GSheet', value: client.gsheet_url ? <a href={client.gsheet_url} target="_blank" rel="noreferrer" style={{ color: 'var(--sea2)' }}>Open</a> : '—' },
                                { label: 'Accent Color', value: <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 14, height: 14, borderRadius: 3, background: client.accent_color || '#1A6DB5', display: 'inline-block' }} />{client.accent_color || '—'}</span> },
                                { label: 'Created', value: fmtDate(client.created_at) },
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
