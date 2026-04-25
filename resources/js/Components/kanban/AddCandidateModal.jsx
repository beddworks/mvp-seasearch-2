import { useRef, useState } from 'react'

const csrf = () => document.querySelector('meta[name=csrf-token]')?.content

const STAGES = ['sourced', 'screened']

export default function AddCandidateModal({ mandateId, onClose, onSuccess, routeBase = 'recruiter.kanban' }) {
    const [form, setForm] = useState({
        first_name: '', last_name: '', email: '',
        linkedin_url: '', current_role: '', current_company: '',
        initial_stage: 'sourced',
    })
    const [cvFile, setCvFile]       = useState(null)
    const [dragging, setDragging]   = useState(false)
    const [loading, setLoading]     = useState(false)
    const [error, setError]         = useState('')
    const fileRef = useRef()

    function f(k, v) { setForm(p => ({ ...p, [k]: v })) }

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
    }

    function onDrop(e) {
        e.preventDefault(); setDragging(false)
        handleFile(e.dataTransfer.files[0])
    }

    function handleSubmit() {
        if (!form.first_name || !form.last_name) { setError('First and last name are required.'); return }
        setLoading(true); setError('')

        const fd = new FormData()
        Object.entries(form).forEach(([k, v]) => fd.append(k, v))
        fd.append('mandate_id', mandateId)
        if (cvFile) fd.append('cv_file', cvFile)

        fetch(route(routeBase + '.add-candidate'), {
            method: 'POST',
            headers: { 'X-CSRF-TOKEN': csrf() },
            body: fd,
        })
            .then(r => r.json())
            .then(d => {
                if (d.success) onSuccess(d.submission)
                else setError(d.message ?? 'Failed to add candidate.')
            })
            .catch(() => setError('Network error. Please try again.'))
            .finally(() => setLoading(false))
    }

    const scoreHint = cvFile
        ? <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--violet2)' }}>
            <span style={{ width: 14, height: 14, borderRadius: '50%', background: 'var(--violet-pale)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9 }}>⚙</span>
            AI match score will be generated after adding
          </div>
        : null

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(13,12,10,.45)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 'var(--r)', border: '1px solid var(--wire)', width: '100%', maxWidth: 500, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,.12)' }}>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--wire)' }}>
                    <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', fontFamily: 'var(--font-head)' }}>Add candidate to pipeline</div>
                        <div style={{ fontSize: 11, color: 'var(--ink4)', marginTop: 2 }}>Upload CV for automatic AI match scoring</div>
                    </div>
                    <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: '50%', border: '1px solid var(--wire)', background: 'var(--mist2)', cursor: 'pointer', fontSize: 13, color: 'var(--ink4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                </div>

                <div style={{ padding: '18px 20px' }}>
                    {error && (
                        <div style={{ background: '#FBE8E8', border: '1px solid #F7C1C1', borderRadius: 'var(--rsm)', padding: '8px 12px', fontSize: 12, color: 'var(--ruby2)', marginBottom: 14, display: 'flex', gap: 7, alignItems: 'flex-start' }}>
                            <span>⚠</span> {error}
                        </div>
                    )}

                    {/* Name row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                        <div className="form-group">
                            <label className="form-label">First name <span style={{ color: 'var(--ruby2)' }}>*</span></label>
                            <input className="form-input" value={form.first_name} onChange={e => f('first_name', e.target.value)} placeholder="Sarah" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Last name <span style={{ color: 'var(--ruby2)' }}>*</span></label>
                            <input className="form-input" value={form.last_name} onChange={e => f('last_name', e.target.value)} placeholder="Wong" />
                        </div>
                    </div>

                    {/* Role / Company */}
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

                    {/* Email */}
                    <div className="form-group" style={{ marginBottom: 10 }}>
                        <label className="form-label">Email</label>
                        <input className="form-input" type="email" value={form.email} onChange={e => f('email', e.target.value)} placeholder="sarah@example.com" />
                    </div>

                    {/* LinkedIn */}
                    <div className="form-group" style={{ marginBottom: 14 }}>
                        <label className="form-label">LinkedIn</label>
                        <input className="form-input" value={form.linkedin_url} onChange={e => f('linkedin_url', e.target.value)} placeholder="linkedin.com/in/…" />
                    </div>

                    {/* CV Upload */}
                    <div style={{ marginBottom: 14 }}>
                        <label className="form-label" style={{ marginBottom: 6, display: 'block' }}>
                            CV / Résumé
                            <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--ink4)', fontWeight: 400 }}>PDF, DOC, DOCX · max 10 MB</span>
                        </label>
                        {cvFile ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--jade-pale)', border: '1px solid var(--jade3)', borderRadius: 'var(--rsm)' }}>
                                <span style={{ fontSize: 18 }}>📄</span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--jade2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cvFile.name}</div>
                                    <div style={{ fontSize: 10, color: 'var(--ink4)' }}>{(cvFile.size / 1024).toFixed(0)} KB</div>
                                </div>
                                <button onClick={() => setCvFile(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--ink4)', padding: '2px 6px' }}>✕</button>
                            </div>
                        ) : (
                            <div
                                onDragOver={e => { e.preventDefault(); setDragging(true) }}
                                onDragLeave={() => setDragging(false)}
                                onDrop={onDrop}
                                onClick={() => fileRef.current?.click()}
                                style={{
                                    border: `2px dashed ${dragging ? 'var(--sea3)' : 'var(--wire2)'}`,
                                    borderRadius: 'var(--rsm)',
                                    padding: '20px 16px',
                                    textAlign: 'center',
                                    background: dragging ? 'var(--sea-pale)' : 'var(--mist2)',
                                    cursor: 'pointer',
                                    transition: 'all .15s',
                                }}
                            >
                                <div style={{ fontSize: 22, marginBottom: 6 }}>📎</div>
                                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)' }}>Drop file here or <span style={{ color: 'var(--sea2)', textDecoration: 'underline' }}>browse</span></div>
                                <div style={{ fontSize: 11, color: 'var(--ink4)', marginTop: 3 }}>PDF, DOC or DOCX · AI will score after upload</div>
                            </div>
                        )}
                        <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
                        {scoreHint}
                    </div>

                    {/* Initial stage */}
                    <div className="form-group" style={{ marginBottom: 20 }}>
                        <label className="form-label">Initial stage</label>
                        <select className="form-input" value={form.initial_stage} onChange={e => f('initial_stage', e.target.value)}>
                            {STAGES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                        </select>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button
                            className="btn btn-primary"
                            style={{ flex: 1 }}
                            onClick={handleSubmit}
                            disabled={loading || !form.first_name || !form.last_name}
                        >
                            {loading ? '⟳ Adding…' : (cvFile ? '+ Add & score with AI' : '+ Add to pipeline')}
                        </button>
                        <button className="btn btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
                    </div>
                </div>
            </div>
        </div>
    )
}
