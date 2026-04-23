import { useState } from 'react'

const csrf = () => document.querySelector('meta[name=csrf-token]')?.content

export default function SubmitToClientModal({ submission, onClose, onSuccess, routeBase = 'recruiter.kanban' }) {
    const [note, setNote]     = useState(submission.recruiter_note ?? '')
    const [loading, setLoading] = useState(false)
    const [error, setError]   = useState('')

    const c = submission?.candidate ?? {}

    function handleSubmit() {
        setLoading(true)
        setError('')
        fetch(route(routeBase + '.submit-to-client'), {
            method: 'POST',
            headers: { 'X-CSRF-TOKEN': csrf(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ submission_id: submission.id, recruiter_note: note }),
        })
            .then(r => r.json())
            .then(d => {
                if (d.success) onSuccess(d)
                else setError(d.error ?? 'Failed.')
            })
            .catch(() => setError('Network error.'))
            .finally(() => setLoading(false))
    }

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 'var(--r)', border: '1px solid var(--wire)', padding: '20px 22px', width: '100%', maxWidth: 440 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>Submit to client</div>
                    <button onClick={onClose} style={{ fontSize: 15, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink4)' }}>✕</button>
                </div>

                {c.first_name && (
                    <div style={{ background: 'var(--mist2)', border: '1px solid var(--wire)', borderRadius: 'var(--rsm)', padding: '8px 12px', marginBottom: 14, fontSize: 12, color: 'var(--ink)' }}>
                        Submitting <strong>{c.first_name} {c.last_name}</strong> for admin review before client sees the profile.
                    </div>
                )}

                {error && <div style={{ background: '#fef2f2', border: '1px solid var(--ruby2)', borderRadius: 'var(--rsm)', padding: '8px 12px', fontSize: 12, color: 'var(--ruby2)', marginBottom: 12 }}>{error}</div>}

                <div className="form-group">
                    <label className="form-label">Recruiter note (shown to admin & client)</label>
                    <textarea className="form-input" rows={3} value={note} onChange={e => setNote(e.target.value)}
                        placeholder="Why this candidate is a strong fit…"
                        style={{ resize: 'vertical' }} />
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                    <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSubmit} disabled={loading}>
                        {loading ? 'Submitting…' : 'Submit for review →'}
                    </button>
                    <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                </div>
            </div>
        </div>
    )
}
