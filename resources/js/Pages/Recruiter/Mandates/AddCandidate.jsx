import RecruiterLayout from '@/Layouts/RecruiterLayout'
import { Link, router } from '@inertiajs/react'
import { useEffect, useMemo, useRef, useState } from 'react'

const csrf = () => document.querySelector('meta[name=csrf-token]')?.content
const STAGES = ['sourced', 'screened']

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

function pct(value) {
    const n = Number(value || 0)
    if (!Number.isFinite(n)) return 0
    return Math.max(0, Math.min(100, n))
}

export default function AddCandidatePage({ mandate, candidates = [] }) {
    const [mode, setMode] = useState('new')
    const [loading, setLoading] = useState(false)
    const [previewLoading, setPreviewLoading] = useState(false)
    const [error, setError] = useState('')
    const [previewError, setPreviewError] = useState('')
    const [preview, setPreview] = useState(null)
    const [dragging, setDragging] = useState(false)
    const fileInputRef = useRef(null)
    const previewRequestRef = useRef(0)

    const [form, setForm] = useState({
        first_name: '',
        last_name: '',
        email: '',
        linkedin_url: '',
        current_role: '',
        current_company: '',
        initial_stage: 'sourced',
        existing_candidate_id: '',
    })

    const [cvFile, setCvFile] = useState(null)
    const [aiData, setAiData] = useState(null) // Store AI results for submission
    const [autoFilledFields, setAutoFilledFields] = useState({}) // Track which fields were auto-filled

    const selectedCandidate = useMemo(
        () => candidates.find(c => c.id === form.existing_candidate_id) || null,
        [candidates, form.existing_candidate_id]
    )

    function f(key, value) {
        setForm(prev => ({ ...prev, [key]: value }))
    }

    async function triggerPreview(payloadBuilder) {
        const requestId = ++previewRequestRef.current
        setPreviewLoading(true)
        setPreviewError('')

        try {
            const fd = payloadBuilder()
            const res = await fetch(route('recruiter.mandates.ai-preview', mandate.id), {
                method: 'POST',
                headers: { 'X-CSRF-TOKEN': csrf(), Accept: 'application/json' },
                body: fd,
            })
            const data = await res.json()

            if (requestId !== previewRequestRef.current) return

            if (!res.ok || !data?.success) {
                setPreview(null)
                setPreviewError(data?.message || 'Unable to generate AI preview right now.')
                return
            }

            setPreview(data)
            setAiData({
                ai_score: data?.score?.ai_score,
                score_breakdown: data?.score?.score_breakdown,
                green_flags: data?.score?.green_flags,
                red_flags: data?.score?.red_flags,
                ai_summary: data?.score?.ai_summary,
            })

            // Smart auto-fill: use parsed_profile for accuracy, prioritize CV-extracted data
            const parsed = data?.parsed_profile || {}
            const cand = data?.candidate || {}
            const filled = {}

            // Auto-fill only truly empty fields (no placeholder, no user input)
            if (!form.first_name && parsed.name) {
                const [first, ...last] = parsed.name.split(' ')
                f('first_name', first || cand.first_name)
                filled.first_name = true
            } else if (!form.first_name && cand.first_name) {
                f('first_name', cand.first_name)
                filled.first_name = true
            }

            if (!form.last_name && parsed.name && parsed.name.includes(' ')) {
                const parts = parsed.name.split(' ')
                f('last_name', parts.slice(1).join(' ') || cand.last_name)
                filled.last_name = true
            } else if (!form.last_name && cand.last_name) {
                f('last_name', cand.last_name)
                filled.last_name = true
            }

            if (!form.email && parsed.email) {
                f('email', parsed.email)
                filled.email = true
            } else if (!form.email && cand.email) {
                f('email', cand.email)
                filled.email = true
            }

            if (!form.linkedin_url && parsed.linkedin_url) {
                f('linkedin_url', parsed.linkedin_url)
                filled.linkedin_url = true
            } else if (!form.linkedin_url && cand.linkedin_url) {
                f('linkedin_url', cand.linkedin_url)
                filled.linkedin_url = true
            }

            if (!form.current_role && parsed.current_role) {
                f('current_role', parsed.current_role)
                filled.current_role = true
            } else if (!form.current_role && cand.current_role) {
                f('current_role', cand.current_role)
                filled.current_role = true
            }

            if (!form.current_company && parsed.current_company) {
                f('current_company', parsed.current_company)
                filled.current_company = true
            } else if (!form.current_company && cand.current_company) {
                f('current_company', cand.current_company)
                filled.current_company = true
            }

            setAutoFilledFields(filled)
        } catch {
            if (requestId !== previewRequestRef.current) return
            setPreview(null)
            setPreviewError('Network error while generating AI preview.')
        } finally {
            if (requestId !== previewRequestRef.current) return
            setPreviewLoading(false)
        }
    }

    function handleFile(file) {
        if (!file) return

        const ext = file.name.split('.').pop().toLowerCase()
        if (!['pdf', 'doc', 'docx'].includes(ext)) {
            setError('Only PDF, DOC or DOCX files are accepted.')
            return
        }
        if (file.size > 10 * 1024 * 1024) {
            setError('File must be under 10 MB.')
            return
        }

        setError('')
        setCvFile(file)

        triggerPreview(() => {
            const fd = new FormData()
            fd.append('cv_file', file)
            fd.append('first_name', form.first_name || 'New')
            fd.append('last_name', form.last_name || 'Candidate')
            if (form.current_role) fd.append('current_role', form.current_role)
            if (form.current_company) fd.append('current_company', form.current_company)
            return fd
        })
    }

    function onDrop(e) {
        e.preventDefault()
        e.stopPropagation()
        setDragging(false)
        handleFile(e.dataTransfer.files[0])
    }

    function onDragOver(e) {
        e.preventDefault()
        e.stopPropagation()
        setDragging(true)
    }

    function onDragLeave(e) {
        e.preventDefault()
        e.stopPropagation()
        setDragging(false)
    }

    function browseFile() {
        fileInputRef.current?.click()
    }

    function onSelectExisting(candidateId) {
        f('existing_candidate_id', candidateId)
    }

    useEffect(() => {
        if (mode !== 'existing') return

        const candidateId = form.existing_candidate_id
        if (!candidateId) {
            previewRequestRef.current += 1
            setPreview(null)
            setAiData(null)
            setPreviewError('')
            setPreviewLoading(false)
            return
        }

        setPreview(null)
        triggerPreview(() => {
            const fd = new FormData()
            fd.append('candidate_id', candidateId)
            return fd
        })
    }, [mode, form.existing_candidate_id])

    async function handleSubmit() {
        if (mode === 'new' && (!form.first_name || !form.last_name)) {
            setError('First and last name are required for a new candidate.')
            return
        }
        if (mode === 'existing' && !form.existing_candidate_id) {
            setError('Please select an existing candidate.')
            return
        }

        setLoading(true)
        setError('')

        try {
            const fd = new FormData()
            fd.append('mandate_id', mandate.id)
            fd.append('initial_stage', form.initial_stage)

            if (mode === 'existing') {
                fd.append('existing_candidate_id', form.existing_candidate_id)
            } else {
                fd.append('first_name', form.first_name)
                fd.append('last_name', form.last_name)
                if (form.email) fd.append('email', form.email)
                if (form.linkedin_url) fd.append('linkedin_url', form.linkedin_url)
                if (form.current_role) fd.append('current_role', form.current_role)
                if (form.current_company) fd.append('current_company', form.current_company)
                if (cvFile) fd.append('cv_file', cvFile)
            }

            // Include AI data from preview
            if (aiData) {
                fd.append('ai_data', JSON.stringify(aiData))
            }

            const res = await fetch(route('recruiter.kanban.add-candidate'), {
                method: 'POST',
                headers: { 'X-CSRF-TOKEN': csrf(), Accept: 'application/json' },
                body: fd,
            })
            const data = await res.json()

            if (!res.ok || !data?.success) {
                setError(data?.message || 'Failed to add candidate.')
                return
            }

            router.visit(route('recruiter.mandates.workspace', mandate.id), {
                preserveScroll: false,
            })
        } catch {
            setError('Network error. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const breakdown = preview?.score?.score_breakdown || {}
    const score = pct(preview?.score?.ai_score)

    return (
        <RecruiterLayout breadcrumb={[{ label: 'Job listings', href: route('recruiter.mandates.index') }, { label: mandate.title }, { label: 'Add candidate' }]}>
            {previewLoading && (
                <div style={AI_OVERLAY.backdrop}>
                    <div style={AI_OVERLAY.card}>
                        <div style={AI_OVERLAY.spinner} />
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>AI processing CV</div>
                        <div style={{ fontSize: 12, color: 'var(--ink4)', lineHeight: 1.6 }}>Parsing profile and matching candidate to this job. Please wait...</div>
                    </div>
                </div>
            )}

            <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px 20px' }}>
                <div style={{ marginBottom: 14 }}>
                    <Link href={route('recruiter.mandates.workspace', mandate.id)} style={{ fontSize: 12, color: 'var(--ink4)', textDecoration: 'none' }}>← Back to workspace</Link>
                </div>

                <div style={{ background: '#fff', border: '1px solid var(--wire)', borderRadius: 'var(--r)', padding: '14px 16px', marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', fontFamily: 'var(--font-head)' }}>Add candidate to pipeline</div>
                        <div style={{ fontSize: 12, color: 'var(--ink4)', marginTop: 2 }}>Upload CV at the top or choose an existing candidate to instantly run AI match against this role.</div>
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--ink4)', textTransform: 'uppercase', letterSpacing: '.05em' }}>{mandate.title}</div>
                </div>

                <div className="g21" style={{ alignItems: 'start' }}>
                    <div style={{ background: '#fff', border: '1px solid var(--wire)', borderRadius: 'var(--r)', padding: 16 }}>
                        {error && <div className="flash-error" style={{ marginBottom: 12 }}>{error}</div>}

                        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                            <button className={mode === 'new' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'} onClick={() => { setMode('new'); setPreview(null); setPreviewError('') }}>New candidate</button>
                            <button className={mode === 'existing' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'} onClick={() => { setMode('existing'); setPreview(null); setPreviewError('') }}>Existing candidate</button>
                        </div>

                        {mode === 'new' && (
                            <>
                                <div style={{ marginBottom: 14 }}>
                                    <label className="form-label" style={{ marginBottom: 6, display: 'block' }}>CV / Resume (top priority)</label>
                                    {cvFile ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--jade-pale)', border: '1px solid var(--jade-soft)', borderRadius: 'var(--rsm)' }}>
                                            <div style={{ width: 28, height: 28, borderRadius: 6, background: '#fff', border: '1px solid var(--wire)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>CV</div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--jade2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cvFile.name}</div>
                                                <div style={{ fontSize: 10, color: 'var(--ink4)' }}>{(cvFile.size / 1024).toFixed(0)} KB</div>
                                            </div>
                                            <button className="btn btn-secondary btn-sm" onClick={() => setCvFile(null)}>Remove</button>
                                        </div>
                                    ) : (
                                        <div
                                            onDrop={onDrop}
                                            onDragEnter={onDragOver}
                                            onDragOver={onDragOver}
                                            onDragLeave={onDragLeave}
                                            onClick={browseFile}
                                            style={{
                                                border: `2px dashed ${dragging ? 'var(--sea3)' : 'var(--wire2)'}`,
                                                borderRadius: 'var(--rsm)',
                                                padding: '18px 14px',
                                                textAlign: 'center',
                                                display: 'block',
                                                background: dragging ? 'var(--sea-pale)' : 'var(--mist2)',
                                                cursor: 'pointer',
                                                transition: 'all .15s ease',
                                            }}
                                        >
                                            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)' }}>Drop file here or browse</div>
                                            <div style={{ fontSize: 11, color: 'var(--ink4)', marginTop: 3 }}>PDF, DOC, DOCX · max 10 MB</div>
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept=".pdf,.doc,.docx"
                                                style={{ display: 'none' }}
                                                onChange={e => handleFile(e.target.files?.[0])}
                                            />
                                        </div>
                                    )}
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                                    <div className="form-group">
                                        <label className="form-label">First name *</label>
                                        <input className="form-input" value={form.first_name} onChange={e => f('first_name', e.target.value)} placeholder="Sarah" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Last name *</label>
                                        <input className="form-input" value={form.last_name} onChange={e => f('last_name', e.target.value)} placeholder="Wong" />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                                    <div className="form-group">
                                        <label className="form-label">Current role</label>
                                        <input className="form-input" value={form.current_role} onChange={e => f('current_role', e.target.value)} placeholder="CHRO" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Company</label>
                                        <input className="form-input" value={form.current_company} onChange={e => f('current_company', e.target.value)} placeholder="OCBC Bank" />
                                    </div>
                                </div>

                                <div className="form-group" style={{ marginBottom: 10 }}>
                                    <label className="form-label">Email</label>
                                    <input className="form-input" type="email" value={form.email} onChange={e => f('email', e.target.value)} placeholder="sarah@example.com" />
                                </div>
                                <div className="form-group" style={{ marginBottom: 14 }}>
                                    <label className="form-label">LinkedIn URL</label>
                                    <input className="form-input" value={form.linkedin_url} onChange={e => f('linkedin_url', e.target.value)} placeholder="linkedin.com/in/..." />
                                </div>
                            </>
                        )}

                        {mode === 'existing' && (
                            <div className="form-group" style={{ marginBottom: 14 }}>
                                <label className="form-label">Select existing candidate</label>
                                <select className="form-input" value={form.existing_candidate_id} onChange={e => onSelectExisting(e.target.value)}>
                                    <option value="">Choose from database</option>
                                    {candidates.map(c => (
                                        <option key={c.id} value={c.id}>
                                            {c.first_name} {c.last_name}{c.current_role ? ` - ${c.current_role}` : ''}{c.current_company ? `, ${c.current_company}` : ''}
                                        </option>
                                    ))}
                                </select>
                                {selectedCandidate && (
                                    <div style={{ fontSize: 11, color: 'var(--ink4)', marginTop: 5 }}>
                                        {selectedCandidate.cv_url ? 'CV found. AI preview is running against job requirements.' : 'No CV found. AI preview will use candidate profile fields.'}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="form-group" style={{ marginBottom: 18 }}>
                            <label className="form-label">Initial stage</label>
                            <select className="form-input" value={form.initial_stage} onChange={e => f('initial_stage', e.target.value)}>
                                {STAGES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                            </select>
                        </div>

                        <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSubmit} disabled={loading}>
                                {loading ? 'Adding candidate...' : '+ Add to pipeline'}
                            </button>
                            <Link className="btn btn-secondary" href={route('recruiter.mandates.workspace', mandate.id)}>Cancel</Link>
                        </div>
                    </div>

                    <div style={{ background: '#fff', border: '1px solid var(--wire)', borderRadius: 'var(--r)', padding: 16, position: 'sticky', top: 72 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>AI Match Evaluation</div>
                        <div style={{ fontSize: 11, color: 'var(--ink4)', marginBottom: 12 }}>Role: {mandate.title}</div>

                        {previewLoading && <div style={{ fontSize: 12, color: 'var(--violet2)', marginBottom: 10 }}>Generating AI match score...</div>}
                        {previewError && <div className="flash-error" style={{ marginBottom: 10 }}>{previewError}</div>}

                        <div style={{ width: 88, height: 88, borderRadius: '50%', border: '5px solid var(--wire)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontFamily: 'var(--font-head)', fontSize: 26, color: score >= 80 ? 'var(--jade2)' : score >= 60 ? 'var(--amber2)' : 'var(--ruby2)' }}>
                            {preview ? score : '—'}
                        </div>

                        <div style={{ display: 'grid', gap: 6, marginBottom: 12 }}>
                            {[
                                ['experience', 'Experience', 'var(--sea3)'],
                                ['industry_fit', 'Industry fit', 'var(--jade2)'],
                                ['scope_match', 'Scope match', 'var(--violet2)'],
                                ['leadership', 'Leadership', 'var(--amber2)'],
                            ].map(([k, label, color]) => (
                                <div key={k}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--ink4)', marginBottom: 2 }}>
                                        <span>{label}</span>
                                        <span>{pct(breakdown[k])}%</span>
                                    </div>
                                    <div style={{ height: 5, background: 'var(--mist2)', borderRadius: 3 }}>
                                        <div style={{ width: `${pct(breakdown[k])}%`, height: 5, borderRadius: 3, background: color }} />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
                            {(preview?.score?.green_flags || []).slice(0, 4).map((f, i) => (
                                <span key={i} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: 'var(--jade-pale)', color: 'var(--jade2)' }}>{f}</span>
                            ))}
                            {(preview?.score?.red_flags || []).slice(0, 3).map((f, i) => (
                                <span key={i} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: 'var(--ruby-pale)', color: 'var(--ruby2)' }}>{f}</span>
                            ))}
                        </div>

                        <div style={{ fontSize: 11, color: 'var(--ink4)', lineHeight: 1.6, background: 'var(--mist2)', border: '1px solid var(--wire)', borderRadius: 'var(--rsm)', padding: '8px 10px' }}>
                            {preview?.score?.ai_summary || 'Upload CV or select existing candidate to generate live AI matching summary.'}
                        </div>
                    </div>
                </div>
            </div>

            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </RecruiterLayout>
    )
}
