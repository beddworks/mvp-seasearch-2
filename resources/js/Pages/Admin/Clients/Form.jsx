import { useState, useRef, useCallback } from 'react'
import { useForm } from '@inertiajs/react'
import AdminLayout from '@/Layouts/AdminLayout'

// ─── helpers ──────────────────────────────────────────────────────────────────

const FORMULA_LABELS = { percentage: 'Percentage', hourly: 'Hourly rate', fixed: 'Fixed amount', milestone: 'Milestone-based' }
const CONFIDENCE_META = {
    high:   { color: 'var(--jade2)',   bg: 'var(--jade-pale)',   label: 'High confidence'   },
    medium: { color: 'var(--amber2)',  bg: '#FDF0E8',            label: 'Medium confidence' },
    low:    { color: 'var(--ruby2)',   bg: 'var(--ruby-pale)',   label: 'Low confidence'    },
}

// ─── main component ──────────────────────────────────────────────────────────

export default function ClientForm({ client, compensationTypes = [] }) {
    const isEdit = !!client

    const { data, setData, post, processing, errors } = useForm({
        company_name:         client?.company_name         || '',
        contact_name:         client?.user?.name           || '',
        contact_email:        client?.user?.email          || '',
        industry:             client?.industry             || '',
        website:              client?.website              || '',
        accent_color:         client?.accent_color         || '#1A6DB5',
        notes:                client?.notes                || '',
        compensation_type_id: client?.compensation_type_id || '',
        // inline fee creation
        fee_mode:             'existing',
        fee_name:             '',
        fee_formula_type:     'percentage',
        fee_pct:              '0.20',
        fee_formula_fields:   {},
        agreement_file:       null,
        ...(client ? { _method: 'PUT' } : {}),
    })

    // AI state
    const [aiLoading, setAiLoading]   = useState(false)
    const [aiError,   setAiError]     = useState(null)
    const [isDragging, setIsDragging] = useState(false)
    const [fileName,   setFileName]   = useState(null)
    const fileRef = useRef(null)

    // ── Drop + file handling ─────────────────────────────────────────────────

    const handleFile = useCallback(async (file) => {
        if (!file) return
        const allowed = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
        if (!allowed.includes(file.type) && !file.name.match(/\.(pdf|doc|docx)$/i)) {
            setAiError('Only PDF, DOC, or DOCX files are supported.')
            return
        }
        setFileName(file.name)
        setAiError(null)
        setAiLoading(true)

        // Store file in form data so it is uploaded on submit
        setData(d => ({ ...d, agreement_file: file }))

        const fd = new FormData()
        fd.append('document', file)
        fd.append('_token', document.querySelector('meta[name=csrf-token]')?.content || '')

        try {
            const res = await fetch(route('admin.clients.ai-preview'), { method: 'POST', body: fd })
            const json = await res.json()
            if (!res.ok) { setAiError(json.error || 'AI extraction failed.'); setAiLoading(false); return }
            applyAiResult(json)
        } catch {
            setAiError('Network error — could not reach AI service.')
        }
        setAiLoading(false)
    }, [])

    function onDrop(e) {
        e.preventDefault(); setIsDragging(false)
        handleFile(e.dataTransfer.files[0])
    }

    // ── Apply AI result to form ──────────────────────────────────────────────

    function applyAiResult(result) {
        if (!result) return
        const fa = result.fee_agreement || {}

        // Build fee fields based on formula type
        const feeFields = {}
        if (fa.recommended_formula_type === 'hourly' && fa.formula_fields) {
            feeFields.hourly_rate  = fa.formula_fields.hourly_rate  || ''
            feeFields.hours_billed = fa.formula_fields.hours_billed || ''
        } else if (fa.recommended_formula_type === 'fixed' && fa.formula_fields) {
            feeFields.fixed_amount = fa.formula_fields.fixed_amount || ''
        } else if (fa.recommended_formula_type === 'milestone' && fa.formula_fields) {
            feeFields.milestones = fa.formula_fields.milestones || []
        }

        // Single setData call — multiple calls with Inertia useForm overwrite each other
        setData(d => ({
            ...d,
            // Text fields — only overwrite if AI found a value
            ...(result.company_name  && { company_name:  result.company_name  }),
            ...(result.industry      && { industry:      result.industry      }),
            ...(result.contact_name  && { contact_name:  result.contact_name  }),
            ...(result.contact_email && { contact_email: result.contact_email }),
            ...(result.website       && { website:       result.website       }),
            ...(result.notes         && { notes:         result.notes         }),
            // Fee agreement
            ...(fa.matched_type_id
                ? {
                    fee_mode:             'existing',
                    compensation_type_id: fa.matched_type_id,
                }
                : {
                    fee_mode:           'new',
                    fee_formula_type:   fa.recommended_formula_type || 'percentage',
                    fee_pct:            fa.platform_fee_pct ? String(fa.platform_fee_pct) : '0.20',
                    fee_name:           fa.suggested_name || '',
                    fee_formula_fields: feeFields,
                }
            ),
        }))
    }

    // ── Submit ───────────────────────────────────────────────────────────────

    function submit(e) {
        e.preventDefault()
        if (isEdit) {
            post(route('admin.clients.update', client.id), { forceFormData: true })
        } else {
            post(route('admin.clients.store'))
        }
    }

    // ── Styles ───────────────────────────────────────────────────────────────

    const lbl = { fontSize: 12, fontWeight: 500, color: 'var(--ink2)', display: 'block', marginBottom: 4 }

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <AdminLayout title={isEdit ? 'Edit Client' : 'New Client'}>
            {/* ── AI Processing Overlay ─────────────────────────────────── */}
            {aiLoading && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 1500,
                    background: 'rgba(13, 12, 10, 0.45)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
                }}>
                    <div style={{
                        width: '100%', maxWidth: 420,
                        background: '#fff', border: '1px solid var(--wire)',
                        borderRadius: 'var(--r)', padding: '24px 22px', textAlign: 'center',
                    }}>
                        <div style={{
                            width: 38, height: 38, borderRadius: '50%',
                            margin: '0 auto 14px',
                            border: '3px solid var(--wire)', borderTopColor: 'var(--sea2)',
                            animation: 'spin 1s linear infinite',
                        }} />
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>
                            AI processing document
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--ink4)', lineHeight: 1.7 }}>
                            Extracting company details, contact info, and fee agreement terms… Please wait.
                        </div>
                    </div>
                </div>
            )}
            <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

            <div className="page-content" style={{ maxWidth: 860 }}>

                <div className="page-head">
                    <div>
                        <div className="page-title">{isEdit ? 'Edit Client' : 'New Client'}</div>
                        <div className="page-sub">{isEdit ? client.company_name : 'Add a new client account'}</div>
                    </div>
                </div>

                {/* ── AI Drop Zone ─────────────────────────────────────────── */}
                {/* Existing saved file — shown on edit when a file was previously uploaded */}
                {isEdit && client?.agreement_file_url && !fileName && (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '10px 14px', marginBottom: 10,
                        border: '1px solid var(--wire)', borderRadius: 8,
                        background: 'var(--mist2)',
                    }}>
                        <div style={{ width: 34, height: 34, borderRadius: 7, background: 'var(--sea-pale)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>📎</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {client.agreement_file_name || 'Agreement document'}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--ink4)' }}>Uploaded during creation</div>
                        </div>
                        <a
                            href={route('admin.clients.download-agreement', client.id)}
                            target="_blank"
                            rel="noreferrer"
                            onClick={e => e.stopPropagation()}
                            style={{ fontSize: 11, color: 'var(--sea2)', textDecoration: 'none', fontWeight: 500, flexShrink: 0, padding: '4px 10px', border: '1px solid var(--sea3)', borderRadius: 6, background: '#fff' }}
                        >
                            Download
                        </a>
                    </div>
                )}
                <div
                    onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={onDrop}
                    onClick={() => !aiLoading && fileRef.current?.click()}
                    style={{
                        border: `2px dashed ${isDragging ? 'var(--sea2)' : 'var(--wire)'}`,
                        borderRadius: 10,
                        padding: '22px 20px',
                        marginBottom: 18,
                        background: isDragging ? 'var(--sea-pale)' : '#fff',
                        display: 'flex', alignItems: 'center', gap: 16,
                        cursor: aiLoading ? 'wait' : 'pointer',
                        transition: 'all .15s',
                    }}
                >
                    <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" style={{ display: 'none' }}
                        onChange={e => handleFile(e.target.files[0])} />

                    <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--sea-pale)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                        📄
                    </div>

                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 2 }}>
                            {fileName
                                ? `${fileName} — click to change`
                                : isEdit && client?.agreement_file_url
                                    ? 'Upload a new document to replace the existing one'
                                    : 'Drop a fee agreement, LOE, or company document here'}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--ink4)' }}>
                            PDF, DOC, DOCX · AI will auto-fill the form and recommend a fee structure
                        </div>
                        {aiError && <div style={{ fontSize: 11, color: 'var(--ruby2)', marginTop: 4 }}>⚠ {aiError}</div>}
                    </div>

                    <div style={{ padding: '6px 14px', borderRadius: 6, background: 'var(--sea2)', color: '#fff', fontSize: 11, fontWeight: 500, flexShrink: 0 }}>
                        {fileName ? 'Re-analyse' : 'Browse file'}
                    </div>
                </div>

                {/* ── Form ─────────────────────────────────────────────────── */}
                <form onSubmit={submit}>
                    <div>

                        {/* LEFT — main fields */}
                        <div>
                            {/* Company details */}
                            <div className="dcard" style={{ padding: 22, marginBottom: 14 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    🏢 Company details
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                        <label style={lbl}>Company name *</label>
                                        <input className="form-input" value={data.company_name} onChange={e => setData('company_name', e.target.value)} placeholder="e.g. Acme Holdings" />
                                        {errors.company_name && <div className="form-error">{errors.company_name}</div>}
                                    </div>
                                    <div className="form-group">
                                        <label style={lbl}>Industry</label>
                                        <input className="form-input" value={data.industry} onChange={e => setData('industry', e.target.value)} placeholder="e.g. FinTech" />
                                    </div>
                                    <div className="form-group">
                                        <label style={lbl}>Website</label>
                                        <input className="form-input" type="url" value={data.website} onChange={e => setData('website', e.target.value)} placeholder="https://" />
                                        {errors.website && <div className="form-error">{errors.website}</div>}
                                    </div>
                                </div>
                                <div className="form-group" style={{ marginTop: 14 }}>
                                    <label style={lbl}>Notes</label>
                                    <textarea className="form-input" rows={3} value={data.notes} onChange={e => setData('notes', e.target.value)} placeholder="Internal notes, special terms, onboarding context…" style={{ resize: 'vertical' }} />
                                </div>
                                <div className="form-group" style={{ marginTop: 14 }}>
                                    <label style={lbl}>Portal accent color</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <input type="color" value={data.accent_color} onChange={e => setData('accent_color', e.target.value)} style={{ width: 40, height: 32, border: '1px solid var(--wire)', borderRadius: 4, cursor: 'pointer', padding: 0 }} />
                                        <input className="form-input" value={data.accent_color} onChange={e => setData('accent_color', e.target.value)} style={{ maxWidth: 110 }} />
                                        <span style={{ fontSize: 11, color: 'var(--ink4)' }}>Used on the client portal header</span>
                                    </div>
                                </div>
                            </div>

                            {/* Contact person */}
                            <div className="dcard" style={{ padding: 22, marginBottom: 14 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>👤 Contact person</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                                    <div className="form-group">
                                        <label style={lbl}>Contact name *</label>
                                        <input className="form-input" value={data.contact_name} onChange={e => setData('contact_name', e.target.value)} />
                                        {errors.contact_name && <div className="form-error">{errors.contact_name}</div>}
                                    </div>
                                    <div className="form-group">
                                        <label style={lbl}>Contact email *</label>
                                        <input className="form-input" type="email" value={data.contact_email} onChange={e => setData('contact_email', e.target.value)} disabled={isEdit} />
                                        {errors.contact_email && <div className="form-error">{errors.contact_email}</div>}
                                    </div>
                                </div>
                            </div>

                            {/* Fee agreement */}
                            <div className="dcard" style={{ padding: 22, marginBottom: 14 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>💰 Fee agreement</div>
                                <div style={{ fontSize: 11, color: 'var(--ink4)', marginBottom: 16 }}>
                                    Select an existing fee structure or define a custom one for this client.
                                </div>

                                {/* Toggle */}
                                <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                                    {[['existing', 'Use existing'], ['new', 'Define custom']].map(([val, label]) => (
                                        <button key={val} type="button"
                                            onClick={() => setData('fee_mode', val)}
                                            style={{
                                                padding: '6px 14px', fontSize: 12, borderRadius: 6, cursor: 'pointer',
                                                border: `1px solid ${data.fee_mode === val ? 'var(--sea3)' : 'var(--wire)'}`,
                                                background: data.fee_mode === val ? 'var(--sea-pale)' : '#fff',
                                                color: data.fee_mode === val ? 'var(--sea)' : 'var(--ink4)',
                                                fontWeight: data.fee_mode === val ? 500 : 400,
                                                fontFamily: 'var(--font)',
                                            }}
                                        >{label}</button>
                                    ))}
                                </div>

                                {/* Existing: dropdown */}
                                {data.fee_mode === 'existing' && (
                                    <div className="form-group">
                                        <label style={lbl}>Compensation type</label>
                                        <select className="form-input" value={data.compensation_type_id} onChange={e => setData('compensation_type_id', e.target.value)}>
                                            <option value="">— None selected —</option>
                                            {compensationTypes.map(ct => (
                                                <option key={ct.id} value={ct.id}>{ct.name} ({FORMULA_LABELS[ct.formula_type] || ct.formula_type})</option>
                                            ))}
                                        </select>
                                        {errors.compensation_type_id && <div className="form-error">{errors.compensation_type_id}</div>}
                                    </div>
                                )}

                                {/* New: inline custom fields */}
                                {data.fee_mode === 'new' && (
                                    <div style={{ background: 'var(--mist2)', borderRadius: 8, padding: 16, border: '1px solid var(--wire)' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                                <label style={lbl}>Agreement name *</label>
                                                <input className="form-input" value={data.fee_name} onChange={e => setData('fee_name', e.target.value)} placeholder="e.g. Standard 20% Contingency" />
                                                {errors.fee_name && <div className="form-error">{errors.fee_name}</div>}
                                            </div>
                                            <div className="form-group">
                                                <label style={lbl}>Formula type *</label>
                                                <select className="form-input" value={data.fee_formula_type} onChange={e => setData('fee_formula_type', e.target.value)}>
                                                    {Object.entries(FORMULA_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                                </select>
                                            </div>
                                            {data.fee_formula_type === 'percentage' && (
                                                <div className="form-group">
                                                    <label style={lbl}>Platform fee %</label>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <input className="form-input" type="number" step="0.01" min="0" max="1" value={data.fee_pct} onChange={e => setData('fee_pct', e.target.value)} style={{ maxWidth: 90 }} />
                                                        <span style={{ fontSize: 12, color: 'var(--ink4)' }}>= {Math.round(parseFloat(data.fee_pct || 0) * 100)}%</span>
                                                    </div>
                                                </div>
                                            )}
                                            {data.fee_formula_type === 'hourly' && (
                                                <>
                                                    <div className="form-group">
                                                        <label style={lbl}>Hourly rate</label>
                                                        <input className="form-input" type="number" value={data.fee_formula_fields?.hourly_rate || ''} onChange={e => setData('fee_formula_fields', { ...data.fee_formula_fields, hourly_rate: e.target.value })} placeholder="e.g. 250" />
                                                    </div>
                                                    <div className="form-group">
                                                        <label style={lbl}>Hours billed</label>
                                                        <input className="form-input" type="number" value={data.fee_formula_fields?.hours_billed || ''} onChange={e => setData('fee_formula_fields', { ...data.fee_formula_fields, hours_billed: e.target.value })} placeholder="e.g. 160" />
                                                    </div>
                                                </>
                                            )}
                                            {data.fee_formula_type === 'fixed' && (
                                                <div className="form-group">
                                                    <label style={lbl}>Fixed amount</label>
                                                    <input className="form-input" type="number" value={data.fee_formula_fields?.fixed_amount || ''} onChange={e => setData('fee_formula_fields', { ...data.fee_formula_fields, fixed_amount: e.target.value })} placeholder="e.g. 50000" />
                                                </div>
                                            )}
                                            {data.fee_formula_type === 'milestone' && (
                                                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                                    <label style={lbl}>Milestones</label>
                                                    <div style={{ fontSize: 11, color: 'var(--ink4)', marginBottom: 8 }}>Define payment milestones manually or let AI fill them from the document.</div>
                                                    {(data.fee_formula_fields?.milestones || []).map((ms, i) => (
                                                        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                                                            <input className="form-input" value={ms.name || ''} onChange={e => { const arr = [...(data.fee_formula_fields?.milestones || [])]; arr[i] = { ...arr[i], name: e.target.value }; setData('fee_formula_fields', { ...data.fee_formula_fields, milestones: arr }) }} placeholder="Milestone name" style={{ flex: 1 }} />
                                                            <input className="form-input" type="number" value={ms.amount || ''} onChange={e => { const arr = [...(data.fee_formula_fields?.milestones || [])]; arr[i] = { ...arr[i], amount: e.target.value }; setData('fee_formula_fields', { ...data.fee_formula_fields, milestones: arr }) }} placeholder="Amount" style={{ maxWidth: 130 }} />
                                                            <button type="button" onClick={() => { const arr = (data.fee_formula_fields?.milestones || []).filter((_, j) => j !== i); setData('fee_formula_fields', { ...data.fee_formula_fields, milestones: arr }) }} style={{ padding: '0 10px', border: '1px solid var(--wire)', borderRadius: 6, background: '#fff', cursor: 'pointer', color: 'var(--ruby2)' }}>✕</button>
                                                        </div>
                                                    ))}
                                                    <button type="button" onClick={() => setData('fee_formula_fields', { ...data.fee_formula_fields, milestones: [...(data.fee_formula_fields?.milestones || []), { name: '', amount: '' }] })}
                                                        style={{ fontSize: 11, padding: '5px 12px', border: '1px dashed var(--wire)', borderRadius: 6, background: '#fff', color: 'var(--sea)', cursor: 'pointer', fontFamily: 'var(--font)', marginTop: 4 }}>
                                                        + Add milestone
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Submit */}
                            <div style={{ display: 'flex', gap: 10 }}>
                                <button type="submit" className="btn btn-primary" disabled={processing}>
                                    {processing ? 'Saving…' : (isEdit ? 'Update client' : 'Create client')}
                                </button>
                                <a href={route('admin.clients.index')} className="btn btn-secondary">Cancel</a>
                            </div>
                        </div>


                    </div>
                </form>
            </div>

            <style>{`
                @keyframes bounce {
                    0%,80%,100% { transform: scale(0); opacity: .3 }
                    40% { transform: scale(1); opacity: 1 }
                }
            `}</style>
        </AdminLayout>
    )
}



