import { useForm } from '@inertiajs/react'
import AdminLayout from '@/Layouts/AdminLayout'

export default function ClientForm({ client }) {
    const isEdit = !!client
    const { data, setData, post, put, processing, errors } = useForm({
        company_name:  client?.company_name || '',
        contact_name:  client?.user?.name || '',
        contact_email: client?.user?.email || '',
        industry:      client?.industry || '',
        accent_color:  client?.accent_color || '#1A6DB5',
    })

    function submit(e) {
        e.preventDefault()
        if (isEdit) put(route('admin.clients.update', client.id))
        else post(route('admin.clients.store'))
    }

    const labelStyle = { fontSize: 12, fontWeight: 500, color: 'var(--ink2)', display: 'block', marginBottom: 4 }

    return (
        <AdminLayout title={isEdit ? 'Edit Client' : 'New Client'}>
            <div className="page-content" style={{ maxWidth: 600 }}>
                <div className="page-head">
                    <div>
                        <div className="page-title">{isEdit ? 'Edit Client' : 'New Client'}</div>
                        <div className="page-sub">{isEdit ? client.company_name : 'Add a new client account'}</div>
                    </div>
                </div>
                <form onSubmit={submit}>
                    <div className="dcard" style={{ padding: 24, marginBottom: 16 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Company Details</div>
                        <div className="form-group" style={{ marginBottom: 14 }}>
                            <label style={labelStyle}>Company Name *</label>
                            <input className="form-input" value={data.company_name} onChange={e => setData('company_name', e.target.value)} />
                            {errors.company_name && <div className="form-error">{errors.company_name}</div>}
                        </div>
                        <div className="form-group" style={{ marginBottom: 14 }}>
                            <label style={labelStyle}>Industry</label>
                            <input className="form-input" value={data.industry} onChange={e => setData('industry', e.target.value)} placeholder="e.g. FinTech" />
                        </div>
                        <div className="form-group">
                            <label style={labelStyle}>Portal Accent Color</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <input type="color" value={data.accent_color} onChange={e => setData('accent_color', e.target.value)} style={{ width: 40, height: 32, border: '1px solid var(--wire)', borderRadius: 4, cursor: 'pointer' }} />
                                <input className="form-input" value={data.accent_color} onChange={e => setData('accent_color', e.target.value)} style={{ maxWidth: 120 }} />
                            </div>
                        </div>
                    </div>

                    <div className="dcard" style={{ padding: 24, marginBottom: 16 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Contact Person</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                            <div className="form-group">
                                <label style={labelStyle}>Contact Name *</label>
                                <input className="form-input" value={data.contact_name} onChange={e => setData('contact_name', e.target.value)} />
                                {errors.contact_name && <div className="form-error">{errors.contact_name}</div>}
                            </div>
                            <div className="form-group">
                                <label style={labelStyle}>Contact Email *</label>
                                <input className="form-input" type="email" value={data.contact_email} onChange={e => setData('contact_email', e.target.value)} disabled={isEdit} />
                                {errors.contact_email && <div className="form-error">{errors.contact_email}</div>}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 10 }}>
                        <button type="submit" className="btn btn-primary" disabled={processing}>
                            {processing ? 'Saving...' : (isEdit ? 'Update Client' : 'Create Client')}
                        </button>
                        <a href={route('admin.clients.index')} className="btn btn-secondary">Cancel</a>
                    </div>
                </form>
            </div>
        </AdminLayout>
    )
}
