import { useForm } from '@inertiajs/react'
import AdminLayout from '@/Layouts/AdminLayout'

export default function MandateForm({ mandate, clients, compensation_types }) {
    const isEdit = !!mandate
    const { data, setData, post, put, processing, errors } = useForm({
        title: mandate?.title || '',
        client_id: mandate?.client_id || '',
        compensation_type_id: mandate?.compensation_type_id || '',
        location: mandate?.location || '',
        seniority: mandate?.seniority || '',
        industry: mandate?.industry || '',
        salary_min: mandate?.salary_min || '',
        salary_max: mandate?.salary_max || '',
        salary_currency: mandate?.salary_currency || 'SGD',
        description: mandate?.description || '',
        status: mandate?.status || 'draft',
        is_fast_track: mandate?.is_fast_track || false,
        timer_b_active: mandate?.timer_b_active || false,
        timer_c_active: mandate?.timer_c_active || false,
    })

    function submit(e) {
        e.preventDefault()
        if (isEdit) put(route('admin.mandates.update', mandate.id))
        else post(route('admin.mandates.store'))
    }

    const labelStyle = { fontSize: 12, fontWeight: 500, color: 'var(--ink2)', display: 'block', marginBottom: 4 }
    const inputStyle = { width: '100%' }

    return (
        <AdminLayout title={isEdit ? 'Edit Mandate' : 'New Mandate'}>
            <div className="page-content" style={{ maxWidth: 700 }}>
                <div className="page-head">
                    <div>
                        <div className="page-title">{isEdit ? 'Edit Mandate' : 'New Mandate'}</div>
                        <div className="page-sub">{isEdit ? `Editing: ${mandate.title}` : 'Create a new role mandate'}</div>
                    </div>
                </div>

                <form onSubmit={submit}>
                    <div className="dcard" style={{ padding: 24, marginBottom: 16 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 16 }}>Role Details</div>

                        <div className="form-group" style={{ marginBottom: 14 }}>
                            <label style={labelStyle}>Title *</label>
                            <input className="form-input" style={inputStyle} value={data.title} onChange={e => setData('title', e.target.value)} placeholder="e.g. VP Sales, APAC" />
                            {errors.title && <div className="form-error">{errors.title}</div>}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                            <div className="form-group">
                                <label style={labelStyle}>Client *</label>
                                <select className="form-input" value={data.client_id} onChange={e => setData('client_id', e.target.value)}>
                                    <option value="">Select client...</option>
                                    {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                                </select>
                                {errors.client_id && <div className="form-error">{errors.client_id}</div>}
                            </div>
                            <div className="form-group">
                                <label style={labelStyle}>Compensation Type</label>
                                <select className="form-input" value={data.compensation_type_id} onChange={e => setData('compensation_type_id', e.target.value)}>
                                    <option value="">None</option>
                                    {compensation_types.map(ct => <option key={ct.id} value={ct.id}>{ct.name}</option>)}
                                </select>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
                            <div className="form-group">
                                <label style={labelStyle}>Seniority</label>
                                <select className="form-input" value={data.seniority} onChange={e => setData('seniority', e.target.value)}>
                                    <option value="">Select...</option>
                                    {['c_suite', 'vp_director', 'manager', 'ic'].map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label style={labelStyle}>Location</label>
                                <input className="form-input" value={data.location} onChange={e => setData('location', e.target.value)} placeholder="e.g. Singapore" />
                            </div>
                            <div className="form-group">
                                <label style={labelStyle}>Industry</label>
                                <input className="form-input" value={data.industry} onChange={e => setData('industry', e.target.value)} placeholder="e.g. FinTech" />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
                            <div className="form-group">
                                <label style={labelStyle}>Salary Min</label>
                                <input className="form-input" type="number" value={data.salary_min} onChange={e => setData('salary_min', e.target.value)} placeholder="e.g. 150000" />
                            </div>
                            <div className="form-group">
                                <label style={labelStyle}>Salary Max</label>
                                <input className="form-input" type="number" value={data.salary_max} onChange={e => setData('salary_max', e.target.value)} placeholder="e.g. 200000" />
                            </div>
                            <div className="form-group">
                                <label style={labelStyle}>Currency</label>
                                <select className="form-input" value={data.salary_currency} onChange={e => setData('salary_currency', e.target.value)}>
                                    {['SGD', 'USD', 'MYR', 'THB', 'IDR', 'PHP', 'VND'].map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: 14 }}>
                            <label style={labelStyle}>Description</label>
                            <textarea className="form-input" rows={4} value={data.description} onChange={e => setData('description', e.target.value)} placeholder="Role description..." style={{ resize: 'vertical' }} />
                        </div>

                        {isEdit && (
                            <div className="form-group" style={{ marginBottom: 14 }}>
                                <label style={labelStyle}>Status</label>
                                <select className="form-input" style={{ maxWidth: 200 }} value={data.status} onChange={e => setData('status', e.target.value)}>
                                    {['draft', 'active', 'paused', 'closed', 'filled', 'dropped'].map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        )}
                    </div>

                    <div className="dcard" style={{ padding: 20, marginBottom: 16 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 12 }}>Settings</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {[
                                { key: 'is_fast_track', label: 'Fast Track', desc: 'Admin CDD review bypassed for trusted recruiters' },
                                { key: 'timer_b_active', label: 'Timer B Active', desc: '3 profiles in 5 days; late = fee reduction' },
                                { key: 'timer_c_active', label: 'Timer C Active', desc: 'Client SLA 5 days; breach = admin alert' },
                            ].map(({ key, label, desc }) => (
                                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                                    <input type="checkbox" checked={data[key]} onChange={e => setData(key, e.target.checked)} />
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{label}</div>
                                        <div style={{ fontSize: 11, color: 'var(--ink3)' }}>{desc}</div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 10 }}>
                        <button type="submit" className="btn btn-primary" disabled={processing}>
                            {processing ? 'Saving...' : (isEdit ? 'Update Mandate' : 'Create Mandate')}
                        </button>
                        <a href={route('admin.mandates.index')} className="btn btn-secondary">Cancel</a>
                    </div>
                </form>
            </div>
        </AdminLayout>
    )
}
