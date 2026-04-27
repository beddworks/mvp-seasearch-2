import { useForm } from '@inertiajs/react'
import { useRef, useState } from 'react'
import AdminLayout from '@/Layouts/AdminLayout'

const csrf = () => document.querySelector('meta[name=csrf-token]')?.content

const AI_OVERLAY = {
    backdrop: {
        position: 'fixed',
        inset: 0,
        zIndex: 1500,
        background: 'rgba(13, 12, 10, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
    },
    card: {
        width: '100%',
        maxWidth: 420,
        background: '#fff',
        border: '1px solid var(--wire)',
        borderRadius: 'var(--r)',
        padding: '16px 18px',
        textAlign: 'center',
    },
    spinner: {
        width: 34,
        height: 34,
        borderRadius: '50%',
        margin: '0 auto 10px',
        border: '3px solid var(--wire)',
        borderTopColor: 'var(--sea2)',
        animation: 'spin 1s linear infinite',
    },
}

export default function MandateForm({ mandate, clients, compensation_types }) {
    const isEdit = !!mandate
    const [previewLoading, setPreviewLoading] = useState(false)
    const [previewError, setPreviewError] = useState('')
    const [dragging, setDragging] = useState(false)
    const [autoFilled, setAutoFilled] = useState({})
    const [jdFile, setJdFile] = useState(null)
    const fileInputRef = useRef(null)

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

    const applyPreviewToForm = (payload) => {
        const incoming = payload?.mandate || {}
        const updated = {}
        const map = ['title', 'location', 'seniority', 'industry', 'salary_min', 'salary_max', 'salary_currency', 'description']

        map.forEach((field) => {
            const value = incoming[field]
            if ((data[field] === '' || data[field] === null || data[field] === undefined) && value !== null && value !== undefined && `${value}`.trim() !== '') {
                setData(field, value)
                updated[field] = true
            }
        })

        setAutoFilled(updated)
    }

    const runAiPreview = async (file) => {
        setPreviewLoading(true)
        setPreviewError('')

        try {
            const fd = new FormData()
            fd.append('jd_file', file)

            const res = await fetch(route('admin.mandates.ai-preview'), {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': csrf(),
                    Accept: 'application/json',
                },
                body: fd,
            })

            const payload = await res.json()
            if (!res.ok || !payload?.success) {
                setPreviewError(payload?.message || 'Unable to parse JD right now.')
                return
            }

            applyPreviewToForm(payload)
        } catch {
            setPreviewError('Network error while generating AI preview.')
        } finally {
            setPreviewLoading(false)
        }
    }

    const handleJdFile = (file) => {
        if (!file) return

        const ext = file.name.split('.').pop()?.toLowerCase()
        if (!['pdf', 'doc', 'docx'].includes(ext)) {
            setPreviewError('Only PDF, DOC, or DOCX files are supported.')
            return
        }

        if (file.size > 10 * 1024 * 1024) {
            setPreviewError('File must be under 10 MB.')
            return
        }

        setJdFile(file)
        runAiPreview(file)
    }

    const onDrop = (e) => {
        e.preventDefault()
        e.stopPropagation()
        setDragging(false)
        handleJdFile(e.dataTransfer.files?.[0])
    }

    const onDragOver = (e) => {
        e.preventDefault()
        e.stopPropagation()
        setDragging(true)
    }

    const onDragLeave = (e) => {
        e.preventDefault()
        e.stopPropagation()
        setDragging(false)
    }

    function submit(e) {
        e.preventDefault()
        if (isEdit) put(route('admin.mandates.update', mandate.id))
        else post(route('admin.mandates.store'))
    }

    const labelStyle = { fontSize: 12, fontWeight: 500, color: 'var(--ink2)', display: 'block', marginBottom: 4 }
    const inputStyle = { width: '100%' }

    return (
        <AdminLayout title={isEdit ? 'Edit Mandate' : 'New Mandate'}>
            {previewLoading && (
                <div style={AI_OVERLAY.backdrop}>
                    <div style={AI_OVERLAY.card}>
                        <div style={AI_OVERLAY.spinner} />
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>AI processing JD</div>
                        <div style={{ fontSize: 12, color: 'var(--ink4)', lineHeight: 1.6 }}>Extracting mandate fields from uploaded document. Please wait...</div>
                    </div>
                </div>
            )}

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
                            <label style={labelStyle}>Upload Job Description (PDF/DOCX)</label>
                            <div style={{ fontSize: 11, color: 'var(--ink3)', marginBottom: 8 }}>Drop JD file first to auto-fill role fields with AI.</div>

                            {jdFile ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1px solid var(--wire)', borderRadius: 'var(--rsm)', background: 'var(--mist2)' }}>
                                    <div style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--wire)', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>JD</div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{jdFile.name}</div>
                                        <div style={{ fontSize: 10, color: 'var(--ink4)' }}>{Math.round(jdFile.size / 1024)} KB</div>
                                    </div>
                                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setJdFile(null); setPreviewError(''); setAutoFilled({}); }}>Remove</button>
                                </div>
                            ) : (
                                <div
                                    onDrop={onDrop}
                                    onDragEnter={onDragOver}
                                    onDragOver={onDragOver}
                                    onDragLeave={onDragLeave}
                                    onClick={() => fileInputRef.current?.click()}
                                    style={{
                                        border: `2px dashed ${dragging ? 'var(--sea3)' : 'var(--wire2)'}`,
                                        borderRadius: 'var(--rsm)',
                                        padding: '16px 12px',
                                        textAlign: 'center',
                                        background: dragging ? 'var(--sea-pale)' : 'var(--mist2)',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)' }}>Drop file here or click to browse</div>
                                    <div style={{ fontSize: 11, color: 'var(--ink4)', marginTop: 3 }}>PDF, DOC, DOCX - max 10 MB</div>
                                </div>
                            )}
                            <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" style={{ display: 'none' }} onChange={(e) => handleJdFile(e.target.files?.[0])} />
                            {previewError && <div className="form-error" style={{ marginTop: 6 }}>{previewError}</div>}
                        </div>

                        <div className="form-group" style={{ marginBottom: 14 }}>
                            <label style={labelStyle}>Title * {autoFilled.title && <span style={{ color: 'var(--sea2)' }}>(AI)</span>}</label>
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
                                <label style={labelStyle}>Seniority {autoFilled.seniority && <span style={{ color: 'var(--sea2)' }}>(AI)</span>}</label>
                                <select className="form-input" value={data.seniority} onChange={e => setData('seniority', e.target.value)}>
                                    <option value="">Select...</option>
                                    {['c_suite', 'vp_director', 'manager', 'ic'].map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label style={labelStyle}>Location {autoFilled.location && <span style={{ color: 'var(--sea2)' }}>(AI)</span>}</label>
                                <input className="form-input" value={data.location} onChange={e => setData('location', e.target.value)} placeholder="e.g. Singapore" />
                            </div>
                            <div className="form-group">
                                <label style={labelStyle}>Industry {autoFilled.industry && <span style={{ color: 'var(--sea2)' }}>(AI)</span>}</label>
                                <input className="form-input" value={data.industry} onChange={e => setData('industry', e.target.value)} placeholder="e.g. FinTech" />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
                            <div className="form-group">
                                <label style={labelStyle}>Salary Min {autoFilled.salary_min && <span style={{ color: 'var(--sea2)' }}>(AI)</span>}</label>
                                <input className="form-input" type="number" value={data.salary_min} onChange={e => setData('salary_min', e.target.value)} placeholder="e.g. 150000" />
                            </div>
                            <div className="form-group">
                                <label style={labelStyle}>Salary Max {autoFilled.salary_max && <span style={{ color: 'var(--sea2)' }}>(AI)</span>}</label>
                                <input className="form-input" type="number" value={data.salary_max} onChange={e => setData('salary_max', e.target.value)} placeholder="e.g. 200000" />
                            </div>
                            <div className="form-group">
                                <label style={labelStyle}>Currency {autoFilled.salary_currency && <span style={{ color: 'var(--sea2)' }}>(AI)</span>}</label>
                                <select className="form-input" value={data.salary_currency} onChange={e => setData('salary_currency', e.target.value)}>
                                    {['SGD', 'USD', 'MYR', 'THB', 'IDR', 'PHP', 'VND'].map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: 14 }}>
                            <label style={labelStyle}>Description {autoFilled.description && <span style={{ color: 'var(--sea2)' }}>(AI)</span>}</label>
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

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </AdminLayout>
    )
}
