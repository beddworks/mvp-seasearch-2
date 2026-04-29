import { Link, useForm, usePage, router } from '@inertiajs/react'
import RecruiterLayout from '@/Layouts/RecruiterLayout'
import { useEffect, useRef, useState } from 'react'

function initials(name) {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function pct(value) {
    const n = Number(value || 0)
    if (!Number.isFinite(n)) return 0
    return Math.max(0, Math.min(100, n))
}

const AVATAR_COLORS = ['#E8F2FB', '#EEE9FB', '#EAF4EB', '#FDF0E8', '#FBE8E8']
const AVATAR_TEXT = ['#0B4F8A', '#2D1F6E', '#1A4D1E', '#7A3B0A', '#7A1A1A']

function colorIdx(id) {
    const num = parseInt((id || '0').replace(/-/g, '').slice(0, 8), 16)
    return num % AVATAR_COLORS.length
}

const TABS = ['Profile', 'CV / AI', 'Notes', 'Roles Submitted', 'Activity']
const STAGES = ['sourced', 'screened']

export default function CandidateShow({ candidate, approvedMandates = [], submissions = [] }) {
    const { flash } = usePage().props
    const [activeTab, setActiveTab] = useState('Profile')
    const [uploading, setUploading] = useState(false)
    const [uploadError, setUploadError] = useState('')
    const [submitLoading, setSubmitLoading] = useState(false)
    const [submitError, setSubmitError] = useState('')
    const [previewError, setPreviewError] = useState('')
    const [previewLoading, setPreviewLoading] = useState(false)
    const [preview, setPreview] = useState(null)
    const fileRef = useRef()

    const [roleData, setRoleData] = useState({
        mandate_id: approvedMandates[0]?.id || '',
        initial_stage: 'sourced',
    })

    const name = `${candidate.first_name} ${candidate.last_name}`
    const idx = colorIdx(candidate.id)

    const { data: noteData, setData: setNoteData, processing: savingNote } = useForm({ notes: candidate.notes || '' })

    const saveNote = () => {
        router.post(route('recruiter.candidates.save-note', candidate.id), { notes: noteData.notes }, {
            preserveState: true,
        })
    }

    const handleCvUpload = async (e) => {
        const file = e.target.files[0]
        if (!file) return
        setUploading(true)
        setUploadError('')
        const fd = new FormData()
        fd.append('cv_file', file)
        fd.append('_token', document.querySelector('meta[name=csrf-token]').content)
        try {
            const res = await fetch(route('recruiter.candidates.upload-cv', candidate.id), {
                method: 'POST',
                body: fd,
            })
            if (!res.ok) throw new Error('Upload failed')
            router.reload({ preserveState: false })
        } catch {
            setUploadError('Upload failed. Please try again.')
        } finally {
            setUploading(false)
        }
    }

    const runMandatePreview = async (mandateId) => {
        if (!mandateId) {
            setPreview(null)
            setPreviewError('')
            return
        }

        setPreviewLoading(true)
        setPreviewError('')

        try {
            const fd = new FormData()
            fd.append('candidate_id', candidate.id)

            const res = await fetch(route('recruiter.mandates.ai-preview', mandateId), {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name=csrf-token]')?.content,
                    Accept: 'application/json',
                },
                body: fd,
            })
            const data = await res.json()

            if (!res.ok || !data?.success) {
                setPreview(null)
                setPreviewError(data?.message || 'Unable to generate AI preview for this role.')
                return
            }

            setPreview(data)
        } catch {
            setPreview(null)
            setPreviewError('Network error while generating AI preview.')
        } finally {
            setPreviewLoading(false)
        }
    }

    useEffect(() => {
        if (activeTab !== 'Roles Submitted') return
        if (!roleData.mandate_id) return
        runMandatePreview(roleData.mandate_id)
    }, [activeTab, roleData.mandate_id])

    const submitToRole = async () => {
        if (!roleData.mandate_id) {
            setSubmitError('Please select a role first.')
            return
        }

        setSubmitLoading(true)
        setSubmitError('')

        try {
            const fd = new FormData()
            fd.append('mandate_id', roleData.mandate_id)
            fd.append('existing_candidate_id', candidate.id)
            fd.append('initial_stage', roleData.initial_stage)

            if (preview?.score) {
                fd.append('ai_data', JSON.stringify({
                    ai_score: preview?.score?.ai_score,
                    score_breakdown: preview?.score?.score_breakdown,
                    green_flags: preview?.score?.green_flags,
                    red_flags: preview?.score?.red_flags,
                    ai_summary: preview?.score?.ai_summary,
                }))
            }

            const res = await fetch(route('recruiter.kanban.add-candidate'), {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name=csrf-token]')?.content,
                    Accept: 'application/json',
                },
                body: fd,
            })
            const data = await res.json()

            if (!res.ok || !data?.success) {
                setSubmitError(data?.message || 'Failed to submit candidate to role.')
                return
            }

            router.reload({ preserveScroll: true, preserveState: true })
        } catch {
            setSubmitError('Network error. Please try again.')
        } finally {
            setSubmitLoading(false)
        }
    }

    const parsed = candidate.parsed_profile || {}
    const skills = candidate.skills || []

    const score = pct(preview?.score?.ai_score)
    const breakdown = preview?.score?.score_breakdown || {}

    return (
        <RecruiterLayout breadcrumb={[
            { label: 'Candidates', href: route('recruiter.candidates.index') },
            { label: name },
        ]}>
            <div style={{ background: '#fff', borderBottom: '1px solid var(--wire)', padding: '16px 22px', flexShrink: 0 }}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 12 }}>
                    <div style={{ width: 52, height: 52, borderRadius: '50%', background: AVATAR_COLORS[idx], color: AVATAR_TEXT[idx], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 500, flexShrink: 0 }}>
                        {initials(name)}
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 17, fontWeight: 500, color: 'var(--ink)', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
                            {name}
                            {candidate.cv_url && <span className="badge badge-jade">✓ CV on file</span>}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--ink4)', marginBottom: 6 }}>
                            {[candidate.current_role, candidate.current_company].filter(Boolean).join(' · ') || 'No current role set'}
                        </div>
                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                            {candidate.location && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'var(--mist2)', color: 'var(--ink4)', border: '1px solid var(--wire)' }}>📍 {candidate.location}</span>}
                            {candidate.years_experience && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'var(--mist2)', color: 'var(--ink4)', border: '1px solid var(--wire)' }}>⏱ {candidate.years_experience} yrs exp</span>}
                            {candidate.linkedin_url && <a href={`https://${candidate.linkedin_url.replace(/^https?:\/\//, '')}`} target="_blank" rel="noreferrer" style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: 'var(--sea-pale)', color: 'var(--sea2)', border: '1px solid var(--sea-soft)', textDecoration: 'none' }}>in LinkedIn</a>}
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        {candidate.email && (
                            <a href={`mailto:${candidate.email}`} className="btn btn-secondary btn-sm">✉ Email</a>
                        )}
                    </div>
                </div>
            </div>

            <div style={{ background: candidate.cv_url ? 'var(--jade-pale)' : 'var(--mist2)', borderBottom: '1px solid var(--wire)', padding: '10px 22px', display: 'flex', alignItems: 'center', gap: 14 }}>
                {candidate.cv_url ? (
                    <>
                        <span style={{ fontSize: 22 }}>📄</span>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)' }}>{candidate.cv_original_name}</div>
                            <div style={{ fontSize: 11, color: 'var(--ink4)' }}>
                                Uploaded {candidate.cv_uploaded_at ? new Date(candidate.cv_uploaded_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
                                {candidate.cv_parsed_at && ' · AI parsed'}
                            </div>
                        </div>
                        <a
                            href={route('recruiter.candidates.download-cv', candidate.id)}
                            target="_blank"
                            rel="noreferrer"
                            style={{ fontSize: 11, color: 'var(--sea2)', textDecoration: 'none', fontWeight: 500, padding: '4px 10px', border: '1px solid var(--sea3)', borderRadius: 6, background: '#fff', flexShrink: 0 }}
                        >
                            Download
                        </a>
                        <button className="btn btn-secondary btn-sm" onClick={() => fileRef.current?.click()}>↑ Replace CV</button>
                    </>
                ) : (
                    <>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12, background: '#fff', border: '1.5px dashed var(--wire2)', borderRadius: 'var(--rsm)', padding: '10px 14px', cursor: 'pointer' }} onClick={() => fileRef.current?.click()}>
                            <span style={{ fontSize: 20 }}>📄</span>
                            <div>
                                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)' }}>Upload CV (PDF or DOCX)</div>
                                <div style={{ fontSize: 11, color: 'var(--ink4)' }}>Click to upload — max 10 MB</div>
                            </div>
                        </div>
                        <button className="btn btn-primary btn-sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                            {uploading ? '⏳ Uploading…' : '↑ Upload CV'}
                        </button>
                    </>
                )}
                <input type="file" ref={fileRef} accept=".pdf,.doc,.docx" style={{ display: 'none' }} onChange={handleCvUpload} />
                {uploadError && <span style={{ fontSize: 11, color: 'var(--ruby2)' }}>{uploadError}</span>}
            </div>

            <div style={{ background: '#fff', borderBottom: '1px solid var(--wire)', padding: '0 22px', display: 'flex' }}>
                {TABS.map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{ padding: '9px 14px', fontSize: 12, color: activeTab === tab ? 'var(--sea2)' : 'var(--ink4)', cursor: 'pointer', marginBottom: -1, background: 'none', border: 'none', borderBottom: activeTab === tab ? '2px solid var(--sea3)' : '2px solid transparent', fontWeight: activeTab === tab ? 500 : 400, fontFamily: 'var(--font)' }}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            <div style={{ padding: 22, overflowY: 'auto', background: '#fff', flex: 1 }}>
                {activeTab === 'Profile' && (
                    <div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 7, marginBottom: 16 }}>
                            {[
                                ['Email', candidate.email || '—'],
                                ['Phone', candidate.phone || '—'],
                                ['Location', candidate.location || '—'],
                                ['Current role', candidate.current_role || '—'],
                                ['Company', candidate.current_company || '—'],
                                ['Experience', candidate.years_experience ? `${candidate.years_experience} years` : '—'],
                            ].map(([lbl, val]) => (
                                <div key={lbl} style={{ border: '1px solid var(--wire)', borderRadius: 'var(--rsm)', padding: '9px 11px' }}>
                                    <div style={{ fontSize: 10, color: 'var(--ink4)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 2 }}>{lbl}</div>
                                    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)' }}>{val}</div>
                                </div>
                            ))}
                        </div>

                        {skills.length > 0 && (
                            <div style={{ marginBottom: 16 }}>
                                <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--ink4)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Skills</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                                    {skills.map((s, i) => (
                                        <span key={i} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 20, background: 'var(--mist2)', color: 'var(--ink4)', border: '1px solid var(--wire)' }}>{s}</span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'CV / AI' && (
                    <div>
                        {!candidate.cv_url ? (
                            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--ink4)' }}>
                                <div style={{ fontSize: 40, marginBottom: 12, opacity: .35 }}>📄</div>
                                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)', marginBottom: 4 }}>No CV uploaded yet</div>
                                <div style={{ fontSize: 12, marginBottom: 16, lineHeight: 1.6 }}>Upload a CV to enable AI parsing and candidate scoring</div>
                                <button className="btn btn-primary btn-sm" onClick={() => fileRef.current?.click()}>↑ Upload CV</button>
                            </div>
                        ) : candidate.cv_parsed_at && parsed ? (
                            <div>
                                <div style={{ background: 'var(--jade-pale)', border: '1px solid var(--jade-soft)', borderRadius: 'var(--rsm)', padding: '10px 14px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <span style={{ fontSize: 18 }}>✓</span>
                                    <div>
                                        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--jade)' }}>CV parsed by AI</div>
                                        <div style={{ fontSize: 11, color: 'var(--jade2)' }}>Profile auto-extracted · {new Date(candidate.cv_parsed_at).toLocaleDateString()}</div>
                                    </div>
                                </div>
                                {parsed.summary && (
                                    <div style={{ fontSize: 12, color: 'var(--ink4)', lineHeight: 1.75, background: 'var(--mist2)', borderLeft: '2px solid var(--violet-soft)', padding: '10px 12px', borderRadius: '0 var(--rsm) var(--rsm) 0', marginBottom: 14 }}>
                                        {parsed.summary}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div style={{ background: 'var(--amber-pale)', border: '1px solid var(--amber-soft)', borderRadius: 'var(--rsm)', padding: '12px 16px', fontSize: 12, color: 'var(--amber2)' }}>
                                ⏳ CV uploaded but not yet parsed. AI parsing is queued and will complete shortly.
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'Notes' && (
                    <div>
                        <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--ink4)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Recruiter notes</div>
                        <textarea
                            className="form-input"
                            value={noteData.notes}
                            onChange={e => setNoteData('notes', e.target.value)}
                            rows={8}
                            placeholder="Add notes about this candidate — sourcing context, interview impressions, follow-up items…"
                            style={{ width: '100%', resize: 'vertical' }}
                        />
                        <button className="btn btn-secondary btn-sm" onClick={saveNote} disabled={savingNote} style={{ marginTop: 8 }}>
                            {savingNote ? 'Saving…' : 'Save notes'}
                        </button>
                    </div>
                )}

                {activeTab === 'Roles Submitted' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 14 }}>
                        <div style={{ border: '1px solid var(--wire)', borderRadius: 'var(--r)', padding: 14 }}>
                            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 10 }}>Submit Candidate to Role</div>

                            {submitError && <div className="flash-error" style={{ marginBottom: 10 }}>{submitError}</div>}

                            <div className="form-group" style={{ marginBottom: 10 }}>
                                <label className="form-label">Role</label>
                                <select className="form-input" value={roleData.mandate_id} onChange={e => setRoleData(prev => ({ ...prev, mandate_id: e.target.value }))}>
                                    <option value="">Select approved role</option>
                                    {approvedMandates.map(m => (
                                        <option key={m.id} value={m.id}>{m.title}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group" style={{ marginBottom: 14 }}>
                                <label className="form-label">Initial stage</label>
                                <select className="form-input" value={roleData.initial_stage} onChange={e => setRoleData(prev => ({ ...prev, initial_stage: e.target.value }))}>
                                    {STAGES.map(stage => (
                                        <option key={stage} value={stage}>{stage.charAt(0).toUpperCase() + stage.slice(1)}</option>
                                    ))}
                                </select>
                            </div>

                            <button className="btn btn-primary" onClick={submitToRole} disabled={submitLoading || !roleData.mandate_id}>
                                {submitLoading ? 'Submitting...' : 'Submit to role'}
                            </button>

                            <div style={{ marginTop: 18, fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>Submission Records</div>
                            <div style={{ marginTop: 8, border: '1px solid var(--wire)', borderRadius: 'var(--rsm)', overflow: 'hidden' }}>
                                {!submissions.length ? (
                                    <div style={{ padding: 12, fontSize: 12, color: 'var(--ink4)' }}>No submissions yet for this candidate.</div>
                                ) : (
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr>
                                                <th style={{ fontSize: 10, color: 'var(--ink4)', textTransform: 'uppercase', textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid var(--wire)' }}>Role</th>
                                                <th style={{ fontSize: 10, color: 'var(--ink4)', textTransform: 'uppercase', textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid var(--wire)' }}>Stage</th>
                                                <th style={{ fontSize: 10, color: 'var(--ink4)', textTransform: 'uppercase', textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid var(--wire)' }}>Status</th>
                                                <th style={{ fontSize: 10, color: 'var(--ink4)', textTransform: 'uppercase', textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid var(--wire)' }}>Date</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {submissions.map(sub => (
                                                <tr key={sub.id}>
                                                    <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--wire)', fontSize: 12 }}>{sub.mandate_title || '—'}</td>
                                                    <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--wire)', fontSize: 12 }}>{(sub.client_status || 'sourced').replace('_', ' ')}</td>
                                                    <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--wire)', fontSize: 12 }}>{sub.admin_review_status || 'pending'}</td>
                                                    <td style={{ padding: '8px 10px', borderBottom: '1px solid var(--wire)', fontSize: 12 }}>{sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString() : '—'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>

                        <div style={{ border: '1px solid var(--wire)', borderRadius: 'var(--r)', padding: 14, position: 'sticky', top: 72, height: 'fit-content' }}>
                            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>AI Match Evaluation</div>
                            <div style={{ fontSize: 11, color: 'var(--ink4)', marginBottom: 12 }}>
                                {approvedMandates.find(m => m.id === roleData.mandate_id)?.title || 'Select a role to preview match'}
                            </div>

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
                                {(preview?.score?.green_flags || []).slice(0, 4).map((flag, i) => (
                                    <span key={i} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: 'var(--jade-pale)', color: 'var(--jade2)' }}>{flag}</span>
                                ))}
                                {(preview?.score?.red_flags || []).slice(0, 3).map((flag, i) => (
                                    <span key={i} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: 'var(--ruby-pale)', color: 'var(--ruby2)' }}>{flag}</span>
                                ))}
                            </div>

                            <div style={{ fontSize: 11, color: 'var(--ink4)', lineHeight: 1.6, background: 'var(--mist2)', border: '1px solid var(--wire)', borderRadius: 'var(--rsm)', padding: '8px 10px' }}>
                                {preview?.score?.ai_summary || 'Select a role to generate live AI matching summary.'}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'Activity' && (
                    <div>
                        <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--ink4)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Activity timeline</div>
                        <div style={{ fontSize: 12, color: 'var(--ink4)' }}>
                            <div style={{ display: 'flex', gap: 9, padding: '8px 0', borderBottom: '1px solid var(--wire)' }}>
                                <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--ink4)', flexShrink: 0, marginTop: 4 }} />
                                <div>
                                    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)' }}>Profile created</div>
                                    <div style={{ fontSize: 11, color: 'var(--ink4)' }}>Added to your pool</div>
                                    <div style={{ fontSize: 10, color: 'var(--wire2)', fontFamily: 'var(--mono)' }}>{new Date(candidate.created_at).toLocaleDateString()}</div>
                                </div>
                            </div>
                            {candidate.cv_uploaded_at && (
                                <div style={{ display: 'flex', gap: 9, padding: '8px 0', borderBottom: '1px solid var(--wire)' }}>
                                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--amber2)', flexShrink: 0, marginTop: 4 }} />
                                    <div>
                                        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)' }}>CV uploaded</div>
                                        <div style={{ fontSize: 11, color: 'var(--ink4)' }}>{candidate.cv_original_name}</div>
                                        <div style={{ fontSize: 10, color: 'var(--wire2)', fontFamily: 'var(--mono)' }}>{new Date(candidate.cv_uploaded_at).toLocaleDateString()}</div>
                                    </div>
                                </div>
                            )}
                            {candidate.cv_parsed_at && (
                                <div style={{ display: 'flex', gap: 9, padding: '8px 0' }}>
                                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--violet2)', flexShrink: 0, marginTop: 4 }} />
                                    <div>
                                        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)' }}>AI parse completed</div>
                                        <div style={{ fontSize: 11, color: 'var(--ink4)' }}>Profile auto-extracted</div>
                                        <div style={{ fontSize: 10, color: 'var(--wire2)', fontFamily: 'var(--mono)' }}>{new Date(candidate.cv_parsed_at).toLocaleDateString()}</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </RecruiterLayout>
    )
}
