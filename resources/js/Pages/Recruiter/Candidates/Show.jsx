import { Link, useForm, usePage, router } from '@inertiajs/react'
import RecruiterLayout from '@/Layouts/RecruiterLayout'
import { useState, useRef } from 'react'

function initials(name) {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

const AVATAR_COLORS = ['#E8F2FB', '#EEE9FB', '#EAF4EB', '#FDF0E8', '#FBE8E8']
const AVATAR_TEXT   = ['#0B4F8A', '#2D1F6E', '#1A4D1E', '#7A3B0A', '#7A1A1A']

function colorIdx(id) {
    const num = parseInt((id || '0').replace(/-/g, '').slice(0, 8), 16)
    return num % AVATAR_COLORS.length
}

const TABS = ['Profile', 'CV / AI', 'Notes', 'Activity']

export default function CandidateShow({ candidate }) {
    const { flash } = usePage().props
    const [activeTab, setActiveTab] = useState('Profile')
    const [uploading, setUploading] = useState(false)
    const [uploadError, setUploadError] = useState('')
    const fileRef = useRef()

    const name = `${candidate.first_name} ${candidate.last_name}`
    const idx  = colorIdx(candidate.id)

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
        } catch (err) {
            setUploadError('Upload failed. Please try again.')
        } finally {
            setUploading(false)
        }
    }

    const parsed = candidate.parsed_profile || {}
    const skills = candidate.skills || []

    return (
        <RecruiterLayout breadcrumb={[
            { label: 'Candidates', href: route('recruiter.candidates.index') },
            { label: name },
        ]}>
            

            {/* Profile Header */}
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

            {/* CV Upload Banner */}
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

            {/* Tabs */}
            <div style={{ background: '#fff', borderBottom: '1px solid var(--wire)', padding: '0 22px', display: 'flex' }}>
                {TABS.map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{ padding: '9px 14px', fontSize: 12, color: activeTab === tab ? 'var(--sea2)' : 'var(--ink4)', cursor: 'pointer', borderBottom: activeTab === tab ? '2px solid var(--sea3)' : '2px solid transparent', marginBottom: -1, background: 'none', border: 'none', borderBottom: activeTab === tab ? '2px solid var(--sea3)' : '2px solid transparent', fontWeight: activeTab === tab ? 500 : 400, fontFamily: 'var(--font)' }}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Tab Panels */}
            <div style={{ padding: 22, overflowY: 'auto', background: '#fff', flex: 1 }}>

                {/* Profile Tab */}
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

                {/* CV / AI Tab */}
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

                {/* Notes Tab */}
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

                {/* Activity Tab */}
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
