import { useForm } from '@inertiajs/react'
import AdminLayout from '@/Layouts/AdminLayout'

const FORMULA_FIELDS = {
    percentage: [{ key: 'rate_percent', label: 'Rate %', type: 'number', placeholder: '20' }],
    hourly:     [{ key: 'hourly_rate', label: 'Hourly Rate', type: 'number', placeholder: '150' }, { key: 'hours_billed', label: 'Hours Billed', type: 'number', placeholder: '0' }],
    fixed:      [{ key: 'flat_fee', label: 'Flat Fee', type: 'number', placeholder: '5000' }],
    milestone:  [{ key: 'milestones', label: 'Milestones (JSON)', type: 'textarea', placeholder: '[{"name":"On hire","amount":5000}]' }],
}

export default function CompensationTypeForm({ type }) {
    const isEdit = !!type
    const { data, setData, post, put, processing, errors } = useForm({
        name:           type?.name || '',
        formula_type:   type?.formula_type || 'percentage',
        notes:          type?.notes || '',
        formula_fields: type?.formula_fields || { rate_percent: 20 },
        is_active:      type?.is_active ?? true,
    })

    function submit(e) {
        e.preventDefault()
        if (isEdit) put(route('admin.compensation-types.update', type.id))
        else post(route('admin.compensation-types.store'))
    }

    const fields = FORMULA_FIELDS[data.formula_type] || FORMULA_FIELDS.percentage
    const labelStyle = { fontSize: 12, fontWeight: 500, color: 'var(--ink2)', display: 'block', marginBottom: 4 }

    return (
        <AdminLayout title={isEdit ? 'Edit Compensation Type' : 'New Compensation Type'}>
            <div className="page-content" style={{ maxWidth: 600 }}>
                <div className="page-head">
                    <div>
                        <div className="page-title">{isEdit ? 'Edit Compensation Type' : 'New Compensation Type'}</div>
                        <div className="page-sub">{isEdit ? type.name : 'Define a fee formula'}</div>
                    </div>
                </div>

                <form onSubmit={submit}>
                    <div className="dcard" style={{ padding: 24, marginBottom: 16 }}>
                        <div className="form-group" style={{ marginBottom: 14 }}>
                            <label style={labelStyle}>Name *</label>
                            <input className="form-input" value={data.name} onChange={e => setData('name', e.target.value)} placeholder="e.g. Standard Placement Fee" />
                            {errors.name && <div className="form-error">{errors.name}</div>}
                        </div>

                        <div className="form-group" style={{ marginBottom: 14 }}>
                            <label style={labelStyle}>Formula Type *</label>
                            <select className="form-input" value={data.formula_type} onChange={e => {
                                const defaults = { percentage: { rate_percent: 20 }, hourly: { hourly_rate: 150, hours_billed: 0 }, fixed: { flat_fee: 5000 }, milestone: { milestones: [] } }
                                setData({ ...data, formula_type: e.target.value, formula_fields: defaults[e.target.value] || {} })
                            }}>
                                {['percentage', 'hourly', 'fixed', 'milestone'].map(f => <option key={f} value={f}>{f}</option>)}
                            </select>
                        </div>

                        <div style={{ marginBottom: 14 }}>
                            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink2)', marginBottom: 8 }}>Formula Fields</div>
                            {fields.map(f => (
                                <div key={f.key} className="form-group" style={{ marginBottom: 10 }}>
                                    <label style={labelStyle}>{f.label}</label>
                                    {f.type === 'textarea' ? (
                                        <textarea className="form-input" rows={3} value={typeof data.formula_fields[f.key] === 'object' ? JSON.stringify(data.formula_fields[f.key]) : (data.formula_fields[f.key] || '')} onChange={e => {
                                            try { setData('formula_fields', { ...data.formula_fields, [f.key]: JSON.parse(e.target.value) }) }
                                            catch { setData('formula_fields', { ...data.formula_fields, [f.key]: e.target.value }) }
                                        }} placeholder={f.placeholder} style={{ resize: 'vertical', fontFamily: 'var(--mono)', fontSize: 12 }} />
                                    ) : (
                                        <input className="form-input" type={f.type} value={data.formula_fields[f.key] || ''} onChange={e => setData('formula_fields', { ...data.formula_fields, [f.key]: e.target.value })} placeholder={f.placeholder} style={{ maxWidth: 200 }} />
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="form-group" style={{ marginBottom: 14 }}>
                            <label style={labelStyle}>Notes</label>
                            <textarea className="form-input" rows={2} value={data.notes} onChange={e => setData('notes', e.target.value)} style={{ resize: 'vertical' }} />
                        </div>

                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                            <input type="checkbox" checked={data.is_active} onChange={e => setData('is_active', e.target.checked)} />
                            <span style={{ fontSize: 13, fontWeight: 500 }}>Active</span>
                        </label>
                    </div>

                    <div style={{ display: 'flex', gap: 10 }}>
                        <button type="submit" className="btn btn-primary" disabled={processing}>
                            {processing ? 'Saving...' : (isEdit ? 'Update' : 'Create')}
                        </button>
                        <a href={route('admin.compensation-types.index')} className="btn btn-secondary">Cancel</a>
                    </div>
                </form>
            </div>
        </AdminLayout>
    )
}
