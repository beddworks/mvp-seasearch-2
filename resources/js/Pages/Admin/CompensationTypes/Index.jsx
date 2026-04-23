import { Link, router, usePage } from '@inertiajs/react'
import AdminLayout from '@/Layouts/AdminLayout'

const FORMULA_COLORS = {
    percentage: 'var(--sea2)',
    hourly: 'var(--amber2)',
    fixed: 'var(--jade2)',
    milestone: 'var(--violet2)',
}

export default function CompensationTypesIndex({ types }) {
    const { flash } = usePage().props

    function handleDelete(id) {
        if (!confirm('Delete this compensation type?')) return
        router.delete(route('admin.compensation-types.destroy', id))
    }

    return (
        <AdminLayout title="Compensation Types">
            <div className="page-content">
                <div className="page-head">
                    <div>
                        <div className="page-title">Compensation Types</div>
                        <div className="page-sub">Configure fee formulas for placement rewards</div>
                    </div>
                    <Link href={route('admin.compensation-types.create')} className="btn btn-primary">+ New Type</Link>
                </div>

                {flash?.success && (
                    <div style={{ background: 'var(--jade-pale)', border: '1px solid var(--jade3)', borderRadius: 'var(--rsm)', padding: '10px 14px', fontSize: 12, color: 'var(--jade)', marginBottom: 16 }}>
                        {flash.success}
                    </div>
                )}

                <div className="table-wrap">
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--wire)' }}>
                                {['Name', 'Formula Type', 'Description', 'Status', 'Actions'].map(h => (
                                    <th key={h} style={{ padding: '10px 14px', fontSize: 11, fontWeight: 500, color: 'var(--ink3)', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {types.length === 0 ? (
                                <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: 'var(--ink3)' }}>No compensation types yet.</td></tr>
                            ) : types.map(t => (
                                <tr key={t.id} style={{ borderBottom: '1px solid var(--mist3)' }}>
                                    <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{t.name}</td>
                                    <td style={{ padding: '10px 14px' }}>
                                        <span style={{ fontSize: 11, fontWeight: 600, color: FORMULA_COLORS[t.formula_type] || 'var(--ink3)', background: 'rgba(0,0,0,0.04)', borderRadius: 'var(--rxs)', padding: '2px 8px' }}>
                                            {t.formula_type}
                                        </span>
                                    </td>
                                    <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--ink3)', maxWidth: 300 }}>{t.notes || '—'}</td>
                                    <td style={{ padding: '10px 14px' }}>
                                        <span style={{ fontSize: 11, fontWeight: 500, color: t.is_active ? 'var(--jade2)' : 'var(--ruby2)' }}>
                                            {t.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '10px 14px' }}>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <Link href={route('admin.compensation-types.edit', t.id)} className="btn btn-sm btn-secondary">Edit</Link>
                                            <button className="btn btn-sm btn-danger" onClick={() => handleDelete(t.id)}>Delete</button>
                                        </div>
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
