import { Link, router, useForm, usePage } from '@inertiajs/react'
import RecruiterLayout from '@/Layouts/RecruiterLayout'
import { useState } from 'react'

function initials(name) {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

const avatarColors = ['#E8F2FB', '#EEE9FB', '#EAF4EB', '#FDF0E8', '#FBE8E8']
const avatarTextColors = ['#0B4F8A', '#2D1F6E', '#1A4D1E', '#7A3B0A', '#7A1A1A']

export default function CandidatesIndex({ candidates, filters }) {
    const { flash } = usePage().props
    const [showAdd, setShowAdd] = useState(false)
    const [q, setQ] = useState(filters?.q || '')

    const { data, setData, post, processing, errors, reset } = useForm({
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
    })

    const handleSearch = (e) => {
        e.preventDefault()
        router.get(route('recruiter.candidates.index'), { q }, { preserveState: true })
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        post(route('recruiter.candidates.store'), {
            onSuccess: () => { reset(); setShowAdd(false) }
        })
    }

    const colorIdx = (id) => {
        const num = parseInt((id || '0').replace(/-/g, '').slice(0, 8), 16)
        return num % avatarColors.length
    }

    return (
        <RecruiterLayout breadcrumb="Candidates">
            {flash?.success && (
                <div className="flash-success" style={{ margin: '0 20px 16px' }}>{flash.success}</div>
            )}

            <div style={{ padding: '0 20px 20px' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div>
                        <div style={{ fontSize: 18, fontWeight: 600, fontFamily: 'var(--font-head)', color: 'var(--ink)', marginBottom: 2 }}>
                            My Candidates
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--ink4)' }}>
                            {candidates.total} candidate{candidates.total !== 1 ? 's' : ''} in your pool
                        </div>
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>
                        + Add candidate
                    </button>
                </div>

                {/* Search */}
                <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#fff', border: '1px solid var(--wire)', borderRadius: 7, padding: '0 12px', height: 36, flex: 1 }}>
                        <span style={{ color: 'var(--ink4)', fontSize: 13 }}>⌕</span>
                        <input
                            type="text"
                            value={q}
                            onChange={e => setQ(e.target.value)}
                            placeholder="Search by name, role, company…"
                            style={{ border: 'none', background: 'transparent', fontSize: 12, width: '100%', outline: 'none', fontFamily: 'var(--font)', color: 'var(--ink)' }}
                        />
                    </div>
                    <button type="submit" className="btn btn-secondary btn-sm">Search</button>
                </form>

                {/* Candidate list */}
                {candidates.data.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--ink4)' }}>
                        <div style={{ fontSize: 36, marginBottom: 12, opacity: .35 }}>◉</div>
                        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)', marginBottom: 4 }}>No candidates yet</div>
                        <div style={{ fontSize: 12, marginBottom: 16 }}>Add your first candidate to get started</div>
                        <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>+ Add candidate</button>
                    </div>
                ) : (
                    <div className="table-wrap">
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--wire)' }}>
                                    {['Candidate', 'Current role', 'Location', 'CV', 'Added'].map(h => (
                                        <th key={h} style={{ padding: '9px 14px', fontSize: 10, fontWeight: 500, color: 'var(--ink4)', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '.05em' }}>{h}</th>
                                    ))}
                                    <th style={{ padding: '9px 14px' }} />
                                </tr>
                            </thead>
                            <tbody>
                                {candidates.data.map((c, i) => {
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
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--ink4)' }}>
                                                {[c.current_role, c.current_company].filter(Boolean).join(' · ') || '—'}
                                            </td>
                                            <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--ink4)' }}>{c.location || '—'}</td>
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
                                                <Link href={route('recruiter.candidates.show', c.id)} className="btn btn-secondary btn-sm">
                                                    View →
                                                </Link>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>

                        {/* Pagination */}
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

            {/* Add Candidate Modal */}
            {showAdd && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: '#fff', borderRadius: 'var(--r)', border: '1px solid var(--wire)', padding: 22, width: '100%', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <div style={{ fontSize: 14, fontWeight: 500 }}>Add new candidate</div>
                            <button onClick={() => { setShowAdd(false); reset() }} style={{ fontSize: 16, cursor: 'pointer', background: 'none', border: 'none', color: 'var(--ink4)' }}>✕</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginBottom: 9 }}>
                                <div className="form-group">
                                    <label className="form-label">First name *</label>
                                    <input className="form-input" value={data.first_name} onChange={e => setData('first_name', e.target.value)} placeholder="Sarah" />
                                    {errors.first_name && <div className="form-error">{errors.first_name}</div>}
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Last name *</label>
                                    <input className="form-input" value={data.last_name} onChange={e => setData('last_name', e.target.value)} placeholder="Wong" />
                                    {errors.last_name && <div className="form-error">{errors.last_name}</div>}
                                </div>
                            </div>
                            <div className="form-group" style={{ marginBottom: 9 }}>
                                <label className="form-label">Current role &amp; company</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
                                    <input className="form-input" value={data.current_role} onChange={e => setData('current_role', e.target.value)} placeholder="CHRO" />
                                    <input className="form-input" value={data.current_company} onChange={e => setData('current_company', e.target.value)} placeholder="OCBC Bank" />
                                </div>
                            </div>
                            <div className="form-group" style={{ marginBottom: 9 }}>
                                <label className="form-label">Email</label>
                                <input className="form-input" type="email" value={data.email} onChange={e => setData('email', e.target.value)} placeholder="sarah@email.com" />
                                {errors.email && <div className="form-error">{errors.email}</div>}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9, marginBottom: 9 }}>
                                <div className="form-group">
                                    <label className="form-label">Phone</label>
                                    <input className="form-input" value={data.phone} onChange={e => setData('phone', e.target.value)} placeholder="+65 9xxx xxxx" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Location</label>
                                    <input className="form-input" value={data.location} onChange={e => setData('location', e.target.value)} placeholder="Singapore" />
                                </div>
                            </div>
                            <div className="form-group" style={{ marginBottom: 9 }}>
                                <label className="form-label">LinkedIn URL</label>
                                <input className="form-input" value={data.linkedin_url} onChange={e => setData('linkedin_url', e.target.value)} placeholder="linkedin.com/in/sarahwong" />
                            </div>
                            <div className="form-group" style={{ marginBottom: 14 }}>
                                <label className="form-label">Years experience</label>
                                <input className="form-input" type="number" value={data.years_experience} onChange={e => setData('years_experience', e.target.value)} placeholder="15" min="0" max="60" style={{ width: 120 }} />
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button type="submit" className="btn btn-primary" disabled={processing} style={{ flex: 1 }}>
                                    {processing ? 'Adding…' : 'Add candidate'}
                                </button>
                                <button type="button" className="btn btn-secondary" onClick={() => { setShowAdd(false); reset() }}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </RecruiterLayout>
    )
}
