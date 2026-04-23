import RecruiterLayout from '@/Layouts/RecruiterLayout'
import { usePage, useForm, Link } from '@inertiajs/react'
import { useState } from 'react'

const SENIORITY_LABELS = { c_suite: 'C-Suite', vp_director: 'VP / Director', manager: 'Manager', ic: 'IC' }

const STATUS_COLORS = {
    pending:  { bg: 'var(--amber-pale, #fdf0e8)', color: 'var(--amber2)' },
    approved: { bg: 'var(--jade-pale)', color: 'var(--jade2)' },
    rejected: { bg: 'var(--ruby-pale, #fbe8e8)', color: 'var(--ruby2)' },
}

const ADMIN_STATUS_COLORS = {
    pending:  { badge: 'badge-amber', label: '⏳ Pending review' },
    approved: { badge: 'badge-jade',  label: '✓ Approved' },
    rejected: { badge: 'badge-ruby',  label: '✕ Rejected' },
    bypassed: { badge: 'badge-sea',   label: '⚡ Bypassed' },
}

export default function MandateWorkspace({ mandate, claim, candidates = [], submissions = [] }) {
    const { flash } = usePage().props
    const co = mandate.client?.company_name || '—'
    const [showSubmit, setShowSubmit] = useState(false)

    const statusStyle = STATUS_COLORS[claim.status] || {}

    const { data, setData, post, processing, errors, reset } = useForm({
        mandate_id:     mandate.id,
        candidate_id:   '',
        recruiter_note: '',
    })

    const submitCandidate = (e) => {
        e.preventDefault()
        post(route('recruiter.submissions.store'), {
            onSuccess: () => { reset('candidate_id', 'recruiter_note'); setShowSubmit(false) }
        })
    }

    return (
        <RecruiterLayout breadcrumb={[{ label: 'Job listings', href: route('recruiter.mandates.index') }, { label: mandate.title }]}>
            <div style={{ padding: '0 20px 20px' }}>
                {flash?.success && (
                    <div className="flash-success" style={{ marginBottom: 16, borderRadius: 8 }}>{flash.success}</div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div>
                        <div style={{ fontSize: 18, fontWeight: 600, fontFamily: 'var(--font-head)', color: 'var(--ink)' }}>{mandate.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--ink4)' }}>{co}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, fontWeight: 500, background: statusStyle.bg, color: statusStyle.color }}>
                            Claim: {claim.status}
                        </span>
                        {claim.status === 'approved' && (
                            <>
                                <button className="btn btn-primary btn-sm" onClick={() => setShowSubmit(true)}>
                                    📤 Submit candidate
                                </button>
                                <a href={route('recruiter.kanban.show', mandate.id)} className="btn btn-secondary btn-sm">
                                    Open Kanban →
                                </a>
                            </>
                        )}
                    </div>
                </div>

                <div className="g21">
                    {/* Main */}
                    <div>
                        <div className="dcard" style={{ padding: 24, marginBottom: 16 }}>
                            <div className="dcard-head" style={{ marginBottom: 16 }}>
                                <span className="dcard-title">Job Description</span>
                            </div>
                            {mandate.description ? (
                                <div style={{ fontSize: 13, color: 'var(--ink2)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{mandate.description}</div>
                            ) : (
                                <div style={{ fontSize: 13, color: 'var(--ink4)', fontStyle: 'italic' }}>No description provided.</div>
                            )}
                        </div>

                        {claim.status !== 'approved' && (
                            <div className="dcard" style={{ padding: 20, background: 'var(--amber-pale, #fdf0e8)', border: '1px solid var(--amber2)' }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--amber2)', marginBottom: 6 }}>⏳ Awaiting approval</div>
                                <div style={{ fontSize: 12, color: 'var(--ink4)', lineHeight: 1.6 }}>
                                    Your claim is pending admin review. Once approved, Day 0 starts and your 3-day timer begins.
                                    You'll be notified when approved.
                                </div>
                            </div>
                        )}

                        {/* Submissions list */}
                        {submissions.length > 0 && (
                            <div className="dcard" style={{ marginTop: 16 }}>
                                <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--wire)' }}>
                                    <span className="dcard-title">Submitted Candidates</span>
                                    <span style={{ marginLeft: 8, fontSize: 10, background: 'var(--mist2)', border: '1px solid var(--wire)', borderRadius: 10, padding: '1px 7px', color: 'var(--ink4)', fontFamily: 'var(--mono)' }}>{submissions.length}/3</span>
                                </div>
                                {submissions.map(sub => {
                                    const as = ADMIN_STATUS_COLORS[sub.admin_review_status] || {}
                                    const cname = sub.candidate ? `${sub.candidate.first_name} ${sub.candidate.last_name}` : '—'
                                    return (
                                        <div key={sub.id} style={{ padding: '12px 20px', borderBottom: '1px solid var(--wire)', display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', marginBottom: 2 }}>#{sub.submission_number} — {cname}</div>
                                                {sub.candidate && <div style={{ fontSize: 11, color: 'var(--ink4)' }}>{[sub.candidate.current_role, sub.candidate.current_company].filter(Boolean).join(' · ')}</div>}
                                            </div>
                                            <span className={`badge ${as.badge}`}>{as.label}</span>
                                            <span style={{ fontSize: 10, color: 'var(--ink4)', fontFamily: 'var(--mono)' }}>{new Date(sub.submitted_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div>
                        <div className="dcard" style={{ padding: 20, marginBottom: 16 }}>
                            <div className="dcard-title" style={{ marginBottom: 14 }}>Role Details</div>
                            {[
                                { lbl: 'Client',    val: co },
                                { lbl: 'Seniority', val: mandate.seniority ? SENIORITY_LABELS[mandate.seniority] : '—' },
                                { lbl: 'Location',  val: mandate.location || '—' },
                                { lbl: 'Industry',  val: mandate.industry || '—' },
                                { lbl: 'Openings',  val: mandate.openings_count },
                                { lbl: 'Salary',    val: mandate.salary_min ? `${mandate.salary_currency} ${Number(mandate.salary_min).toLocaleString()}–${Number(mandate.salary_max).toLocaleString()}` : '—' },
                                { lbl: 'Fast Track',val: mandate.is_fast_track ? 'Yes' : 'No' },
                            ].map(({ lbl, val }) => (
                                <div key={lbl} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '6px 0', borderBottom: '1px solid var(--mist2)' }}>
                                    <span style={{ color: 'var(--ink4)' }}>{lbl}</span>
                                    <span style={{ color: 'var(--ink2)', fontWeight: 500 }}>{val}</span>
                                </div>
                            ))}
                        </div>

                        {mandate.reward_pct && (
                            <div className="dcard" style={{ padding: 20 }}>
                                <div className="dcard-title" style={{ marginBottom: 14 }}>Your Reward</div>
                                <div style={{ fontSize: 10, color: 'var(--ink4)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 2 }}>Estimated reward</div>
                                {mandate.salary_min ? (
                                    <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-head)', color: 'var(--jade2)' }}>
                                        {mandate.salary_currency} {Math.round(mandate.salary_min * mandate.reward_pct).toLocaleString()}–{Math.round(mandate.salary_max * mandate.reward_pct).toLocaleString()}
                                    </div>
                                ) : (
                                    <div style={{ fontSize: 14, color: 'var(--ink4)' }}>—</div>
                                )}
                                <div style={{ fontSize: 11, color: 'var(--ink4)', marginTop: 4 }}>{Math.round(mandate.reward_pct * 100)}% of first-year salary</div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Submit Modal */}
            {showSubmit && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: '#fff', borderRadius: 'var(--r)', border: '1px solid var(--wire)', padding: 24, width: '100%', maxWidth: 500 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                            <div style={{ fontSize: 15, fontWeight: 500 }}>📤 Submit candidate to {co}</div>
                            <button onClick={() => setShowSubmit(false)} style={{ background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', color: 'var(--ink4)' }}>✕</button>
                        </div>
                        <form onSubmit={submitCandidate}>
                            <div className="form-group" style={{ marginBottom: 12 }}>
                                <label className="form-label">Select candidate *</label>
                                <select
                                    className="form-input"
                                    value={data.candidate_id}
                                    onChange={e => setData('candidate_id', e.target.value)}
                                    style={{ width: '100%' }}
                                >
                                    <option value="">— Choose from your pool —</option>
                                    {candidates.map(c => (
                                        <option key={c.id} value={c.id}>
                                            {c.first_name} {c.last_name}{c.current_role ? ` — ${c.current_role}` : ''}{c.current_company ? `, ${c.current_company}` : ''}
                                        </option>
                                    ))}
                                </select>
                                {errors.candidate_id && <div className="form-error">{errors.candidate_id}</div>}
                            </div>
                            <div className="form-group" style={{ marginBottom: 16 }}>
                                <label className="form-label">Recruiter note (shown to client)</label>
                                <textarea
                                    className="form-input"
                                    value={data.recruiter_note}
                                    onChange={e => setData('recruiter_note', e.target.value)}
                                    rows={5}
                                    placeholder="Why this candidate is a strong fit, key strengths, any flags to note…"
                                    style={{ width: '100%', resize: 'vertical' }}
                                />
                                {errors.recruiter_note && <div className="form-error">{errors.recruiter_note}</div>}
                            </div>
                            {errors.mandate_id && (
                                <div style={{ background: 'var(--ruby-pale)', border: '1px solid var(--ruby-soft)', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: 'var(--ruby2)', marginBottom: 12 }}>
                                    {errors.mandate_id}
                                </div>
                            )}
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button type="submit" className="btn btn-primary" disabled={processing || !data.candidate_id} style={{ flex: 1 }}>
                                    {processing ? 'Submitting…' : `Submit to ${co} →`}
                                </button>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowSubmit(false)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </RecruiterLayout>
    )
}

