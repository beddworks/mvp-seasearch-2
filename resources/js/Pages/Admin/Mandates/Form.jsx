import { useForm } from '@inertiajs/react'
import { useRef, useState } from 'react'
import AdminLayout from '@/Layouts/AdminLayout'

const csrf = () => document.querySelector('meta[name=csrf-token]')?.content

const CONTRACT_OPTS = [
    { value: 'full_time', label: 'Full-time' },
    { value: 'contract',  label: 'Contract'  },
    { value: 'part_time', label: 'Part-time' },
]

const SENIORITY_OPTS = [
    { value: 'c_suite',     label: 'C-Suite'       },
    { value: 'vp_director', label: 'VP / Director' },
    { value: 'manager',     label: 'Manager'       },
    { value: 'ic',          label: 'IC'            },
]

const CURRENCIES = ['SGD', 'USD', 'MYR', 'THB', 'IDR', 'PHP', 'VND', 'HKD']

// ── collapsible section block ──────────────────────────────────────────────
function Sblock({ title, children, defaultOpen = true }) {
    const [open, setOpen] = useState(defaultOpen)
    return (
        <div className="sblock" style={{ marginBottom: 10 }}>
            <div className="sblock-head" onClick={() => setOpen(o => !o)}>
                <div className="sblock-title">{title}</div>
                <span style={{ fontSize: 11, color: 'var(--ink3)' }}>{open ? '▲' : '▼'}</span>
            </div>
            {open && <div className="sblock-body">{children}</div>}
        </div>
    )
}

// ── dynamic string-list editor ────────────────────────────────────────────
function ListEditor({ items = [], onChange, placeholder = 'Add item...', isAi }) {
    return (
        <div>
            {items.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6, alignItems: 'center' }}>
                    {isAi && <span style={{ fontSize: 9, background: 'var(--sea-pale)', color: 'var(--sea2)', borderRadius: 4, padding: '1px 5px', flexShrink: 0, fontWeight: 500 }}>AI</span>}
                    <input
                        className="form-input"
                        style={{ flex: 1, fontSize: 12 }}
                        value={item}
                        onChange={e => { const a = [...items]; a[i] = e.target.value; onChange(a) }}
                        placeholder={placeholder}
                    />
                    <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))}
                        style={{ padding: '4px 9px', fontSize: 15, background: 'none', border: '1px solid var(--wire)', borderRadius: 'var(--rsm)', cursor: 'pointer', color: 'var(--ruby2)', lineHeight: 1, flexShrink: 0 }}>
                        ×
                    </button>
                </div>
            ))}
            <button type="button" onClick={() => onChange([...items, ''])} className="btn btn-secondary btn-sm" style={{ fontSize: 11 }}>
                + Add
            </button>
        </div>
    )
}

// ── helpers ────────────────────────────────────────────────────────────────
function coInitials(name) {
    return (name || '?').split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase() || '??'
}

function fmtK(n) {
    if (!n) return null
    const v = Math.round(Number(n))
    return v >= 1000 ? `${Math.round(v / 1000)}K` : String(v)
}

// ── main component ─────────────────────────────────────────────────────────
export default function MandateForm({ mandate, clients, compensation_types }) {
    const isEdit = !!mandate
    const [aiLoading,  setAiLoading]  = useState(false)
    const [aiError,    setAiError]    = useState('')
    const [dragging,   setDragging]   = useState(false)
    const [autoFilled, setAutoFilled] = useState({})
    const [jdFile,     setJdFile]     = useState(null)
    const [activeTab,  setActiveTab]  = useState('overview')
    const fileInputRef = useRef(null)

    const { data, setData, post, processing, errors } = useForm({
        title:                   mandate?.title                   || '',
        client_id:               mandate?.client_id               || '',
        compensation_type_id:    mandate?.compensation_type_id    || '',
        location:                mandate?.location                 || '',
        seniority:               mandate?.seniority               || '',
        industry:                mandate?.industry                 || '',
        contract_type:           mandate?.contract_type           || 'full_time',
        openings_count:          mandate?.openings_count          || 1,
        is_remote:               mandate?.is_remote               || false,
        salary_min:              mandate?.salary_min              || '',
        salary_max:              mandate?.salary_max              || '',
        salary_currency:         mandate?.salary_currency         || 'SGD',
        description:             mandate?.description             || '',
        must_haves:              mandate?.must_haves              || [],
        nice_to_haves:           mandate?.nice_to_haves           || [],
        green_flags:             mandate?.green_flags             || [],
        red_flags:               mandate?.red_flags               || [],
        screening_questions:     mandate?.screening_questions     || [],
        ideal_candidates:        mandate?.ideal_candidates        || [],
        ideal_source_companies:  mandate?.ideal_source_companies  || [],
        status:                  mandate?.status                  || 'draft',
        is_fast_track:           mandate?.is_fast_track           || false,
        timer_b_active:          mandate?.timer_b_active          || false,
        timer_c_active:          mandate?.timer_c_active          || false,
        jd_file:                 null,        ...(mandate ? { _method: 'PUT' } : {}),    })

    // ── AI auto-fill ────────────────────────────────────────────────────────
    const applyAiData = (parsed) => {
        const updated = {}

        // scalar string fields
        ;['title', 'location', 'seniority', 'industry', 'description', 'contract_type', 'salary_currency'].forEach(field => {
            const val = parsed[field]
            if (val !== null && val !== undefined && `${val}`.trim() !== '') {
                setData(field, val)
                updated[field] = true
            }
        })

        // numeric fields
        ;['salary_min', 'salary_max'].forEach(field => {
            const val = parsed[field]
            if (val !== null && val !== undefined && !isNaN(Number(val))) {
                setData(field, String(val))
                updated[field] = true
            }
        })

        if (parsed.openings_count && !isNaN(parseInt(parsed.openings_count))) {
            setData('openings_count', parseInt(parsed.openings_count) || 1)
            updated.openings_count = true
        }

        // array fields
        ;['must_haves', 'nice_to_haves', 'green_flags', 'red_flags', 'screening_questions', 'ideal_source_companies'].forEach(field => {
            const val = parsed[field]
            if (Array.isArray(val) && val.length > 0) {
                setData(field, val.filter(Boolean))
                updated[field] = true
            }
        })

        // ideal_candidates (array of objects)
        if (Array.isArray(parsed.ideal_candidates) && parsed.ideal_candidates.length > 0) {
            setData('ideal_candidates', parsed.ideal_candidates)
            updated.ideal_candidates = true
        }

        setAutoFilled(updated)
    }

    const runAiPreview = async (file) => {
        setAiLoading(true)
        setAiError('')
        try {
            const fd = new FormData()
            fd.append('jd_file', file)
            const res = await fetch(route('admin.mandates.ai-preview'), {
                method: 'POST',
                headers: { 'X-CSRF-TOKEN': csrf(), Accept: 'application/json' },
                body: fd,
            })
            const payload = await res.json()
            if (!res.ok || !payload?.success) {
                setAiError(payload?.message || 'Unable to parse JD right now.')
                return
            }
            applyAiData(payload.mandate || {})
        } catch {
            setAiError('Network error while generating AI preview.')
        } finally {
            setAiLoading(false)
        }
    }

    const handleJdFile = (file) => {
        if (!file) return
        const ext = file.name.split('.').pop()?.toLowerCase()
        if (!['pdf', 'doc', 'docx'].includes(ext)) { setAiError('Only PDF, DOC, or DOCX files are supported.'); return }
        if (file.size > 10 * 1024 * 1024) { setAiError('File must be under 10 MB.'); return }
        setJdFile(file)
        setAutoFilled({})
        // Store file in form data so it is uploaded on submit
        setData(d => ({ ...d, jd_file: file }))
        runAiPreview(file)
    }

    const onDrop      = (e) => { e.preventDefault(); e.stopPropagation(); setDragging(false); handleJdFile(e.dataTransfer.files?.[0]) }
    const onDragOver  = (e) => { e.preventDefault(); e.stopPropagation(); setDragging(true) }
    const onDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setDragging(false) }

    function submit(e) {
        e.preventDefault()
        if (isEdit) {
            post(route('admin.mandates.update', mandate.id), { forceFormData: true })
        } else {
            post(route('admin.mandates.store'))
        }
    }

    // ── shorthand styles ──────────────────────────────────────────────────
    const lbl = { fontSize: 12, fontWeight: 500, color: 'var(--ink2)', display: 'block', marginBottom: 4 }
    const aiBadge = (field) => autoFilled[field]
        ? <span style={{ fontSize: 9, background: 'var(--sea-pale)', color: 'var(--sea2)', borderRadius: 4, padding: '1px 5px', marginLeft: 4, fontWeight: 500 }}>AI</span>
        : null

    // ── live preview helpers ──────────────────────────────────────────────
    const previewClient = clients.find(c => c.id === data.client_id)
    const salaryChip = data.salary_min && data.salary_max
        ? `💰 ${data.salary_currency} ${fmtK(data.salary_min)} – ${fmtK(data.salary_max)}`
        : null

    return (
        <AdminLayout title={isEdit ? `Edit — ${mandate.title}` : 'New Role'}>
            {/* ── AI loading overlay ─── */}
            {aiLoading && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 1500, background: 'rgba(13,12,10,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
                    <div style={{ width: '100%', maxWidth: 440, background: '#fff', border: '1px solid var(--wire)', borderRadius: 'var(--r)', padding: '28px 24px', textAlign: 'center' }}>
                        <div style={{ width: 38, height: 38, borderRadius: '50%', margin: '0 auto 14px', border: '3px solid var(--wire)', borderTopColor: 'var(--sea2)', animation: 'spin 1s linear infinite' }} />
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>AI parsing JD</div>
                        <div style={{ fontSize: 12, color: 'var(--ink4)', lineHeight: 1.7 }}>
                            Extracting title, location, salary, description, requirements, screening flags, Q&A questions, ideal companies and more…
                        </div>
                    </div>
                </div>
            )}

            <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

            <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 24px 48px' }}>

                {/* ── page header ─── */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                    <div>
                        <div style={{ fontFamily: 'var(--font-head)', fontSize: 20, fontWeight: 700, color: 'var(--ink)' }}>
                            {isEdit ? `Edit Role — ${mandate.title}` : 'Create New Role'}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--ink4)', marginTop: 2 }}>
                            Drop a JD file first to auto-fill all fields with AI
                        </div>
                    </div>
                    <a href={route('admin.mandates.index')} style={{ fontSize: 12, color: 'var(--ink4)', textDecoration: 'none' }}>← Back to mandates</a>
                </div>

                <form onSubmit={submit}>
                    {/* ── side-by-side layout ─── */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, alignItems: 'start' }}>

                        {/* ════════ LEFT — form ════════ */}
                        <div>

                            {/* JD Drop Zone */}
                            <div style={{ background: '#fff', border: '1px solid var(--wire)', borderRadius: 'var(--r)', padding: '16px 18px', marginBottom: 14 }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 7 }}>
                                    📎 Upload Job Description
                                    <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--ink4)' }}>— PDF, DOC, DOCX · max 10 MB</span>
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--ink4)', marginBottom: 10 }}>
                                    Drop a JD to auto-fill title, salary, description, requirements, screening flags, Q&A, ideal companies and more with AI.
                                </div>

                                {jdFile ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1px solid var(--jade-soft)', borderRadius: 'var(--rsm)', background: 'var(--jade-pale)' }}>
                                        <div style={{ width: 32, height: 32, borderRadius: 6, background: '#fff', border: '1px solid var(--wire)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'var(--sea2)' }}>JD</div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{jdFile.name}</div>
                                            <div style={{ fontSize: 10, color: 'var(--ink4)' }}>{Math.round(jdFile.size / 1024)} KB · AI fields filled</div>
                                        </div>
                                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setJdFile(null); setAiError(''); setAutoFilled({}); setData(d => ({ ...d, jd_file: null })) }}>Remove</button>
                                    </div>
                                ) : isEdit && mandate?.jd_file_url ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1px solid var(--wire)', borderRadius: 'var(--rsm)', background: 'var(--mist2)' }}>
                                        <div style={{ width: 32, height: 32, borderRadius: 6, background: 'var(--sea-pale)', border: '1px solid var(--wire)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'var(--sea2)' }}>JD</div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {mandate.jd_file_name || 'Job description'}
                                            </div>
                                            <div style={{ fontSize: 10, color: 'var(--ink4)' }}>Uploaded during creation</div>
                                        </div>
                                        <a
                                            href={route('admin.mandates.download-jd', mandate.id)}
                                            target="_blank"
                                            rel="noreferrer"
                                            style={{ fontSize: 11, color: 'var(--sea2)', textDecoration: 'none', fontWeight: 500, flexShrink: 0, padding: '4px 10px', border: '1px solid var(--sea3)', borderRadius: 6, background: '#fff' }}
                                        >
                                            Download
                                        </a>
                                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => fileInputRef.current?.click()}>Replace</button>
                                    </div>
                                ) : (
                                    <div
                                        onDrop={onDrop} onDragEnter={onDragOver} onDragOver={onDragOver} onDragLeave={onDragLeave}
                                        onClick={() => fileInputRef.current?.click()}
                                        style={{
                                            border: `2px dashed ${dragging ? 'var(--sea3)' : 'var(--wire2)'}`,
                                            borderRadius: 'var(--rsm)', padding: '22px 16px', textAlign: 'center',
                                            background: dragging ? 'var(--sea-pale)' : 'var(--mist2)',
                                            cursor: 'pointer', transition: 'all .15s',
                                        }}
                                    >
                                        <div style={{ fontSize: 26, marginBottom: 7 }}>📄</div>
                                        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)' }}>Drop JD file here or click to browse</div>
                                        <div style={{ fontSize: 11, color: 'var(--ink4)', marginTop: 3 }}>PDF, DOC, DOCX — max 10 MB</div>
                                    </div>
                                )}
                                <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" style={{ display: 'none' }} onChange={e => handleJdFile(e.target.files?.[0])} />
                                {aiError && <div className="form-error" style={{ marginTop: 8 }}>{aiError}</div>}
                                {Object.keys(autoFilled).length > 0 && !aiLoading && (
                                    <div style={{ marginTop: 8, fontSize: 11, color: 'var(--jade2)', display: 'flex', alignItems: 'center', gap: 5 }}>
                                        ✓ AI filled {Object.keys(autoFilled).length} fields — review and adjust below
                                    </div>
                                )}
                            </div>

                            {/* Tabs */}
                            <div style={{ display: 'flex', borderBottom: '1px solid var(--wire)', marginBottom: 14 }}>
                                {[['overview', 'Overview'], ['settings', 'Settings']].map(([key, label]) => (
                                    <button key={key} type="button" onClick={() => setActiveTab(key)} style={{
                                        padding: '8px 16px', fontSize: 13, border: 'none',
                                        borderBottom: activeTab === key ? '2px solid var(--sea3)' : '2px solid transparent',
                                        color: activeTab === key ? 'var(--sea2)' : 'var(--ink4)',
                                        background: 'transparent', marginBottom: -1, cursor: 'pointer',
                                        fontFamily: 'var(--font)', fontWeight: activeTab === key ? 500 : 400,
                                    }}>
                                        {label}
                                    </button>
                                ))}
                            </div>

                            {/* ═══ OVERVIEW TAB ═══ */}
                            {activeTab === 'overview' && (
                                <>
                                    {/* Role basics */}
                                    <Sblock title="📋 Role basics">
                                        <div className="form-group" style={{ marginBottom: 14 }}>
                                            <label style={lbl}>Title * {aiBadge('title')}</label>
                                            <input className="form-input" value={data.title} onChange={e => setData('title', e.target.value)} placeholder="e.g. Chief HR Officer" />
                                            {errors.title && <div className="form-error">{errors.title}</div>}
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                                            <div className="form-group">
                                                <label style={lbl}>Client *</label>
                                                <select className="form-input" value={data.client_id} onChange={e => setData('client_id', e.target.value)}>
                                                    <option value="">Select client...</option>
                                                    {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                                                </select>
                                                {errors.client_id && <div className="form-error">{errors.client_id}</div>}
                                            </div>
                                            <div className="form-group">
                                                <label style={lbl}>Compensation Type</label>
                                                <select className="form-input" value={data.compensation_type_id} onChange={e => setData('compensation_type_id', e.target.value)}>
                                                    <option value="">None</option>
                                                    {compensation_types.map(ct => <option key={ct.id} value={ct.id}>{ct.name}</option>)}
                                                </select>
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
                                            <div className="form-group">
                                                <label style={lbl}>Seniority {aiBadge('seniority')}</label>
                                                <select className="form-input" value={data.seniority} onChange={e => setData('seniority', e.target.value)}>
                                                    <option value="">Select...</option>
                                                    {SENIORITY_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                                </select>
                                            </div>
                                            <div className="form-group">
                                                <label style={lbl}>Location {aiBadge('location')}</label>
                                                <input className="form-input" value={data.location} onChange={e => setData('location', e.target.value)} placeholder="e.g. Singapore" />
                                            </div>
                                            <div className="form-group">
                                                <label style={lbl}>Industry {aiBadge('industry')}</label>
                                                <input className="form-input" value={data.industry} onChange={e => setData('industry', e.target.value)} placeholder="e.g. Finance / Banking" />
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
                                            <div className="form-group">
                                                <label style={lbl}>Contract type {aiBadge('contract_type')}</label>
                                                <select className="form-input" value={data.contract_type} onChange={e => setData('contract_type', e.target.value)}>
                                                    {CONTRACT_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                                </select>
                                            </div>
                                            <div className="form-group">
                                                <label style={lbl}>Openings {aiBadge('openings_count')}</label>
                                                <input className="form-input" type="number" min={1} value={data.openings_count} onChange={e => setData('openings_count', parseInt(e.target.value) || 1)} />
                                            </div>
                                            <div className="form-group">
                                                <label style={lbl}>Work arrangement</label>
                                                <select className="form-input" value={data.is_remote ? 'remote' : 'onsite'} onChange={e => setData('is_remote', e.target.value === 'remote')}>
                                                    <option value="onsite">On-site / Hybrid</option>
                                                    <option value="remote">Remote</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                                            <div className="form-group">
                                                <label style={lbl}>Salary Min {aiBadge('salary_min')}</label>
                                                <input className="form-input" type="number" value={data.salary_min} onChange={e => setData('salary_min', e.target.value)} placeholder="e.g. 260000" />
                                            </div>
                                            <div className="form-group">
                                                <label style={lbl}>Salary Max {aiBadge('salary_max')}</label>
                                                <input className="form-input" type="number" value={data.salary_max} onChange={e => setData('salary_max', e.target.value)} placeholder="e.g. 340000" />
                                            </div>
                                            <div className="form-group">
                                                <label style={lbl}>Currency {aiBadge('salary_currency')}</label>
                                                <select className="form-input" value={data.salary_currency} onChange={e => setData('salary_currency', e.target.value)}>
                                                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    </Sblock>

                                    {/* Job description */}
                                    <Sblock title="📄 Job description">
                                        <div style={{ fontSize: 11, color: 'var(--ink4)', marginBottom: 8 }}>
                                            {aiBadge('description')} Comprehensive role overview including responsibilities, requirements and compensation.
                                        </div>
                                        <textarea
                                            className="form-input"
                                            rows={9}
                                            value={data.description}
                                            onChange={e => setData('description', e.target.value)}
                                            placeholder={'ROLE OVERVIEW\n[Role summary...]\n\nKEY RESPONSIBILITIES\n• Responsibility 1\n• Responsibility 2\n\nCOMPENSATION\nBase + bonus details...'}
                                            style={{ resize: 'vertical', fontSize: 12, lineHeight: 1.75, fontFamily: 'var(--font)' }}
                                        />
                                    </Sblock>

                                    {/* Candidate screening flags */}
                                    <Sblock title="🎯 Candidate screening flags">
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                                                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--jade-pale)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9 }}>✓</div>
                                                    <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--jade2)' }}>Green flags</span>
                                                    {aiBadge('green_flags')}
                                                </div>
                                                <ListEditor items={data.green_flags} onChange={v => setData('green_flags', v)} placeholder="e.g. 20+ years HR leadership" isAi={autoFilled.green_flags} />
                                            </div>
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                                                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--ruby-pale)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9 }}>✕</div>
                                                    <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--ruby2)' }}>Red flags</span>
                                                    {aiBadge('red_flags')}
                                                </div>
                                                <ListEditor items={data.red_flags} onChange={v => setData('red_flags', v)} placeholder="e.g. No international exposure" isAi={autoFilled.red_flags} />
                                            </div>
                                        </div>
                                    </Sblock>

                                    {/* Role requirements */}
                                    <Sblock title="✅ Role requirements">
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                                            <div>
                                                <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink)', marginBottom: 8 }}>
                                                    Must-have {aiBadge('must_haves')}
                                                </div>
                                                <ListEditor items={data.must_haves} onChange={v => setData('must_haves', v)} placeholder="e.g. 15+ years HR experience" isAi={autoFilled.must_haves} />
                                            </div>
                                            <div>
                                                <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink)', marginBottom: 8 }}>
                                                    Nice to have {aiBadge('nice_to_haves')}
                                                </div>
                                                <ListEditor items={data.nice_to_haves} onChange={v => setData('nice_to_haves', v)} placeholder="e.g. MBA qualification" isAi={autoFilled.nice_to_haves} />
                                            </div>
                                        </div>
                                    </Sblock>

                                    {/* Required candidate Q&A */}
                                    <Sblock title="💬 Required candidate Q&A">
                                        <div style={{ fontSize: 11, color: 'var(--ink4)', marginBottom: 10 }}>
                                            {aiBadge('screening_questions')} Screening questions recruiters must ask candidates before any submission.
                                        </div>
                                        <ListEditor items={data.screening_questions} onChange={v => setData('screening_questions', v)} placeholder="e.g. Confirm your right to work in Singapore" isAi={autoFilled.screening_questions} />
                                    </Sblock>

                                    {/* Ideal candidates */}
                                    <Sblock title="👤 Ideal candidates" defaultOpen={false}>
                                        <div style={{ fontSize: 11, color: 'var(--ink4)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                            {aiBadge('ideal_candidates')}
                                            <span style={{ fontSize: 10, background: 'var(--ruby-pale)', color: 'var(--ruby2)', border: '1px solid #F7C1C1', borderRadius: 4, padding: '1px 6px', fontWeight: 500 }}>DO NOT CONTACT</span>
                                            Reference profiles only — use as sourcing benchmarks.
                                        </div>
                                        <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--ink4)', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 8, marginBottom: 6 }}>
                                            <span>Full name</span><span>Title, Company</span><span>LinkedIn URL</span><span />
                                        </div>
                                        {data.ideal_candidates.map((ic, i) => (
                                            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                                                <input className="form-input" style={{ fontSize: 12 }} value={ic.name || ''} onChange={e => { const arr = [...data.ideal_candidates]; arr[i] = { ...arr[i], name: e.target.value }; setData('ideal_candidates', arr) }} placeholder="Sarah Wong" />
                                                <input className="form-input" style={{ fontSize: 12 }} value={ic.title || ''} onChange={e => { const arr = [...data.ideal_candidates]; arr[i] = { ...arr[i], title: e.target.value }; setData('ideal_candidates', arr) }} placeholder="CHRO, DBS Bank" />
                                                <input className="form-input" style={{ fontSize: 12 }} value={ic.linkedin_url || ''} onChange={e => { const arr = [...data.ideal_candidates]; arr[i] = { ...arr[i], linkedin_url: e.target.value }; setData('ideal_candidates', arr) }} placeholder="https://linkedin.com/in/..." />
                                                <button type="button" onClick={() => setData('ideal_candidates', data.ideal_candidates.filter((_, j) => j !== i))} style={{ padding: '4px 9px', fontSize: 15, background: 'none', border: '1px solid var(--wire)', borderRadius: 'var(--rsm)', cursor: 'pointer', color: 'var(--ruby2)', lineHeight: 1 }}>×</button>
                                            </div>
                                        ))}
                                        <button type="button" className="btn btn-secondary btn-sm" style={{ fontSize: 11 }} onClick={() => setData('ideal_candidates', [...data.ideal_candidates, { name: '', title: '', linkedin_url: '' }])}>
                                            + Add candidate
                                        </button>
                                    </Sblock>

                                    {/* Ideal source companies */}
                                    <Sblock title="🏢 Ideal source companies" defaultOpen={false}>
                                        <div style={{ fontSize: 11, color: 'var(--ink4)', marginBottom: 10 }}>
                                            {aiBadge('ideal_source_companies')} Companies to target when sourcing candidates for this role.
                                        </div>
                                        <ListEditor items={data.ideal_source_companies} onChange={v => setData('ideal_source_companies', v)} placeholder="e.g. DBS Bank, Standard Chartered" isAi={autoFilled.ideal_source_companies} />
                                    </Sblock>

                                    {/* Premium section — hardcoded, non-functional */}
                                    <div style={{ background: 'var(--mist2)', border: '1px solid var(--wire)', borderRadius: 'var(--r)', padding: '16px 18px', marginBottom: 14 }}>
                                        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
                                            🏆 Unlock premium features for this role
                                        </div>
                                        <div style={{ fontSize: 11, color: 'var(--ink4)', marginBottom: 14 }}>
                                            Get a competitive edge on this mandate with exclusive access or direct client communication.
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                                            {/* Exclusivity card */}
                                            <div style={{ background: '#fff', border: '1px solid var(--wire)', borderRadius: 'var(--r)', padding: '14px 16px' }}>
                                                <div style={{ width: 34, height: 34, borderRadius: 8, background: '#EEE9FB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, marginBottom: 8 }}>⭐</div>
                                                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)', marginBottom: 4 }}>Role exclusivity</div>
                                                <div style={{ fontSize: 11, color: 'var(--ink4)', lineHeight: 1.55, marginBottom: 8 }}>Lock this role to you for 30 days. No other recruiter can work or submit candidates for this mandate.</div>
                                                <div style={{ fontSize: 11, color: 'var(--ink4)', padding: '2px 0', display: 'flex', gap: 5 }}><span style={{ color: 'var(--jade2)' }}>✓</span>30-day exclusive lock</div>
                                                <div style={{ fontSize: 11, color: 'var(--ink4)', padding: '2px 0', display: 'flex', gap: 5 }}><span style={{ color: 'var(--jade2)' }}>✓</span>Priority placement in client shortlist</div>
                                                <div style={{ fontSize: 19, fontWeight: 600, color: 'var(--ink)', fontFamily: 'var(--font-head)', margin: '10px 0 2px' }}>SGD 500</div>
                                                <div style={{ fontSize: 10, color: 'var(--ink4)', marginBottom: 10 }}>per role / 30 days</div>
                                                <button type="button" disabled style={{ width: '100%', padding: 7, fontSize: 11, fontWeight: 500, borderRadius: 'var(--rsm)', fontFamily: 'var(--font)', border: '1px solid var(--sea)', background: 'var(--sea)', color: '#fff', opacity: .5, cursor: 'not-allowed' }}>Get exclusivity →</button>
                                            </div>
                                            {/* Direct access card */}
                                            <div style={{ background: '#fff', border: '1px solid var(--sea3)', borderRadius: 'var(--r)', padding: '14px 16px', position: 'relative' }}>
                                                <div style={{ position: 'absolute', top: 10, right: 10, fontSize: 9, background: 'var(--violet-pale)', color: 'var(--violet2)', borderRadius: 4, padding: '2px 6px', fontWeight: 500 }}>Most popular</div>
                                                <div style={{ width: 34, height: 34, borderRadius: 8, background: '#FDF0E8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, marginBottom: 8 }}>💬</div>
                                                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)', marginBottom: 4 }}>Direct client access</div>
                                                <div style={{ fontSize: 11, color: 'var(--ink4)', lineHeight: 1.55, marginBottom: 8 }}>Communicate directly with the hiring manager. Skip the middleman and build relationships that win mandates.</div>
                                                <div style={{ fontSize: 11, color: 'var(--ink4)', padding: '2px 0', display: 'flex', gap: 5 }}><span style={{ color: 'var(--jade2)' }}>✓</span>Direct messaging with hiring manager</div>
                                                <div style={{ fontSize: 11, color: 'var(--ink4)', padding: '2px 0', display: 'flex', gap: 5 }}><span style={{ color: 'var(--jade2)' }}>✓</span>Access to client contact details</div>
                                                <div style={{ fontSize: 19, fontWeight: 600, color: 'var(--ink)', fontFamily: 'var(--font-head)', margin: '10px 0 2px' }}>SGD 300</div>
                                                <div style={{ fontSize: 10, color: 'var(--ink4)', marginBottom: 10 }}>per role / one-time</div>
                                                <button type="button" disabled style={{ width: '100%', padding: 7, fontSize: 11, fontWeight: 500, borderRadius: 'var(--rsm)', fontFamily: 'var(--font)', border: '1px solid var(--sea)', background: 'var(--sea)', color: '#fff', opacity: .5, cursor: 'not-allowed' }}>Get direct access →</button>
                                            </div>
                                        </div>
                                        {/* Bundle */}
                                        <div style={{ background: 'var(--sea-pale)', border: '1.5px solid var(--sea-soft, #C5DFF5)', borderRadius: 'var(--r)', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                                            <div>
                                                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--sea)', marginBottom: 2 }}>⚡ Bundle — get both for less</div>
                                                <div style={{ fontSize: 11, color: 'var(--ink4)' }}>Role exclusivity + Direct client access at a discounted rate for this mandate.</div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--sea)', fontFamily: 'var(--font-head)' }}>SGD 700</div>
                                                <div style={{ fontSize: 10, background: 'var(--jade-pale)', color: 'var(--jade2)', borderRadius: 4, padding: '2px 7px', display: 'inline-block', marginTop: 2 }}>Save SGD 100</div>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* ═══ SETTINGS TAB ═══ */}
                            {activeTab === 'settings' && (
                                <>
                                    <Sblock title="⚙️ Role settings">
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                            {[
                                                { key: 'is_fast_track',  label: 'Fast Track',      desc: 'Admin CDD review bypassed for trusted recruiters on this mandate' },
                                                { key: 'timer_b_active', label: 'Timer B Active',   desc: '3 profiles in 5 days; late submissions incur fee reduction' },
                                                { key: 'timer_c_active', label: 'Timer C Active',   desc: 'Client SLA 5 days; breach alerts admin and may free the slot' },
                                            ].map(({ key, label, desc }) => (
                                                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                                                    <input type="checkbox" checked={data[key]} onChange={e => setData(key, e.target.checked)} />
                                                    <div>
                                                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{label}</div>
                                                        <div style={{ fontSize: 11, color: 'var(--ink4)' }}>{desc}</div>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    </Sblock>

                                    {isEdit && (
                                        <Sblock title="📌 Status">
                                            <div className="form-group">
                                                <label style={lbl}>Mandate status</label>
                                                <select className="form-input" style={{ maxWidth: 220 }} value={data.status} onChange={e => setData('status', e.target.value)}>
                                                    {['draft', 'active', 'paused', 'closed', 'filled', 'dropped'].map(s => (
                                                        <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </Sblock>
                                    )}
                                </>
                            )}

                            {/* Submit / Cancel */}
                            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
                                <button type="submit" className="btn btn-primary" disabled={processing}>
                                    {processing ? 'Saving...' : (isEdit ? 'Update mandate' : 'Create mandate')}
                                </button>
                                <a href={route('admin.mandates.index')} className="btn btn-secondary">Cancel</a>
                            </div>
                        </div>

                        {/* ════════ RIGHT — live preview ════════ */}
                        <div style={{ position: 'sticky', top: 76 }}>
                            {/* label */}
                            <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--ink4)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                                <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--jade3)', display: 'inline-block' }} />
                                Live preview
                            </div>

                            {/* role header card */}
                            <div style={{ background: '#fff', border: '1px solid var(--wire)', borderRadius: 'var(--r)', padding: 14, marginBottom: 10, position: 'relative', overflow: 'hidden' }}>
                                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'var(--sea2)' }} />
                                <div style={{ display: 'flex', gap: 10, marginTop: 2 }}>
                                    <div style={{ width: 42, height: 42, borderRadius: 8, background: 'var(--sea-pale)', color: 'var(--sea2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0, border: '1px solid var(--wire)' }}>
                                        {previewClient ? coInitials(previewClient.company_name) : '??'}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: 10, color: 'var(--ink4)', marginBottom: 2 }}>
                                            {previewClient?.company_name || <span style={{ color: 'var(--wire2)' }}>Select a client</span>}
                                            {data.location ? ` — ${data.location}` : ''}
                                        </div>
                                        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--jade3)', display: 'inline-block', flexShrink: 0 }} />
                                            {data.title || <span style={{ color: 'var(--wire2)' }}>Role title…</span>}
                                        </div>
                                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                                            {data.contract_type && <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 20, background: 'var(--mist2)', color: 'var(--ink4)', border: '1px solid var(--wire)' }}>{CONTRACT_OPTS.find(o => o.value === data.contract_type)?.label}</span>}
                                            {data.location && <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 20, background: 'var(--mist2)', color: 'var(--ink4)', border: '1px solid var(--wire)' }}>📍 {data.location}</span>}
                                            {salaryChip && <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 20, background: 'var(--mist2)', color: 'var(--ink4)', border: '1px solid var(--wire)' }}>{salaryChip}</span>}
                                            {data.industry && <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 20, background: 'var(--sea-pale)', color: 'var(--sea)', border: '1px solid #C5DFF5' }}>{data.industry}</span>}
                                            {data.seniority && <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 20, background: 'var(--amber-pale)', color: 'var(--amber2)', border: '1px solid #F5C49A' }}>{SENIORITY_OPTS.find(o => o.value === data.seniority)?.label}</span>}
                                            <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 20, background: 'var(--mist2)', color: 'var(--ink4)', border: '1px solid var(--wire)' }}>👥 {data.openings_count || 1} opening{(data.openings_count || 1) > 1 ? 's' : ''}</span>
                                        </div>
                                        {data.description && (
                                            <div style={{ fontSize: 11, color: 'var(--ink4)', lineHeight: 1.6 }}>
                                                {data.description.slice(0, 140)}{data.description.length > 140 ? '…' : ''}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* must-haves preview */}
                            {data.must_haves.filter(Boolean).length > 0 && (
                                <div style={{ background: '#fff', border: '1px solid var(--wire)', borderRadius: 'var(--r)', padding: '12px 14px', marginBottom: 10 }}>
                                    <div style={{ fontSize: 9, fontWeight: 500, color: 'var(--ink4)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 7 }}>Must-have requirements</div>
                                    {data.must_haves.filter(Boolean).slice(0, 4).map((item, i) => (
                                        <div key={i} style={{ fontSize: 11, color: 'var(--ink)', padding: '2px 0', display: 'flex', alignItems: 'flex-start', gap: 6, lineHeight: 1.5 }}>
                                            <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--sea3)', flexShrink: 0, marginTop: 6 }} />
                                            {item}
                                        </div>
                                    ))}
                                    {data.must_haves.filter(Boolean).length > 4 && (
                                        <div style={{ fontSize: 10, color: 'var(--ink4)', marginTop: 4 }}>+{data.must_haves.filter(Boolean).length - 4} more…</div>
                                    )}
                                </div>
                            )}

                            {/* screening flags preview */}
                            {(data.green_flags.filter(Boolean).length > 0 || data.red_flags.filter(Boolean).length > 0) && (
                                <div style={{ background: '#fff', border: '1px solid var(--wire)', borderRadius: 'var(--r)', padding: '12px 14px', marginBottom: 10 }}>
                                    <div style={{ fontSize: 9, fontWeight: 500, color: 'var(--ink4)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 7 }}>Screening flags</div>
                                    {data.green_flags.filter(Boolean).slice(0, 2).map((f, i) => (
                                        <div key={`g${i}`} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 'var(--rsm)', background: 'var(--jade-pale)', color: 'var(--jade2)', marginBottom: 4 }}>✓ {f}</div>
                                    ))}
                                    {data.red_flags.filter(Boolean).slice(0, 2).map((f, i) => (
                                        <div key={`r${i}`} style={{ fontSize: 11, padding: '3px 8px', borderRadius: 'var(--rsm)', background: 'var(--ruby-pale)', color: 'var(--ruby2)', marginBottom: 4 }}>✕ {f}</div>
                                    ))}
                                </div>
                            )}

                            {/* Q&A count preview */}
                            {data.screening_questions.filter(Boolean).length > 0 && (
                                <div style={{ background: '#fff', border: '1px solid var(--wire)', borderRadius: 'var(--r)', padding: '10px 14px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ fontSize: 16 }}>💬</span>
                                    <span style={{ fontSize: 11, color: 'var(--ink4)' }}>
                                        {data.screening_questions.filter(Boolean).length} screening question{data.screening_questions.filter(Boolean).length !== 1 ? 's' : ''} required
                                    </span>
                                </div>
                            )}

                            {/* ideal source companies preview */}
                            {data.ideal_source_companies.filter(Boolean).length > 0 && (
                                <div style={{ background: '#fff', border: '1px solid var(--wire)', borderRadius: 'var(--r)', padding: '12px 14px', marginBottom: 10 }}>
                                    <div style={{ fontSize: 9, fontWeight: 500, color: 'var(--ink4)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 7 }}>Source companies</div>
                                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                        {data.ideal_source_companies.filter(Boolean).map((co, i) => (
                                            <span key={i} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, background: 'var(--mist2)', color: 'var(--ink4)', border: '1px solid var(--wire)' }}>{co}</span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* ideal candidates preview */}
                            {data.ideal_candidates.filter(ic => ic.name).length > 0 && (
                                <div style={{ background: '#fff', border: '1px solid var(--wire)', borderRadius: 'var(--r)', padding: '12px 14px' }}>
                                    <div style={{ fontSize: 9, fontWeight: 500, color: 'var(--ink4)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 7, display: 'flex', alignItems: 'center', gap: 6 }}>
                                        Ideal candidates
                                        <span style={{ fontSize: 9, background: 'var(--ruby-pale)', color: 'var(--ruby2)', borderRadius: 3, padding: '1px 5px' }}>DO NOT CONTACT</span>
                                    </div>
                                    {data.ideal_candidates.filter(ic => ic.name).slice(0, 3).map((ic, i) => (
                                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--sea-pale)', color: 'var(--sea2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 600, flexShrink: 0 }}>
                                                {(ic.name || '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                                            </div>
                                            <div style={{ minWidth: 0 }}>
                                                <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ic.name}</div>
                                                {ic.title && <div style={{ fontSize: 10, color: 'var(--ink4)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ic.title}</div>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </form>
            </div>
        </AdminLayout>
    )
}
