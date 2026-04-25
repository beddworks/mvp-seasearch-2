import RecruiterLayout from '@/Layouts/RecruiterLayout'
import { Link, useForm, usePage } from '@inertiajs/react'
import { useMemo, useState } from 'react'
import CandidateDetailModal from '@/Components/CandidateDetailModal'

const SENIORITY_LABELS = { c_suite: 'C-Suite', vp_director: 'VP / Director', manager: 'Manager', ic: 'IC' }
const STATUS_COLORS = {
    pending: { bg: 'var(--amber-pale, #fdf0e8)', color: 'var(--amber2)' },
    approved: { bg: 'var(--jade-pale)', color: 'var(--jade2)' },
    rejected: { bg: 'var(--ruby-pale, #fbe8e8)', color: 'var(--ruby2)' },
}
const STAGES = ['sourced', 'screened', 'interview', 'offered', 'hired', 'rejected']
const STAGE_LABEL = {
    sourced: 'Sourced',
    screened: 'Screened',
    interview: 'Interviewed',
    offered: 'Offered',
    hired: 'Hired',
    rejected: 'Rejected',
}
const STAGE_COLOR = {
    sourced: 'var(--ink4)',
    screened: 'var(--amber2)',
    interview: 'var(--sea2)',
    offered: 'var(--violet2)',
    hired: 'var(--jade2)',
    rejected: 'var(--ruby2)',
}
const CHIP_STYLE = {
    fontSize: 11,
    padding: '3px 9px',
    borderRadius: 20,
    background: 'var(--mist2)',
    color: 'var(--ink4)',
    border: '1px solid var(--wire)',
}

function initials(first = '', last = '') {
    return `${(first || '').slice(0, 1)}${(last || '').slice(0, 1)}`.toUpperCase()
}

function money(value) {
    return Number(value || 0).toLocaleString()
}

function activityLabel(value) {
    if (!value) return '—'
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return '—'
    const today = new Date()
    const a = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const b = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    const days = Math.floor((a - b) / 86400000)
    if (days <= 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days} days ago`
    const weeks = Math.floor(days / 7)
    return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`
}

function isAiProcessing(submission) {
    return submission?.ai_processing === true
}

export default function MandateWorkspace({ mandate, claim, candidates = [], submissions = [] }) {
    const { flash } = usePage().props
    const co = mandate.client?.company_name || '—'

    const [tab, setTab] = useState('overview')
    const [showSubmit, setShowSubmit] = useState(false)
    const [selectedSubmission, setSelectedSubmission] = useState(null)
    const [liveCandidates, setLiveCandidates] = useState(candidates)
    const [liveSubmissions, setLiveSubmissions] = useState(submissions)

    const statusStyle = STATUS_COLORS[claim.status] || STATUS_COLORS.pending
    const topScore = Math.max(...liveSubmissions.map(s => s.ai_score || 0), 0)
    const daysActive = claim.assigned_at ? Math.floor((Date.now() - new Date(claim.assigned_at).getTime()) / 86400000) : 0
    const submittedCount = liveSubmissions.filter(s => ['approved', 'bypassed'].includes(s.admin_review_status)).length

    const grouped = useMemo(() => {
        return STAGES.reduce((acc, stage) => {
            acc[stage] = liveSubmissions.filter(s => (s.client_status || 'sourced') === stage)
            return acc
        }, {})
    }, [liveSubmissions])

    const processingCount = useMemo(() => liveSubmissions.filter(isAiProcessing).length, [liveSubmissions])

    const ranked = useMemo(() => {
        return [...liveSubmissions]
            .filter(s => s.candidate)
            .sort((a, b) => (b.ai_score || 0) - (a.ai_score || 0))
    }, [liveSubmissions])

    const rewardMin = mandate.reward_min || (mandate.salary_min && mandate.reward_pct ? Number(mandate.salary_min) * Number(mandate.reward_pct) : null)
    const rewardMax = mandate.reward_max || (mandate.salary_max && mandate.reward_pct ? Number(mandate.salary_max) * Number(mandate.reward_pct) : null)

    const { data, setData, post, processing, errors, reset } = useForm({
        mandate_id: mandate.id,
        candidate_id: '',
        recruiter_note: '',
    })

    function submitCandidate(e) {
        e.preventDefault()
        post(route('recruiter.submissions.store'), {
            onSuccess: () => {
                reset('candidate_id', 'recruiter_note')
                setShowSubmit(false)
            },
        })
    }

    return (
        <RecruiterLayout breadcrumb={[{ label: 'Job listings', href: route('recruiter.mandates.index') }, { label: mandate.title }]}>
            <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px 20px' }}>
                {flash?.success && <div className="flash-success" style={{ marginBottom: 16, borderRadius: 8 }}>{flash.success}</div>}

                <div style={{ marginBottom: 14 }}>
                    <Link href={route('recruiter.mandates.index')} style={{ fontSize: 12, color: 'var(--ink4)', textDecoration: 'none' }}>← Back to job listings</Link>
                </div>

                <div style={{ background: '#fff', border: '1px solid var(--wire)', borderRadius: 'var(--r)', padding: '18px 20px', marginBottom: 14, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                    <div style={{ width: 52, height: 52, borderRadius: 10, border: '1px solid var(--wire)', background: 'var(--sea-pale)', color: 'var(--sea2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                        {co.slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, color: 'var(--ink4)', marginBottom: 2 }}>{co}{mandate.location ? ` — ${mandate.location}` : ''}</div>
                        <div style={{ fontSize: 18, fontWeight: 500, color: 'var(--ink)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--jade3)' }} />
                            {mandate.title}
                            <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 20, background: statusStyle.bg, color: statusStyle.color }}>Claim: {claim.status}</span>
                            {mandate.is_exclusive && <span className="badge badge-gold">Exclusive</span>}
                            {mandate.is_featured && <span className="badge badge-violet">Featured</span>}
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                            {mandate.contract_type && <span style={CHIP_STYLE}>{mandate.contract_type}</span>}
                            {mandate.location && <span style={CHIP_STYLE}>{mandate.location}</span>}
                            {mandate.seniority && <span style={CHIP_STYLE}>{SENIORITY_LABELS[mandate.seniority] || mandate.seniority}</span>}
                            {mandate.industry && <span style={CHIP_STYLE}>{mandate.industry}</span>}
                            <span style={CHIP_STYLE}>{mandate.openings_count || 1} opening{(mandate.openings_count || 1) > 1 ? 's' : ''}</span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--ink4)', lineHeight: 1.7 }}>{mandate.description || 'No role description provided yet.'}</div>
                    </div>
                    <div style={{ minWidth: 190, borderLeft: '1px solid var(--wire)', paddingLeft: 16, textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 9, color: 'var(--ink4)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 1 }}>Base hire reward</div>
                        <div style={{ fontSize: 13, color: 'var(--ink)' }}>{rewardMin ? `${mandate.salary_currency} ${money(rewardMin)} – ${money(rewardMax)}` : '—'}</div>
                        {!!mandate.reward_pct && <div style={{ fontSize: 10, color: 'var(--ink4)', marginBottom: 8 }}>{Math.round(Number(mandate.reward_pct) * 100)}% of first year salary</div>}
                        <div style={{ height: 1, background: 'var(--wire)', margin: '5px 0' }} />
                        <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--ink4)', marginBottom: 2 }}>Total base reward</div>
                        <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)', fontFamily: 'var(--font-head)' }}>{rewardMin ? `${mandate.salary_currency} ${money(rewardMin)}–${money(rewardMax)}+` : '—'}</div>
                    </div>
                </div>

                <div style={{ display: 'flex', borderBottom: '1px solid var(--wire)', marginBottom: 14 }}>
                    {[
                        ['overview', 'Overview'],
                        ['pipeline', 'Pipeline'],
                        ['candidates', 'Candidates'],
                        ['aipanel', 'AI matching'],
                        ['activity', 'Activity log'],
                    ].map(([key, label]) => (
                        <button key={key} onClick={() => setTab(key)} style={{ padding: '8px 16px', fontSize: 13, color: tab === key ? 'var(--sea2)' : 'var(--ink4)', border: 'none', borderBottom: tab === key ? '2px solid var(--sea3)' : '2px solid transparent', background: 'transparent', marginBottom: -1, cursor: 'pointer', fontWeight: tab === key ? 500 : 400 }}>
                            {label}
                        </button>
                    ))}
                </div>

                {tab === 'overview' && (
                    <>
                        <div className="stat-row" style={{ marginBottom: 14, display: 'none' }}>
                            <div className="sc"><div className="sc-num">{liveSubmissions.length}</div><div className="sc-lbl">Candidates sourced</div></div>
                            <div className="sc"><div className="sc-num">{liveSubmissions.filter(s => (s.ai_score || 0) > 0).length}</div><div className="sc-lbl">AI screened</div></div>
                            <div className="sc"><div className="sc-num">{liveSubmissions.filter(s => s.client_status === 'interview').length}</div><div className="sc-lbl">Interviews set</div></div>
                            <div className="sc"><div className="sc-num">{topScore}%</div><div className="sc-lbl">Top match score</div></div>
                        </div>

                        <div className="sblock">
                            <div className="sblock-head"><div className="sblock-title">Job description</div></div>
                            <div className="sblock-body">
                                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--ink4)', marginBottom: 6 }}>Role requirements</div>
                                <div className="req-grid" style={{ display: 'none' }}>
                                    <div className="req-card">
                                        <div className="req-title">Must-have</div>
                                        {(mandate.must_haves || []).length > 0 ? (mandate.must_haves || []).map((item, i) => <div key={i} className="req-item">{item}</div>) : <div className="req-item">No must-have requirements listed</div>}
                                    </div>
                                    <div className="req-card">
                                        <div className="req-title">Nice to have</div>
                                        {(mandate.nice_to_haves || []).length > 0 ? (mandate.nice_to_haves || []).map((item, i) => <div key={i} className="req-item">{item}</div>) : <div className="req-item">No nice-to-have requirements listed</div>}
                                    </div>
                                </div>
                                <div>
                                        <div style={{ fontSize: 12, color: 'var(--ink4)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                                            {mandate.description}
                                        </div>
                                </div>
                            </div>
                        </div>

                        <div className="sblock" style={{ marginTop: 12, display: 'none' }}>
                            <div className="sblock-head"><div className="sblock-title">Candidate screening flags</div></div>
                            <div className="sblock-body">
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    <div>
                                        <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 8, color: 'var(--jade2)' }}>Green flags</div>
                                        {(mandate.green_flags || []).length > 0 ? (mandate.green_flags || []).map((f, i) => <div key={i} style={{ fontSize: 11, padding: '5px 10px', borderRadius: 'var(--rsm)', background: 'var(--jade-pale)', color: 'var(--jade2)', marginBottom: 5 }}>✓ {f}</div>) : <div style={{ fontSize: 11, color: 'var(--ink4)' }}>No green flags set</div>}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 8, color: 'var(--ruby2)' }}>Red flags</div>
                                        {(mandate.red_flags || []).length > 0 ? (mandate.red_flags || []).map((f, i) => <div key={i} style={{ fontSize: 11, padding: '5px 10px', borderRadius: 'var(--rsm)', background: 'var(--ruby-pale)', color: 'var(--ruby2)', marginBottom: 5 }}>⚠ {f}</div>) : <div style={{ fontSize: 11, color: 'var(--ink4)' }}>No red flags set</div>}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'none', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                            <Link href={route('recruiter.mandates.add-candidate', mandate.id)} className="ai-action-btn" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>+ Add candidate</Link>
                            <button className="ai-action-btn" onClick={() => setTab('aipanel')}>Run AI candidate matching</button>
                            <button className="ai-action-btn" onClick={() => setShowSubmit(true)}>Submit to client</button>
                            <a href={route('recruiter.kanban.show', mandate.id)} className="ai-action-btn" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>Open Kanban</a>
                        </div>
                    </>
                )}

                {tab === 'pipeline' && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
                        {STAGES.map(stage => (
                            <div key={stage}>
                                <div style={{ fontSize: 10, fontWeight: 500, color: 'var(--ink4)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
                                    <span>{STAGE_LABEL[stage]}</span>
                                    <span style={{ background: 'var(--mist2)', borderRadius: 10, padding: '1px 6px', fontSize: 9, fontFamily: 'var(--mono)' }}>{grouped[stage].length}</span>
                                </div>
                                {grouped[stage].map(sub => {
                                    const c = sub.candidate
                                    const score = sub.ai_score || 0
                                    return (
                                        <div key={sub.id} style={{ background: '#fff', border: '1px solid var(--wire)', borderRadius: 'var(--rsm)', padding: '8px 10px', marginBottom: 6 }}>
                                            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink)', marginBottom: 2 }}>{c ? `${c.first_name} ${c.last_name}` : `#${sub.submission_number}`}</div>
                                            <div style={{ fontSize: 10, color: 'var(--ink4)', marginBottom: 5 }}>{c ? [c.current_role, c.current_company].filter(Boolean).join(', ') : 'No candidate profile'}</div>
                                            <div style={{ height: 3, background: 'var(--mist2)', borderRadius: 2, marginBottom: 2 }}><div style={{ width: `${Math.max(score, 5)}%`, height: 3, borderRadius: 2, background: score >= 80 ? 'var(--jade2)' : (score >= 60 ? 'var(--amber2)' : 'var(--ruby2)') }} /></div>
                                            <div style={{ fontSize: 9, color: 'var(--ink4)', fontFamily: 'var(--mono)' }}>{score ? `${score}% match` : 'Scoring pending'}</div>
                                        </div>
                                    )
                                })}
                                {grouped[stage].length === 0 && (
                                    <Link href={route('recruiter.mandates.add-candidate', mandate.id)} style={{ width: '100%', padding: '8px 10px', fontSize: 11, border: '1px dashed var(--wire2)', borderRadius: 'var(--rsm)', background: 'transparent', color: 'var(--ink4)', cursor: 'pointer', textAlign: 'center', display: 'block' }}>
                                        + Add candidate
                                    </Link>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {tab === 'candidates' && (
                    <>
                        {processingCount > 0 && (
                            <div style={{ marginBottom: 10, background: 'var(--violet-pale)', border: '1px solid #C4B8F0', borderRadius: 'var(--rsm)', padding: '8px 12px', fontSize: 11, color: 'var(--violet2)' }}>
                                AI processing in progress for {processingCount} candidate{processingCount > 1 ? 's' : ''}. Scores and match insights will appear automatically.
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, position: 'relative', zIndex: 3 }}>
                            <div style={{ fontSize: 13, fontWeight: 500 }}>{liveSubmissions.length} candidates in pipeline</div>
                            <Link href={route('recruiter.mandates.add-candidate', mandate.id)} className="ai-action-btn" style={{ fontSize: 11, padding: '5px 14px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                                + Add candidate
                            </Link>
                        </div>
                        <div style={{ background: '#fff', border: '1px solid var(--wire)', borderRadius: 'var(--r)', overflow: 'hidden', position: 'relative', zIndex: 3 }}>
                            <table className="ctable">
                                <thead>
                                    <tr>
                                        <th>Candidate</th>
                                        <th>Current role</th>
                                        <th>AI match</th>
                                        <th>Stage</th>
                                        <th>Last activity</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {liveSubmissions.map(sub => {
                                        const c = sub.candidate
                                        const score = Number(sub.ai_score || 0)
                                        const stage = sub.client_status || 'sourced'
                                        const stageLabel = STAGE_LABEL[stage] || 'Sourced'
                                        const aiProcessing = isAiProcessing(sub)
                                        return (
                                            <tr key={sub.id} style={{ cursor: 'pointer', transition: 'background-color .15s ease' }} onClick={() => setSelectedSubmission(sub)} onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--mist2)'} onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}>
                                                <td><strong>{c ? `${c.first_name} ${c.last_name}` : `#${sub.submission_number}`}</strong></td>
                                                <td>{c ? [c.current_role, c.current_company].filter(Boolean).join(', ') : '—'}</td>
                                                <td>
                                                    {aiProcessing ? (
                                                        <span className="mpill mp-mid" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>⟳ Processing</span>
                                                    ) : score >= 80 ? (
                                                        <span className="mpill mp-high">{score}%</span>
                                                    ) : score > 0 ? (
                                                        <span className="mpill mp-mid">{score}%</span>
                                                    ) : (
                                                        <span>—</span>
                                                    )}
                                                </td>
                                                <td><span className="sdot" style={{ background: STAGE_COLOR[stage] || 'var(--ink4)' }} />{stageLabel}</td>
                                                <td>{aiProcessing ? 'AI processing...' : activityLabel(sub.client_status_updated_at || sub.submitted_at || sub.updated_at || sub.created_at)}</td>
                                                <td onClick={e => e.stopPropagation()}><button className="mc-btn" onClick={() => setSelectedSubmission(sub)}>{aiProcessing ? 'Generating...' : 'AI summary →'}</button></td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {tab === 'aipanel' && (
                    <>
                        <div style={{ background: 'var(--violet-pale)', border: '1px solid #C4B8F0', borderRadius: 'var(--rsm)', padding: '10px 14px', marginBottom: 12, fontSize: 12, color: 'var(--violet2)' }}>
                            AI scored {ranked.filter(r => (r.ai_score || 0) > 0).length} candidates against this role. {processingCount > 0 ? `Processing ${processingCount} candidate${processingCount > 1 ? 's' : ''} now...` : 'Add a candidate and drop CV (PDF/DOC/DOCX) to trigger automated scoring.'}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 14 }}>
                            <div className="sc" style={{ background: 'var(--jade-soft)', padding: '1rem', borderRadius: 'var(--r)' }}><div className="sc-num">{ranked.length}</div><div className="sc-lbl">Candidates scored</div></div>
                            <div className="sc" style={{ background: 'var(--jade-pale)', padding: '1rem', borderRadius: 'var(--r)' }}><div className="sc-num" style={{ color: 'var(--jade2)' }}>{ranked.filter(r => (r.ai_score || 0) >= 80).length}</div><div className="sc-lbl">Strong matches (80%+)</div></div>
                            <div className="sc" style={{ background: 'var(--amber-pale)', padding: '1rem', borderRadius: 'var(--r)' }}><div className="sc-num" style={{ color: 'var(--amber2)' }}>{ranked.filter(r => (r.ai_score || 0) >= 60 && (r.ai_score || 0) < 80).length}</div><div className="sc-lbl">Moderate (60-79%)</div></div>
                            <div className="sc" style={{ background: 'var(--ruby-pale)', padding: '1rem', borderRadius: 'var(--r)' }}><div className="sc-num" style={{ color: 'var(--ruby2)' }}>{ranked.filter(r => (r.ai_score || 0) > 0 && (r.ai_score || 0) < 60).length}</div><div className="sc-lbl">Weak (&lt;60%)</div></div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {ranked.map((sub, idx) => {
                                const c = sub.candidate
                                const score = sub.ai_score || 0
                                const breakdown = sub.score_breakdown || {}
                                return (
                                    <div key={sub.id} style={{ background: '#fff', border: `1px solid ${idx === 0 ? 'var(--sea3)' : 'var(--wire)'}`, borderRadius: 'var(--r)', padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'center', cursor: 'pointer', transition: 'all .15s ease', ':hover': { boxShadow: '0 2px 8px rgba(0,0,0,0.1)' } }} onClick={() => setSelectedSubmission(sub)}>
                                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--sea-pale)', color: 'var(--sea2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 500, flexShrink: 0 }}>{c ? initials(c.first_name, c.last_name) : 'CV'}</div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', marginBottom: 2, display: 'flex', gap: 7, alignItems: 'center', flexWrap: 'wrap' }}>
                                                {c ? `${c.first_name} ${c.last_name}` : `Candidate #${sub.submission_number}`}
                                                {idx === 0 && <span className="badge badge-amber">#1 Pick</span>}
                                                {score >= 80 && <span className="badge badge-jade">Strong match</span>}
                                            </div>
                                            <div style={{ fontSize: 11, color: 'var(--ink4)', marginBottom: 6 }}>{c ? [c.current_role, c.current_company].filter(Boolean).join(' · ') : 'Profile pending'}</div>

                                            {[
                                                ['experience', 'Experience', 'var(--sea3)'],
                                                ['industry_fit', 'Industry fit', 'var(--jade2)'],
                                                ['scope_match', 'Scope match', 'var(--violet2)'],
                                                ['leadership', 'Leadership', 'var(--amber2)'],
                                            ].map(([k, lbl, clr]) => (
                                                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                                    <div style={{ fontSize: 11, color: 'var(--ink4)', width: 110, flexShrink: 0 }}>{lbl}</div>
                                                    <div style={{ flex: 1, height: 5, background: 'var(--mist2)', borderRadius: 3 }}><div style={{ width: `${breakdown[k] || 0}%`, height: 5, borderRadius: 3, background: clr }} /></div>
                                                    <div style={{ fontSize: 10, color: 'var(--ink4)', width: 30, textAlign: 'right', fontFamily: 'var(--mono)' }}>{breakdown[k] || 0}%</div>
                                                </div>
                                            ))}

                                            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 6 }}>
                                                {(sub.green_flags || []).slice(0, 3).map((f, i) => <span key={i} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: 'var(--jade-pale)', color: 'var(--jade2)' }}>{f}</span>)}
                                                {(sub.red_flags || []).slice(0, 2).map((f, i) => <span key={i} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: 'var(--ruby-pale)', color: 'var(--ruby2)' }}>{f}</span>)}
                                            </div>

                                            {sub.ai_summary && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--ink4)', lineHeight: 1.7, background: 'var(--mist2)', borderLeft: '2px solid #C4B8F0', padding: '8px 12px', borderRadius: '0 var(--rsm) var(--rsm) 0' }}>{sub.ai_summary}</div>}
                                        </div>
                                        <div style={{ minWidth: 80, textAlign: 'right', flexShrink: 0 }}>
                                            <div style={{ fontSize: 22, fontWeight: 600, fontFamily: 'var(--font-head)', color: score >= 80 ? 'var(--jade2)' : (score >= 60 ? 'var(--amber2)' : 'var(--ruby2)') }}>{score}%</div>
                                            <div style={{ fontSize: 10, color: 'var(--ink4)', fontFamily: 'var(--mono)' }}>Rank #{idx + 1} of {ranked.length}</div>
                                        </div>
                                    </div>
                                )
                            })}
                            {ranked.length === 0 && <div style={{ background: '#fff', border: '1px solid var(--wire)', borderRadius: 'var(--r)', padding: 16, fontSize: 12, color: 'var(--ink4)' }}>No candidates yet. Add candidates with CV files to run AI matching.</div>}
                        </div>
                    </>
                )}

                {tab === 'activity' && (
                    <div style={{ background: '#fff', border: '1px solid var(--wire)', borderRadius: 'var(--r)', padding: '14px 16px' }}>
                        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>Recent activity</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div style={{ fontSize: 12, color: 'var(--ink4)', borderBottom: '1px solid var(--wire)', paddingBottom: 4 }}>Role picked and claim submitted ({new Date(claim.created_at).toLocaleDateString()})</div>
                            {liveSubmissions.map(s => <div key={s.id} style={{ fontSize: 12, color: 'var(--ink4)', borderBottom: '1px solid var(--wire)', paddingBottom: 4, marginBottom: 4 }}>Candidate {s.candidate ? `${s.candidate.first_name} ${s.candidate.last_name}` : `#${s.submission_number}`} in {STAGE_LABEL[s.client_status || 'sourced']} ({s.submitted_at ? new Date(s.submitted_at).toLocaleDateString() : 'today'})</div>)}
                            {liveSubmissions.length === 0 && <div style={{ fontSize: 12, color: 'var(--ink4)' }}>No candidate activity yet.</div>}
                        </div>
                    </div>
                )}

                <div style={{ marginTop: 14, display: 'none', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
                    <div className="sc"><div className="sc-num">{liveSubmissions.length}</div><div className="sc-lbl">Total</div></div>
                    <div className="sc"><div className="sc-num">{topScore || '—'}</div><div className="sc-lbl">Top match</div></div>
                    <div className="sc"><div className="sc-num">{daysActive}</div><div className="sc-lbl">Days active</div></div>
                    <div className="sc"><div className="sc-num">{submittedCount}</div><div className="sc-lbl">Submitted</div></div>
                </div>

                {claim.status !== 'approved' && <div className="dcard" style={{ padding: 20, background: 'var(--amber-pale, #fdf0e8)', border: '1px solid var(--amber2)', marginTop: 14 }}><div style={{ fontSize: 13, fontWeight: 600, color: 'var(--amber2)', marginBottom: 6 }}>Awaiting approval</div><div style={{ fontSize: 12, color: 'var(--ink4)', lineHeight: 1.6 }}>Your claim is pending admin review. Once approved, Day 0 starts and your timer begins.</div></div>}

            </div>

            {showSubmit && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ background: '#fff', borderRadius: 'var(--r)', border: '1px solid var(--wire)', padding: 24, width: '100%', maxWidth: 500 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                            <div style={{ fontSize: 15, fontWeight: 500 }}>Submit candidate to {co}</div>
                            <button onClick={() => setShowSubmit(false)} style={{ background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', color: 'var(--ink4)' }}>x</button>
                        </div>
                        <form onSubmit={submitCandidate}>
                            <div className="form-group" style={{ marginBottom: 12 }}>
                                <label className="form-label">Select candidate *</label>
                                <select className="form-input" value={data.candidate_id} onChange={e => setData('candidate_id', e.target.value)} style={{ width: '100%' }}>
                                    <option value="">Choose from your pool</option>
                                    {liveCandidates.map(c => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}{c.current_role ? ` - ${c.current_role}` : ''}{c.current_company ? `, ${c.current_company}` : ''}</option>)}
                                </select>
                                {errors.candidate_id && <div className="form-error">{errors.candidate_id}</div>}
                            </div>
                            <div className="form-group" style={{ marginBottom: 16 }}>
                                <label className="form-label">Recruiter note (shown to client)</label>
                                <textarea className="form-input" value={data.recruiter_note} onChange={e => setData('recruiter_note', e.target.value)} rows={5} placeholder="Why this candidate is a strong fit, key strengths, any flags to note" style={{ width: '100%', resize: 'vertical' }} />
                                {errors.recruiter_note && <div className="form-error">{errors.recruiter_note}</div>}
                            </div>
                            {errors.mandate_id && <div style={{ background: 'var(--ruby-pale)', border: '1px solid var(--ruby-soft)', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: 'var(--ruby2)', marginBottom: 12 }}>{errors.mandate_id}</div>}
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button type="submit" className="btn btn-primary" disabled={processing || !data.candidate_id} style={{ flex: 1 }}>{processing ? 'Submitting...' : `Submit to ${co}`}</button>
                                <button type="button" className="btn btn-secondary" onClick={() => setShowSubmit(false)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {selectedSubmission && (
                <CandidateDetailModal
                    submission={selectedSubmission}
                    onClose={() => setSelectedSubmission(null)}
                />
            )}
        </RecruiterLayout>
    )
}
