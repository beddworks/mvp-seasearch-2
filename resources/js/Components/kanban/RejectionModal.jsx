import { useState } from 'react'

const REASONS = [
    { value: 'client',       label: 'Client rejected',       desc: 'Client reviewed and passed on this candidate' },
    { value: 'withdrew',     label: 'Candidate withdrew',    desc: 'Candidate pulled out of the process' },
    { value: 'unsuitable',   label: 'Not suitable for role', desc: "Doesn't meet core requirements" },
    { value: 'compensation', label: 'Compensation mismatch', desc: "Salary expectations couldn't be aligned" },
]

export default function RejectionModal({ submission, onClose, onConfirm }) {
    const [reason, setReason] = useState('')
    const [note,   setNote]   = useState('')

    const c = submission?.candidate ?? {}

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={onClose}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 'var(--r)', border: '1px solid var(--wire)', padding: '20px 22px', width: '100%', maxWidth: 440 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>Reject candidate</div>
                    <button onClick={onClose} style={{ fontSize: 15, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink4)' }}>✕</button>
                </div>
                {c.first_name && (
                    <div style={{ fontSize: 11, color: 'var(--ink4)', marginBottom: 12 }}>{c.first_name} {c.last_name}</div>
                )}
                <div style={{ fontSize: 12, color: 'var(--ink4)', marginBottom: 14 }}>Select a reason — helps track why candidates were removed.</div>

                {REASONS.map(r => (
                    <div key={r.value} onClick={() => setReason(r.value)} style={{
                        display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 12px',
                        borderRadius: 'var(--rsm)', marginBottom: 6, cursor: 'pointer',
                        border: `1px solid ${reason === r.value ? 'var(--ruby2)' : 'var(--wire)'}`,
                        background: reason === r.value ? '#fef2f2' : '#fff',
                    }}>
                        <div style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${reason === r.value ? 'var(--ruby2)' : 'var(--wire)'}`, marginTop: 2, flexShrink: 0, background: reason === r.value ? 'var(--ruby2)' : 'transparent' }} />
                        <div>
                            <div style={{ fontSize: 12, fontWeight: 500, color: reason === r.value ? 'var(--ruby2)' : 'var(--ink)' }}>{r.label}</div>
                            <div style={{ fontSize: 11, color: 'var(--ink4)' }}>{r.desc}</div>
                        </div>
                    </div>
                ))}

                <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 11, color: 'var(--ink4)', marginBottom: 5 }}>Additional note (optional)</div>
                    <textarea value={note} onChange={e => setNote(e.target.value)}
                        placeholder="Add context for future reference…"
                        style={{ width: '100%', padding: '7px 10px', fontSize: 12, border: '1px solid var(--wire)', borderRadius: 'var(--rsm)', resize: 'vertical', minHeight: 56, outline: 'none', fontFamily: 'var(--font)', boxSizing: 'border-box' }} />
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                    <button onClick={() => { if (reason) onConfirm({ type: reason, note }) }}
                        disabled={!reason}
                        style={{ flex: 1, padding: 9, borderRadius: 'var(--rsm)', background: reason ? 'var(--ruby2)' : 'var(--mist2)', color: reason ? '#fff' : 'var(--ink4)', border: 'none', fontSize: 12, fontWeight: 500, cursor: reason ? 'pointer' : 'not-allowed', fontFamily: 'var(--font)' }}>
                        Confirm rejection
                    </button>
                    <button onClick={onClose} style={{ padding: '9px 16px', borderRadius: 'var(--rsm)', background: 'transparent', border: '1px solid var(--wire)', color: 'var(--ink4)', cursor: 'pointer', fontSize: 12 }}>Cancel</button>
                </div>
            </div>
        </div>
    )
}
