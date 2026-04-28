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

    const { data, setData, post, put, processing, errors } = useForm({
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
    })

    // AI state
    const [aiLoading, setAiLoading]     = useState(false)
    const [aiError,   setAiError]       = useState(null)
    const [aiResult,  setAiResult]      = useState(null)   // raw AI response
    const [showModal, setShowModal]     = useState(false)  // summary modal open
    const [isDragging, setIsDragging]   = useState(false)
    const [fileName,   setFileName]     = useState(null)
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
        setAiResult(null)

        const fd = new FormData()
        fd.append('document', file)
        fd.append('_token', document.querySelector('meta[name=csrf-token]')?.content || '')

        try {
            const res = await fetch(route('admin.clients.ai-preview'), { method: 'POST', body: fd })
            const json = await res.json()
            if (!res.ok) { setAiError(json.error || 'AI extraction failed.'); setAiLoading(false); return }
            setAiResult(json)
            setShowModal(true)
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

    function applyAiResult() {
        if (!aiResult) return
        const fa = aiResult.fee_agreement || {}

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
            ...(aiResult.company_name  && { company_name:  aiResult.company_name  }),
            ...(aiResult.industry      && { industry:      aiResult.industry      }),
            ...(aiResult.contact_name  && { contact_name:  aiResult.contact_name  }),
            ...(aiResult.contact_email && { contact_email: aiResult.contact_email }),
            ...(aiResult.website       && { website:       aiResult.website       }),
            ...(aiResult.notes         && { notes:         aiResult.notes         }),
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

        setShowModal(false)
    }

    // ── Submit ───────────────────────────────────────────────────────────────

    function submit(e) {
        e.preventDefault()
        if (isEdit) put(route('admin.clients.update', client.id))
        else post(route('admin.clients.store'))
    }

    // ── Styles ───────────────────────────────────────────────────────────────

    const lbl = { fontSize: 12, fontWeight: 500, color: 'var(--ink2)', display: 'block', marginBottom: 4 }

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <AdminLayout title={isEdit ? 'Edit Client' : 'New Client'}>
            <div className="page-content" style={{ maxWidth: 860 }}>

                <div className="page-head">
                    <div>
                        <div className="page-title">{isEdit ? 'Edit Client' : 'New Client'}</div>
                        <div className="page-sub">{isEdit ? client.company_name : 'Add a new client account'}</div>
                    </div>
                </div>

                {/* ── AI Drop Zone ─────────────────────────────────────────── */}
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

                    <div style={{ width: 44, height: 44, borderRadius: 10, background: aiLoading ? '#FDF0E8' : 'var(--sea-pale)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                        {aiLoading ? '⏳' : '📄'}
                    </div>

                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 2 }}>
                            {aiLoading
                                ? 'Analysing document…'
                                : fileName
                                    ? `${fileName} — click to change`
                                    : 'Drop a fee agreement, LOE, or company document here'}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--ink4)' }}>
                            {aiLoading
                                ? 'AI is reading the document and extracting client + fee agreement details'
                                : 'PDF, DOC, DOCX · AI will auto-fill the form and recommend a fee structure'}
                        </div>
                        {aiError && <div style={{ fontSize: 11, color: 'var(--ruby2)', marginTop: 4 }}>⚠ {aiError}</div>}
                    </div>

                    {!aiLoading && (
                        <div style={{ padding: '6px 14px', borderRadius: 6, background: 'var(--sea2)', color: '#fff', fontSize: 11, fontWeight: 500, flexShrink: 0 }}>
                            {fileName ? 'Re-analyse' : 'Browse file'}
                        </div>
                    )}
                    {aiLoading && (
                        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                            {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--sea2)', animation: `bounce .9s ${i * .2}s infinite` }} />)}
                        </div>
                    )}
                </div>

                {/* ── Form ─────────────────────────────────────────────────── */}
                <form onSubmit={submit}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, alignItems: 'flex-start' }}>

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

                        {/* RIGHT — live preview */}
                        <div style={{ position: 'sticky', top: 76 }}>
                            <div className="dcard" style={{ padding: 0, overflow: 'hidden' }}>
                                {/* Header accent */}
                                <div style={{ height: 4, background: data.accent_color || '#1A6DB5' }} />
                                <div style={{ padding: 18 }}>
                                    <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--ink4)', marginBottom: 10 }}>Preview</div>

                                    {/* Company card */}
                                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
                                        <div style={{ width: 40, height: 40, borderRadius: 8, background: (data.accent_color || '#1A6DB5') + '22', color: data.accent_color || '#1A6DB5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, flexShrink: 0, border: `1px solid ${data.accent_color || '#1A6DB5'}44` }}>
                                            {(data.company_name || 'Co').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{data.company_name || '—'}</div>
                                            {data.industry && <div style={{ fontSize: 11, color: 'var(--ink4)' }}>{data.industry}</div>}
                                        </div>
                                    </div>

                                    <PreviewRow label="Contact" value={data.contact_name || '—'} />
                                    <PreviewRow label="Email"   value={data.contact_email || '—'} />
                                    {data.website && <PreviewRow label="Website" value={data.website} />}

                                    {/* Fee preview */}
                                    <div style={{ height: 1, background: 'var(--wire)', margin: '12px 0' }} />
                                    <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--ink4)', marginBottom: 8 }}>Fee agreement</div>
                                    {data.fee_mode === 'existing' && data.compensation_type_id ? (
                                        (() => {
                                            const ct = compensationTypes.find(c => c.id === data.compensation_type_id)
                                            return ct ? (
                                                <>
                                                    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)', marginBottom: 3 }}>{ct.name}</div>
                                                    <span className="badge badge-sea" style={{ fontSize: 10 }}>{FORMULA_LABELS[ct.formula_type] || ct.formula_type}</span>
                                                </>
                                            ) : null
                                        })()
                                    ) : data.fee_mode === 'new' && data.fee_name ? (
                                        <>
                                            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)', marginBottom: 3 }}>{data.fee_name}</div>
                                            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                                                <span className="badge badge-sea" style={{ fontSize: 10 }}>{FORMULA_LABELS[data.fee_formula_type] || data.fee_formula_type}</span>
                                                {data.fee_formula_type === 'percentage' && <span className="badge badge-jade" style={{ fontSize: 10 }}>{Math.round(parseFloat(data.fee_pct || 0) * 100)}%</span>}
                                            </div>
                                        </>
                                    ) : (
                                        <div style={{ fontSize: 11, color: 'var(--ink4)', fontStyle: 'italic' }}>Not set</div>
                                    )}

                                    {data.notes && (
                                        <>
                                            <div style={{ height: 1, background: 'var(--wire)', margin: '12px 0' }} />
                                            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--ink4)', marginBottom: 5 }}>Notes</div>
                                            <div style={{ fontSize: 11, color: 'var(--ink4)', lineHeight: 1.55 }}>{data.notes.slice(0, 140)}{data.notes.length > 140 ? '…' : ''}</div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* AI result quick-view (after applied) */}
                            {aiResult && !showModal && (
                                <div style={{ marginTop: 12, background: 'var(--sea-pale)', borderRadius: 8, padding: '10px 14px', border: '1px solid var(--sea3)' }}>
                                    <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--sea)', marginBottom: 4 }}>✓ AI data applied</div>
                                    <div style={{ fontSize: 11, color: 'var(--ink4)' }}>{aiResult.ai_summary}</div>
                                    <button type="button" onClick={() => setShowModal(true)} style={{ marginTop: 8, fontSize: 10, color: 'var(--sea)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', padding: 0 }}>
                                        View full AI summary →
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </form>
            </div>

            {/* ── AI Summary Modal ──────────────────────────────────────────── */}
            {showModal && aiResult && (
                <AiSummaryModal
                    result={aiResult}
                    compensationTypes={compensationTypes}
                    onApply={applyAiResult}
                    onClose={() => setShowModal(false)}
                />
            )}

            <style>{`
                @keyframes bounce {
                    0%,80%,100% { transform: scale(0); opacity: .3 }
                    40% { transform: scale(1); opacity: 1 }
                }
            `}</style>
        </AdminLayout>
    )
}

// ─── AiSummaryModal ───────────────────────────────────────────────────────────

function AiSummaryModal({ result, compensationTypes, onApply, onClose }) {
    const fa   = result.fee_agreement || {}
    const conf = CONFIDENCE_META[result.confidence] || CONFIDENCE_META.medium
    const feeConf = CONFIDENCE_META[fa.confidence] || CONFIDENCE_META.medium

    const matchedCt = fa.matched_type_id
        ? compensationTypes.find(c => c.id === fa.matched_type_id)
        : null

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 200,
            display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
        }}>
            {/* backdrop */}
            <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(13,12,10,.45)' }} />

            {/* panel */}
            <div style={{
                position: 'relative', zIndex: 1,
                width: 520, maxWidth: '95vw',
                height: '100vh', background: '#fff',
                display: 'flex', flexDirection: 'column',
                boxShadow: '-8px 0 32px rgba(0,0,0,.12)',
                overflowY: 'auto',
            }}>
                {/* panel header */}
                <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--wire)', display: 'flex', alignItems: 'center', gap: 10, position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--sea-pale)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🤖</div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>AI document summary</div>
                        <div style={{ fontSize: 11, color: 'var(--ink4)' }}>Review extracted data before applying to the form</div>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--ink4)', padding: '4px 8px' }}>✕</button>
                </div>

                <div style={{ padding: 22, flex: 1 }}>

                    {/* Confidence badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
                        <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 4, background: conf.bg, color: conf.color, fontWeight: 500 }}>
                            {conf.label}
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--ink4)' }}>Overall extraction quality</span>
                    </div>

                    {/* AI summary text */}
                    {result.ai_summary && (
                        <div style={{ background: 'var(--mist2)', borderRadius: 8, padding: 14, marginBottom: 18, border: '1px solid var(--wire)' }}>
                            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--ink4)', marginBottom: 6 }}>Document summary</div>
                            <div style={{ fontSize: 12, color: 'var(--ink)', lineHeight: 1.65 }}>{result.ai_summary}</div>
                        </div>
                    )}

                    {/* Client info section */}
                    <div style={{ marginBottom: 20 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                            🏢 Extracted client information
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <SummaryField label="Company name"  value={result.company_name}  />
                            <SummaryField label="Industry"      value={result.industry}       />
                            <SummaryField label="Contact name"  value={result.contact_name}   />
                            <SummaryField label="Contact email" value={result.contact_email}  />
                            <SummaryField label="Website"       value={result.website}        />
                            {result.notes && <SummaryField label="Notes" value={result.notes} multiline />}
                        </div>
                    </div>

                    {/* Divider */}
                    <div style={{ height: 1, background: 'var(--wire)', marginBottom: 20 }} />

                    {/* Fee agreement section */}
                    <div style={{ marginBottom: 24 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                            💰 Fee agreement recommendation
                            <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: feeConf.bg, color: feeConf.color, fontWeight: 500 }}>{feeConf.label}</span>
                        </div>

                        {/* Match banner */}
                        {matchedCt ? (
                            <div style={{ background: 'var(--jade-pale)', border: '1px solid var(--jade3)', borderRadius: 8, padding: 14, marginBottom: 14, display: 'flex', gap: 10, alignItems: 'center' }}>
                                <div style={{ fontSize: 18 }}>✅</div>
                                <div>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--jade2)', marginBottom: 2 }}>Matched existing fee structure</div>
                                    <div style={{ fontSize: 11, color: 'var(--ink)' }}>
                                        <strong>{matchedCt.name}</strong> ({FORMULA_LABELS[matchedCt.formula_type] || matchedCt.formula_type}) matches the document terms.
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div style={{ background: '#FDF0E8', border: '1px solid #F5C49A', borderRadius: 8, padding: 14, marginBottom: 14, display: 'flex', gap: 10, alignItems: 'center' }}>
                                <div style={{ fontSize: 18 }}>✨</div>
                                <div>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--amber2)', marginBottom: 2 }}>New fee structure recommended</div>
                                    <div style={{ fontSize: 11, color: 'var(--ink)' }}>
                                        No existing structure matched. AI recommends creating: <strong>{fa.suggested_name || 'Custom fee'}</strong>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Fee details */}
                        <div style={{ background: 'var(--mist2)', borderRadius: 8, padding: 14, border: '1px solid var(--wire)', marginBottom: 12 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                <SummaryField label="Formula type"    value={FORMULA_LABELS[fa.recommended_formula_type] || fa.recommended_formula_type} />
                                {fa.platform_fee_pct && <SummaryField label="Platform fee" value={`${Math.round(fa.platform_fee_pct * 100)}%`} />}
                                <SummaryField label="Agreement name"  value={fa.suggested_name} />
                            </div>
                        </div>

                        {/* Key terms */}
                        {(fa.key_terms || []).length > 0 && (
                            <div style={{ marginBottom: 14 }}>
                                <div style={{ fontSize: 11, color: 'var(--ink4)', marginBottom: 7 }}>Key fee terms found in document:</div>
                                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                    {fa.key_terms.map((term, i) => (
                                        <span key={i} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: '#fff', border: '1px solid var(--wire)', color: 'var(--ink)' }}>
                                            {term}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Reasoning */}
                        {fa.reasoning && (
                            <div style={{ background: 'var(--sea-pale)', borderRadius: 8, padding: 12, border: '1px solid var(--sea3)' }}>
                                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--sea)', marginBottom: 5 }}>AI reasoning</div>
                                <div style={{ fontSize: 11, color: 'var(--ink)', lineHeight: 1.6 }}>{fa.reasoning}</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer actions — sticky */}
                <div style={{ padding: '14px 22px', borderTop: '1px solid var(--wire)', background: '#fff', display: 'flex', gap: 10 }}>
                    <button onClick={onApply} className="btn btn-primary" style={{ flex: 1 }}>
                        ✓ Apply all to form
                    </button>
                    <button onClick={onClose} className="btn btn-secondary">
                        Dismiss
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── tiny sub-components ──────────────────────────────────────────────────────

function PreviewRow({ label, value }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 5 }}>
            <span style={{ color: 'var(--ink4)' }}>{label}</span>
            <span style={{ color: 'var(--ink)', maxWidth: 180, textAlign: 'right', wordBreak: 'break-word' }}>{value}</span>
        </div>
    )
}

function SummaryField({ label, value, multiline }) {
    if (!value && value !== 0) return (
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 10, color: 'var(--ink4)', minWidth: 100, paddingTop: 1 }}>{label}</span>
            <span style={{ fontSize: 11, color: 'var(--wire)', fontStyle: 'italic' }}>Not found</span>
        </div>
    )
    return (
        <div style={{ display: 'flex', gap: 8, alignItems: multiline ? 'flex-start' : 'center' }}>
            <span style={{ fontSize: 10, color: 'var(--ink4)', minWidth: 100, paddingTop: multiline ? 2 : 0 }}>{label}</span>
            <span style={{ fontSize: 12, color: 'var(--ink)', fontWeight: 500, flex: 1, lineHeight: 1.5 }}>{value}</span>
        </div>
    )
}


