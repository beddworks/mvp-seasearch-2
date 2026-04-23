import { useState } from 'react'
import { initials, stageColor } from '@/lib/utils'

const STAGE_LABELS = {
    sourced: 'Sourced', screened: 'Screened', interview: 'Interview',
    offered: 'Offered', hired: 'Hired', rejected: 'Rejected',
}
const csrf = () => document.querySelector('meta[name=csrf-token]')?.content

export default function KanbanSidePanel({ submission, stages, mandate, onClose, onMove, onReject, onSubmitToClient, routeBase = 'recruiter.kanban', canScheduleInterview = true }) {
    const [intDate, setIntDate] = useState(submission.interview_date?.slice(0, 10) ?? '')
    const [intFmt,  setIntFmt]  = useState(submission.interview_format ?? 'video')
    const [intNote, setIntNote] = useState(submission.interview_notes ?? '')
    const [fbText,  setFbText]  = useState(submission.client_feedback ?? '')
    const [fbSent,  setFbSent]  = useState(submission.client_feedback_sentiment ?? 'positive')
    const [saving,  setSaving]  = useState(false)

    const c = submission.candidate ?? {}
    const score = submission.ai_score
    const scoreColor = score >= 80 ? 'var(--jade2)' : score >= 60 ? 'var(--amber2)' : 'var(--ruby2)'
    const DIMS = ['experience', 'industry', 'scope', 'leadership', 'digital']

    function saveInterview() {
        setSaving(true)
        fetch(route(routeBase + '.schedule-interview'), {
            method: 'POST',
            headers: { 'X-CSRF-TOKEN': csrf(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ submission_id: submission.id, interview_date: intDate, interview_format: intFmt, interview_notes: intNote }),
        }).then(() => { onMove && onMove(submission.id, 'interview'); setSaving(false) })
    }

    function saveFeedback() {
        fetch(route(routeBase + '.save-feedback'), {
            method: 'POST',
            headers: { 'X-CSRF-TOKEN': csrf(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ submission_id: submission.id, client_feedback: fbText, client_feedback_sentiment: fbSent }),
        })
    }

    return (
        <div style={{ width: 310, background: '#fff', borderLeft: '1px solid var(--wire)', display: 'flex', flexDirection: 'column', flexShrink: 0, overflowY: 'auto' }}>

            {/* Header */}
            <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--wire)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--sea-pale)', color: 'var(--sea)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 500 }}>
                    {initials((c.first_name ?? '') + ' ' + (c.last_name ?? ''))}
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>{c.first_name} {c.last_name}</div>
                    <div style={{ fontSize: 10, color: 'var(--ink4)' }}>{c.current_role}{c.current_company ? ` · ${c.current_company}` : ''}</div>
                </div>
                <button onClick={onClose} style={{ fontSize: 15, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink4)' }}>✕</button>
            </div>

            {/* Stage mover */}
            {onMove && (
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--wire)' }}>
                <div style={{ fontSize: 10, color: 'var(--ink4)', marginBottom: 6 }}>Move stage</div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {stages.map(s => (
                        <button key={s} onClick={() => onMove(submission.id, s)} style={{
                            fontSize: 10, padding: '3px 8px', borderRadius: 20, cursor: 'pointer', fontFamily: 'var(--font)',
                            border: `1px solid ${submission.client_status === s ? stageColor(s) : 'var(--wire)'}`,
                            background: submission.client_status === s ? `${stageColor(s)}20` : 'transparent',
                            color: submission.client_status === s ? stageColor(s) : 'var(--ink4)',
                            fontWeight: submission.client_status === s ? 600 : 400,
                        }}>
                            {STAGE_LABELS[s]}
                        </button>
                    ))}
                </div>
            </div>
            )}

            {/* CV strip */}
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--wire)' }}>
                {c.cv_url ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--jade-pale)', border: '1px solid var(--wire)', borderRadius: 'var(--rsm)', padding: '7px 10px' }}>
                        <span>📄</span>
                        <div style={{ flex: 1, fontSize: 11, color: 'var(--jade2)' }}>{c.cv_original_name?.slice(0, 28) ?? 'CV uploaded'}</div>
                        <a href={c.cv_url} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm" style={{ fontSize: 10, padding: '2px 8px' }}>View</a>
                    </div>
                ) : (
                    <div style={{ background: 'var(--mist2)', border: '1.5px dashed var(--wire)', borderRadius: 'var(--rsm)', padding: '8px 10px', fontSize: 11, color: 'var(--ink4)', textAlign: 'center' }}>
                        📄 No CV uploaded
                    </div>
                )}
            </div>

            {/* AI score */}
            {score != null && (
                <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--wire)' }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
                        <div style={{ width: 44, height: 44, borderRadius: '50%', border: `2px solid ${scoreColor}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-head)', color: scoreColor }}>{score}</div>
                            <div style={{ fontSize: 8, color: 'var(--ink4)', textTransform: 'uppercase' }}>AI</div>
                        </div>
                        <div style={{ flex: 1 }}>
                            {DIMS.map(d => (
                                <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                                    <div style={{ fontSize: 9, color: 'var(--ink4)', width: 66, textTransform: 'capitalize', flexShrink: 0 }}>{d}</div>
                                    <div style={{ flex: 1, height: 3, background: 'var(--wire)', borderRadius: 2 }}>
                                        <div style={{ height: 3, borderRadius: 2, background: scoreColor, width: `${submission.score_breakdown?.[d] ?? 0}%` }} />
                                    </div>
                                    <div style={{ fontSize: 9, fontFamily: 'var(--mono)', color: 'var(--ink4)', width: 22, textAlign: 'right' }}>
                                        {submission.score_breakdown?.[d] ?? 0}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Interview scheduling */}
            {canScheduleInterview && (
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--wire)' }}>
                <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 8 }}>Interview</div>
                <div className="form-group">
                    <label className="form-label">Date</label>
                    <input className="form-input" type="date" value={intDate} onChange={e => setIntDate(e.target.value)} style={{ fontSize: 11 }} />
                </div>
                <div className="form-group">
                    <label className="form-label">Format</label>
                    <select className="form-input" value={intFmt} onChange={e => setIntFmt(e.target.value)} style={{ fontSize: 11 }}>
                        <option value="in_person">In-person</option>
                        <option value="video">Video call</option>
                        <option value="panel">Panel</option>
                    </select>
                </div>
                <div className="form-group">
                    <label className="form-label">Notes</label>
                    <input className="form-input" value={intNote} onChange={e => setIntNote(e.target.value)} placeholder="Location, interviewers…" style={{ fontSize: 11 }} />
                </div>
                <button className="btn btn-secondary btn-sm" onClick={saveInterview} disabled={saving || !intDate}>
                    {saving ? 'Saving…' : 'Save interview'}
                </button>
            </div>
            )}

            {/* Client feedback */}
            {onMove && (
            <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--wire)' }}>
                <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 8 }}>Client feedback note</div>
                {submission.client_feedback && (
                    <div style={{ fontSize: 11, color: 'var(--ink4)', background: 'var(--mist2)', border: '1px solid var(--wire)', borderRadius: 'var(--rsm)', padding: '7px 10px', marginBottom: 8, fontStyle: 'italic' }}>
                        "{submission.client_feedback}"
                        <span className={`cbadge ${submission.client_feedback_sentiment === 'positive' ? 'cb-jade' : submission.client_feedback_sentiment === 'negative' ? 'cb-rub' : 'cb-sea'}`} style={{ marginLeft: 6 }}>
                            {submission.client_feedback_sentiment}
                        </span>
                    </div>
                )}
                <textarea className="form-input" rows={2} value={fbText} onChange={e => setFbText(e.target.value)}
                    placeholder="Add client feedback note…" style={{ fontSize: 11, resize: 'vertical', marginBottom: 6 }} />
                <div style={{ display: 'flex', gap: 6 }}>
                    <select className="form-input" value={fbSent} onChange={e => setFbSent(e.target.value)} style={{ fontSize: 11, flex: 1 }}>
                        <option value="positive">Positive</option>
                        <option value="neutral">Neutral</option>
                        <option value="negative">Negative</option>
                    </select>
                    <button className="btn btn-secondary btn-sm" onClick={saveFeedback} disabled={!fbText}>Save</button>
                </div>
            </div>
            )}

            {/* Actions */}
            <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {onSubmitToClient && !['approved', 'bypassed'].includes(submission.admin_review_status) && (
                    <button className="btn btn-primary btn-sm" onClick={() => onSubmitToClient(submission)}>Submit to client</button>
                )}
                {onSubmitToClient && ['approved', 'bypassed'].includes(submission.admin_review_status) && (
                    <div style={{ fontSize: 11, color: 'var(--jade2)', background: 'var(--jade-pale)', border: '1px solid var(--wire)', borderRadius: 'var(--rsm)', padding: '6px 10px', textAlign: 'center' }}>
                        ✓ Already submitted to client
                    </div>
                )}
                {onReject && submission.client_status !== 'rejected' && (
                    <button className="btn btn-secondary btn-sm" style={{ color: 'var(--ruby2)' }} onClick={() => onReject(submission)}>Reject candidate</button>
                )}
            </div>
        </div>
    )
}
