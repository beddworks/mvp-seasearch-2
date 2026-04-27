import { Link, router, useForm, usePage } from '@inertiajs/react'
import AdminLayout from '@/Layouts/AdminLayout'
import { useMemo, useRef, useState } from 'react'

function initials(name) {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

const avatarColors = ['#E8F2FB', '#EEE9FB', '#EAF4EB', '#FDF0E8', '#FBE8E8']
const avatarTextColors = ['#0B4F8A', '#2D1F6E', '#1A4D1E', '#7A3B0A', '#7A1A1A']

const FORM_STYLES = {
    card: {
        background: '#fff',
        border: '1px solid var(--wire)',
        borderRadius: 'var(--r)',
        padding: '16px',
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 600,
        color: 'var(--ink)',
        marginBottom: 3,
    },
    sectionSub: {
        fontSize: 12,
        color: 'var(--ink4)',
        marginBottom: 12,
        lineHeight: 1.5,
    },
    row: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 10,
        marginBottom: 10,
    },
}

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

function truncate(text, limit = 95) {
    if (!text) return 'No AI summary yet.'
    return text.length <= limit ? text : `${text.slice(0, limit)}...`
}

export default function CandidatesIndex({ candidates, filters, recruiters = [] }) {
    const { flash } = usePage().props
    const [q, setQ] = useState(filters?.q || '')
    const [recruiterFilter, setRecruiterFilter] = useState(filters?.recruiter_id || '')
    const [previewLoading, setPreviewLoading] = useState(false)
    const [previewError, setPreviewError] = useState('')
    const [preview, setPreview] = useState(null)
    const [dragging, setDragging] = useState(false)
    const [autoFilled, setAutoFilled] = useState({})
    const fileInputRef = useRef(null)

    const { data, setData, post, processing, errors, reset } = useForm({
        recruiter_id: filters?.recruiter_id || '',
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        linkedin_url: '',
        current_role: '',
        current_company: '',
        location: '',
        years_experience: '',
        notes: '',
        cv_file: null,
        ai_data: '',
    })

    const topSkills = useMemo(() => {
        if (!Array.isArray(preview?.candidate?.skills)) return []
        return preview.candidate.skills.slice(0, 8)
    }, [preview])

    const handleSearch = (e) => {
        e.preventDefault()
        router.get(route('admin.candidates.index'), { q, recruiter_id: recruiterFilter }, { preserveState: true })
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        post(route('admin.candidates.store'), {
            forceFormData: true,
            onSuccess: () => {
                reset('first_name', 'last_name', 'email', 'phone', 'linkedin_url', 'current_role', 'current_company', 'location', 'years_experience', 'notes', 'cv_file', 'ai_data')
                setPreview(null)
                setPreviewError('')
                setAutoFilled({})
            },
        })
    }

    const applyPreviewToForm = (payload) => {
        const candidate = payload?.candidate || {}
        const updated = {}

        const map = [
            'first_name',
            'last_name',
            'email',
            'linkedin_url',
            'current_role',
            'current_company',
            'location',
            'years_experience',
        ]

        map.forEach((field) => {
            const incoming = candidate[field]
            const current = data[field]
            if (!current && incoming !== null && incoming !== undefined && `${incoming}`.trim() !== '') {
                setData(field, incoming)
                updated[field] = true
            }
        })

        setAutoFilled(updated)
        setData('ai_data', JSON.stringify(payload?.ai_data || {}))
    }

    const runAiPreview = async (file) => {
        setPreviewLoading(true)
        setPreviewError('')

        try {
            const fd = new FormData()
            fd.append('cv_file', file)
            if (data.first_name) fd.append('first_name', data.first_name)
            if (data.last_name) fd.append('last_name', data.last_name)
            if (data.current_role) fd.append('current_role', data.current_role)
            if (data.current_company) fd.append('current_company', data.current_company)

            const res = await fetch(route('admin.candidates.ai-preview'), {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': csrf(),
                    Accept: 'application/json',
                },
                body: fd,
            })

            const payload = await res.json()
            if (!res.ok || !payload?.success) {
                setPreview(null)
                setPreviewError(payload?.message || 'Unable to parse CV right now.')
                return
            }

            setPreview(payload)
            applyPreviewToForm(payload)
        } catch {
            setPreview(null)
            setPreviewError('Network error while generating AI preview.')
        } finally {
            setPreviewLoading(false)
        }
    }

    const handleCvFile = (file) => {
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

        setData('cv_file', file)
        runAiPreview(file)
    }

    const onDrop = (e) => {
        e.preventDefault()
        e.stopPropagation()
        setDragging(false)
        handleCvFile(e.dataTransfer.files?.[0])
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

    const colorIdx = (id) => {
        const num = parseInt((id || '0').replace(/-/g, '').slice(0, 8), 16)
        return num % avatarColors.length
    }

    return (
        <AdminLayout breadcrumb="Candidates">
            {previewLoading && (
                <div style={AI_OVERLAY.backdrop}>
                    <div style={AI_OVERLAY.card}>
                        <div style={AI_OVERLAY.spinner} />
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>AI processing CV</div>
                        <div style={{ fontSize: 12, color: 'var(--ink4)', lineHeight: 1.6 }}>Extracting profile details and preparing summary. Please wait...</div>
                    </div>
                </div>
            )}

            {flash?.success && (
                <div className="flash-success" style={{ margin: '0 20px 16px' }}>{flash.success}</div>
            )}

            <div style={{ padding: '0 20px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div>
                        <div style={{ fontSize: 18, fontWeight: 600, fontFamily: 'var(--font-head)', color: 'var(--ink)', marginBottom: 2 }}>
                            Candidates
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--ink4)' }}>
                            {candidates.total} candidate{candidates.total !== 1 ? 's' : ''} across recruiters
                        </div>
                    </div>
                    <div className="badge badge-ruby">Admin manage view</div>
                </div>

                <div className="g21" style={{ alignItems: 'start', marginBottom: 14 }}>
                    <div style={FORM_STYLES.card}>
                        <div style={FORM_STYLES.sectionTitle}>Add Candidate</div>
                        <div style={FORM_STYLES.sectionSub}>Drop CV first to auto-fill fields and generate AI summary preview.</div>

                        <form onSubmit={handleSubmit}>
                            <div className="form-group" style={{ marginBottom: 10 }}>
                                <label className="form-label">Assign recruiter *</label>
                                <select
                                    className="form-input"
                                    value={data.recruiter_id}
                                    onChange={e => setData('recruiter_id', e.target.value)}
                                >
                                    <option value="">Select recruiter</option>
                                    {recruiters.map(r => (
                                        <option key={r.id} value={r.id}>{r.name}{r.email ? ` (${r.email})` : ''}</option>
                                    ))}
                                </select>
                                {errors.recruiter_id && <div className="form-error">{errors.recruiter_id}</div>}
                            </div>

                            <div style={{ marginBottom: 12 }}>
                                <label className="form-label" style={{ marginBottom: 6, display: 'block' }}>CV / Resume</label>
                                {data.cv_file ? (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1px solid var(--wire)', borderRadius: 'var(--rsm)', background: 'var(--mist2)' }}>
                                        <div style={{ width: 28, height: 28, borderRadius: 6, border: '1px solid var(--wire)', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>CV</div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{data.cv_file.name}</div>
                                            <div style={{ fontSize: 10, color: 'var(--ink4)' }}>{Math.round(data.cv_file.size / 1024)} KB</div>
                                        </div>
                                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setData('cv_file', null); setData('ai_data', ''); setPreview(null); setAutoFilled({}) }}>Remove</button>
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
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".pdf,.doc,.docx"
                                    style={{ display: 'none' }}
                                    onChange={(e) => handleCvFile(e.target.files?.[0])}
                                />
                                {previewLoading && <div style={{ marginTop: 6, fontSize: 11, color: 'var(--violet2)' }}>Generating AI preview...</div>}
                                {previewError && <div className="form-error" style={{ marginTop: 6 }}>{previewError}</div>}
                            </div>

                            <div style={FORM_STYLES.row}>
                                <div className="form-group">
                                    <label className="form-label">First name * {autoFilled.first_name && <span style={{ color: 'var(--sea2)' }}>(AI)</span>}</label>
                                    <input className="form-input" value={data.first_name} onChange={e => setData('first_name', e.target.value)} placeholder="Sarah" />
                                    {errors.first_name && <div className="form-error">{errors.first_name}</div>}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Last name * {autoFilled.last_name && <span style={{ color: 'var(--sea2)' }}>(AI)</span>}</label>
                                    <input className="form-input" value={data.last_name} onChange={e => setData('last_name', e.target.value)} placeholder="Wong" />
                                    {errors.last_name && <div className="form-error">{errors.last_name}</div>}
                                </div>
                            </div>

                            <div className="form-group" style={{ marginBottom: 10 }}>
                                <label className="form-label">Current role and company</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                    <input className="form-input" value={data.current_role} onChange={e => setData('current_role', e.target.value)} placeholder="CHRO" />
                                    <input className="form-input" value={data.current_company} onChange={e => setData('current_company', e.target.value)} placeholder="OCBC Bank" />
                                </div>
                            </div>

                            <div className="form-group" style={{ marginBottom: 10 }}>
                                <label className="form-label">Email</label>
                                <input className="form-input" type="email" value={data.email} onChange={e => setData('email', e.target.value)} placeholder="sarah@email.com" />
                                {errors.email && <div className="form-error">{errors.email}</div>}
                            </div>

                            <div style={FORM_STYLES.row}>
                                <div className="form-group">
                                    <label className="form-label">LinkedIn URL</label>
                                    <input className="form-input" value={data.linkedin_url} onChange={e => setData('linkedin_url', e.target.value)} placeholder="linkedin.com/in/..." />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Location</label>
                                    <input className="form-input" value={data.location} onChange={e => setData('location', e.target.value)} placeholder="Singapore" />
                                </div>
                            </div>

                            <div style={FORM_STYLES.row}>
                                <div className="form-group">
                                    <label className="form-label">Years experience</label>
                                    <input className="form-input" type="number" min="0" max="60" value={data.years_experience} onChange={e => setData('years_experience', e.target.value)} placeholder="15" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Notes</label>
                                    <input className="form-input" value={data.notes} onChange={e => setData('notes', e.target.value)} placeholder="Optional recruiter notes" />
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: 8 }}>
                                <button type="submit" className="btn btn-primary" disabled={processing} style={{ flex: 1 }}>
                                    {processing ? 'Saving...' : 'Save Candidate'}
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => {
                                        reset()
                                        setData('recruiter_id', filters?.recruiter_id || '')
                                        setPreview(null)
                                        setPreviewError('')
                                        setAutoFilled({})
                                    }}
                                >
                                    Clear
                                </button>
                            </div>
                        </form>
                    </div>

                    <div style={FORM_STYLES.card}>
                        <div style={FORM_STYLES.sectionTitle}>AI CV Summary</div>
                        <div style={FORM_STYLES.sectionSub}>Preview from uploaded CV. Stored automatically when you save this candidate.</div>

                        <div style={{ background: 'var(--mist2)', border: '1px solid var(--wire)', borderRadius: 'var(--rsm)', padding: '10px 12px', fontSize: 12, color: 'var(--ink4)', lineHeight: 1.6, minHeight: 110 }}>
                            {preview?.ai_data?.ai_summary || 'Upload a CV to generate summary and auto-fill candidate details.'}
                        </div>

                        <div style={{ marginTop: 10 }}>
                            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--ink4)', marginBottom: 6 }}>Top Skills</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                                {topSkills.length > 0 ? topSkills.map((skill, i) => (
                                    <span key={`${skill}-${i}`} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 20, background: 'var(--sea-pale)', color: 'var(--sea2)', border: '1px solid var(--wire)' }}>{skill}</span>
                                )) : <span style={{ fontSize: 11, color: 'var(--ink4)' }}>No skills extracted yet.</span>}
                            </div>
                        </div>

                        <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            <div style={{ border: '1px solid var(--wire)', borderRadius: 'var(--rsm)', padding: '8px 9px', background: '#fff' }}>
                                <div style={{ fontSize: 9, color: 'var(--ink4)', textTransform: 'uppercase' }}>Experience</div>
                                <div style={{ fontSize: 12, color: 'var(--ink)' }}>{preview?.candidate?.years_experience ?? '-'} years</div>
                            </div>
                            <div style={{ border: '1px solid var(--wire)', borderRadius: 'var(--rsm)', padding: '8px 9px', background: '#fff' }}>
                                <div style={{ fontSize: 9, color: 'var(--ink4)', textTransform: 'uppercase' }}>Location</div>
                                <div style={{ fontSize: 12, color: 'var(--ink)' }}>{preview?.candidate?.location || '-'}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#fff', border: '1px solid var(--wire)', borderRadius: 7, padding: '0 12px', height: 36, flex: 1 }}>
                        <span style={{ color: 'var(--ink4)', fontSize: 13 }}>⌕</span>
                        <input
                            type="text"
                            value={q}
                            onChange={e => setQ(e.target.value)}
                            placeholder="Search by name, role, company..."
                            style={{ border: 'none', background: 'transparent', fontSize: 12, width: '100%', outline: 'none', fontFamily: 'var(--font)', color: 'var(--ink)' }}
                        />
                    </div>
                    <select
                        className="form-input"
                        value={recruiterFilter}
                        onChange={e => setRecruiterFilter(e.target.value)}
                        style={{ maxWidth: 280 }}
                    >
                        <option value="">All recruiters</option>
                        {recruiters.map(r => (
                            <option key={r.id} value={r.id}>{r.name}{r.email ? ` (${r.email})` : ''}</option>
                        ))}
                    </select>
                    <button type="submit" className="btn btn-secondary btn-sm">Search</button>
                </form>

                {candidates.data.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--ink4)' }}>
                        <div style={{ fontSize: 36, marginBottom: 12, opacity: .35 }}>◉</div>
                        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)', marginBottom: 4 }}>No candidates yet</div>
                        <div style={{ fontSize: 12, marginBottom: 16 }}>Add your first candidate with CV autofill above.</div>
                    </div>
                ) : (
                    <div className="table-wrap">
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--wire)' }}>
                                    {['Candidate', 'Current role', 'AI summary', 'CV', 'Added'].map(h => (
                                        <th key={h} style={{ padding: '9px 14px', fontSize: 10, fontWeight: 500, color: 'var(--ink4)', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '.05em' }}>{h}</th>
                                    ))}
                                    <th style={{ padding: '9px 14px' }} />
                                </tr>
                            </thead>
                            <tbody>
                                {candidates.data.map((c) => {
                                    const idx = colorIdx(c.id)
                                    const name = `${c.first_name} ${c.last_name}`
                                    return (
                                        <tr key={c.id} style={{ borderBottom: '1px solid var(--wire)' }}>
                                            <td style={{ padding: '10px 14px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: avatarColors[idx], color: avatarTextColors[idx], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 500, flexShrink: 0 }}>
                                                        {initials(name)}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{name}</div>
                                                        {c.email && <div style={{ fontSize: 11, color: 'var(--ink4)' }}>{c.email}</div>}
                                                        <div style={{ fontSize: 10, color: 'var(--ink4)' }}>{c.recruiter?.user?.name || 'Unassigned recruiter'}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--ink4)' }}>
                                                {[c.current_role, c.current_company].filter(Boolean).join(' · ') || '—'}
                                            </td>
                                            <td style={{ padding: '10px 14px', fontSize: 11, color: 'var(--ink4)', maxWidth: 280 }}>
                                                {truncate(c.ai_summary || c.parsed_profile?.summary)}
                                            </td>
                                            <td style={{ padding: '10px 14px' }}>
                                                {c.cv_url
                                                    ? <span className="badge badge-jade">✓ CV uploaded</span>
                                                    : <span className="badge badge-amber">No CV</span>
                                                }
                                            </td>
                                            <td style={{ padding: '10px 14px', fontSize: 11, color: 'var(--ink4)', fontFamily: 'var(--mono)' }}>
                                                {new Date(c.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </td>
                                            <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                                                <Link href={route('admin.candidates.show', c.id)} className="btn btn-secondary btn-sm">
                                                    View →
                                                </Link>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>

                        {candidates.links && candidates.last_page > 1 && (
                            <div style={{ padding: '12px 14px', display: 'flex', gap: 6 }}>
                                {candidates.links.map((link, i) => (
                                    <Link
                                        key={i}
                                        href={link.url || '#'}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                        style={{
                                            padding: '4px 10px', fontSize: 11, borderRadius: 5,
                                            background: link.active ? 'var(--sea2)' : 'transparent',
                                            color: link.active ? '#fff' : link.url ? 'var(--sea2)' : 'var(--ink4)',
                                            border: '1px solid ' + (link.active ? 'var(--sea2)' : 'var(--wire)'),
                                            pointerEvents: link.url ? 'auto' : 'none', textDecoration: 'none',
                                        }}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </AdminLayout>
    )
}
